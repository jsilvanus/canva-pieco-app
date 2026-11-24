import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Alert, Badge, Checkbox, Columns, Column, DateInput, FormField, Rows, Text, TextInput, Title } from "@canva/app-ui-kit";
import type { DateObj } from "@canva/app-ui-kit";
import type { RenderSettingsUiRequest, SettingsUiContext } from "@canva/intents/content";
import { BUILD_VERSION } from "../../build-version.mjs";
import { CONFIG } from "../../config.mjs";
import { listScreens, listViews } from "../../services/signage-api.mjs";
import { decodePublishRef, encodePublishRef, targetById, validatePublishSettings } from "../publish-targets.mjs";
import type { PublishSettingsData, SignageSettings } from "../publish-targets.mjs";
import { SignageFields } from "./signage_fields";
import { ViewFields } from "./view_fields";
import { GraphicsFields } from "./graphics_fields";
import { GoLiveFields } from "./go_live_fields";
import {
  findScreenById,
  isScreenNotFoundPayload,
  isSignageTarget,
  mergeSignageSettings,
  screenListFailed,
  screenListInitialState,
  screenListLoaded,
  subscribeDraftSecondsByPage,
} from "./signage-publisher.mjs";
import type { ScreenListState } from "./signage-publisher.mjs";
import { TargetSummary } from "./target_summary";

const toIso = (d?: DateObj) => (d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "");
const fromIso = (s?: string): DateObj | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : undefined;
};

/**
 * Publish settings: a name and either signage options (screen, enable now, seconds) or the date /
 * permanent-asset fields for the Pi targets.
 */
export function SettingsUi({ invocationContext, updatePublishSettings, registerOnContextChange }: RenderSettingsUiRequest) {
  const intl = useIntl();
  const [settings, setSettings] = useState<PublishSettingsData>(() => ({
    ...decodePublishRef(invocationContext.publishRef),
    targetId: invocationContext.outputType?.id,
  }));
  const [publishError, setPublishError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [screenList, setScreenList] = useState<ScreenListState>(screenListInitialState);

  const signageUrl = CONFIG.signageUrl;
  const target = targetById(settings.targetId, { signageUrl });
  const isSignage = isSignageTarget(target);
  const isView = target?.kind === "signage-view";
  const isGraphics = target?.id === "pigraphics-stream";

  const loadScreens = useCallback(async () => {
    setScreenList(screenListInitialState());
    try {
      const screens = isView ? await listViews() : await listScreens();
      setScreenList(screenListLoaded(screens));
    } catch (err) {
      setScreenList(screenListFailed(err));
    }
  }, [isView]);

  useEffect(() => {
    if (isSignage) void loadScreens();
  }, [isSignage, loadScreens]);

  useEffect(
    () =>
      registerOnContextChange({
        onContextChange: (context: SettingsUiContext) => {
          if (context.reason === "publish_settings") {
            setSettings((prev) => ({ ...prev, targetId: context.outputType.id }));
          } else if (context.reason === "publish_error") {
            const payload = context.error.appDefinedPayload ?? "";
            setPublishError(payload);
            if (isSignage && isScreenNotFoundPayload(payload)) void loadScreens();
          } else {
            setPublishError(null);
          }
        },
      }),
    [registerOnContextChange, isSignage, loadScreens],
  );

  useEffect(() => {
    if (!isSignage) return;
    return subscribeDraftSecondsByPage((secondsByPage) => {
      setSettings((prev) => mergeSignageSettings(prev, { secondsByPage }));
    });
  }, [isSignage]);

  const { validityState, errors } = validatePublishSettings(settings, { signageUrl });
  useEffect(() => {
    updatePublishSettings({ publishRef: encodePublishRef(settings), validityState });
  }, [settings, validityState, updatePublishSettings]);

  const update = (patch: PublishSettingsData) => {
    setTouched(true);
    setSettings((prev) => ({ ...prev, ...patch }));
  };
  const updateSignage = (patch: Partial<SignageSettings>) => {
    setTouched(true);
    setSettings((prev) => mergeSignageSettings(prev, patch));
  };
  const showErrors = touched || publishError != null;
  const selectedScreen = isSignage ? findScreenById(screenList.screens, settings.signage?.screenId) : null;

  return (
    <Rows spacing="2u">
      <Text size="small" tone="tertiary">
        {intl.formatMessage({ defaultMessage: "Build v{version}", description: "Small developer build version label" }, { version: BUILD_VERSION })}
      </Text>

      <FormField
        label={intl.formatMessage({ defaultMessage: "Name", description: "Label of the presentation name field" })}
        description={
          isSignage
            ? intl.formatMessage({
                defaultMessage: "Title shown in Sissi (1–200 characters), for example “Sunday service 15.11.”",
                description: "Help text under the name field when signage is selected",
              })
            : intl.formatMessage({
                defaultMessage: "Shown in Pi Program, for example “Sunday service 15.11.”",
                description: "Help text under the name field",
              })
        }
        value={settings.name ?? ""}
        error={showErrors && errors.includes("name")}
        control={(props) => <TextInput {...props} onChange={(name) => update({ name })} />}
      />

      <Columns spacing="1u" alignY="center">
        <Column>
          <Title size="small">{intl.formatMessage({ defaultMessage: "Keskuskirkko", description: "Heading of the publish settings" })}</Title>
        </Column>
        <Column width="content">
          <Badge
            tone="info"
            text={
              isSignage
                ? (isView
                  ? intl.formatMessage({ defaultMessage: "Websites (Sissi)", description: "Badge naming the Sissi web-view target" })
                  : intl.formatMessage({ defaultMessage: "Info screens (Sissi)", description: "Badge naming the Sissi physical-screen target" }))
                : intl.formatMessage({ defaultMessage: "Pi gateway", description: "Badge naming where the slides go" })
            }
          />
        </Column>
      </Columns>

      {target ? (
        <TargetSummary target={target} screen={selectedScreen} />
      ) : (
        <Text tone="secondary">
          {intl.formatMessage({ defaultMessage: "Choose where the slides go.", description: "Shown before a publish target is chosen" })}
        </Text>
      )}

      {target && !target.enabled && (
        <Alert tone="warn">
          {intl.formatMessage({ defaultMessage: "This target is not available yet. Choose another one.", description: "Shown when a disabled target is chosen" })}
        </Alert>
      )}

      {publishError != null && (
        <Alert tone="critical">
          {intl.formatMessage({ defaultMessage: "Publishing failed. Check the settings and try again.", description: "Shown after a failed publish" })}
          {publishError ? intl.formatMessage({ defaultMessage: " Details: {detail}", description: "Detail of a failed publish" }, { detail: publishError }) : null}
        </Alert>
      )}

      {isView ? (
        <ViewFields
          value={settings.signage ?? { screenId: "" }}
          views={screenList}
          errors={errors}
          showErrors={showErrors}
          onRetry={() => void loadScreens()}
          onChange={updateSignage}
        />
      ) : isSignage ? (
        <SignageFields
          signage={settings.signage ?? {}}
          screenList={screenList}
          errors={errors}
          showErrors={showErrors}
          onRetryScreens={() => void loadScreens()}
          onChange={updateSignage}
        />
      ) : (
        <Columns spacing="1u">
          <Column>
            <FormField
              label={intl.formatMessage({ defaultMessage: "Used on", description: "Label of the first (or only) date the slides are used" })}
              labelMarker="optional"
              value={fromIso(settings.usage?.from)}
              error={showErrors && errors.includes("date")}
              control={(props) => <DateInput {...props} onChange={(d?: DateObj) => update({ usage: { ...settings.usage, from: toIso(d) } })} />}
            />
          </Column>
          <Column>
            <FormField
              label={intl.formatMessage({ defaultMessage: "Until", description: "Label of the optional last date of a date range" })}
              labelMarker="optional"
              value={fromIso(settings.usage?.to)}
              error={showErrors && errors.includes("date") && Boolean(settings.usage?.to)}
              control={(props) => (
                <DateInput {...props} min={fromIso(settings.usage?.from)} onChange={(d?: DateObj) => update({ usage: { ...settings.usage, to: toIso(d) || undefined } })} />
              )}
            />
          </Column>
        </Columns>
      )}

      {isGraphics && <GraphicsFields value={settings.graphics?.movement ?? "none"} onChange={(movement) => update({ graphics: { movement } })} />}

      {!isSignage && <GoLiveFields value={settings.goLive} onChange={(goLive) => update({ goLive })} />}

      {!isSignage && !settings.usage?.from && !settings.usage?.to && (
        <Checkbox
          label={intl.formatMessage({ defaultMessage: "No date: this is a permanent asset that stays in church storage until it is deleted", description: "Confirmation shown when no use date is given" })}
          checked={settings.permanent === true}
          onChange={(_, checked) => update({ permanent: checked })}
        />
      )}
    </Rows>
  );
}
