import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Alert, Badge, Columns, Column, DateInput, FormField, Rows, Text, TextInput, Title } from "@canva/app-ui-kit";
import type { DateObj } from "@canva/app-ui-kit";
import type { RenderSettingsUiRequest, SettingsUiContext } from "@canva/intents/content";
import { decodePublishRef, encodePublishRef, targetById, validatePublishSettings } from "../publish-targets.mjs";
import type { PublishSettingsData } from "../publish-targets.mjs";
import { TargetSummary } from "./target_summary";

const toIso = (d?: DateObj) => (d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "");
const fromIso = (s?: string): DateObj | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : undefined;
};

/**
 * Publish settings: a name and the date (or date range) the slides are used. The target itself
 * (PiProgram ATEM or vertical projector, PiGraphics) is Canva's output type choice above this form.
 */
export function SettingsUi({ invocationContext, updatePublishSettings, registerOnContextChange }: RenderSettingsUiRequest) {
  const intl = useIntl();
  const [settings, setSettings] = useState<PublishSettingsData>(() => ({
    ...decodePublishRef(invocationContext.publishRef),
    targetId: invocationContext.outputType?.id,
  }));
  const [publishError, setPublishError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(
    () =>
      registerOnContextChange({
        onContextChange: (context: SettingsUiContext) => {
          if (context.reason === "publish_settings") setSettings((prev) => ({ ...prev, targetId: context.outputType.id }));
          else if (context.reason === "publish_error") setPublishError(context.error.appDefinedPayload ?? "");
          else setPublishError(null);
        },
      }),
    [registerOnContextChange],
  );

  const { validityState, errors } = validatePublishSettings(settings);
  useEffect(() => {
    updatePublishSettings({ publishRef: encodePublishRef(settings), validityState });
  }, [settings, validityState, updatePublishSettings]);

  const target = targetById(settings.targetId);
  const update = (patch: PublishSettingsData) => {
    setTouched(true);
    setSettings((prev) => ({ ...prev, ...patch }));
  };
  const showErrors = touched || publishError != null;

  return (
    <Rows spacing="2u">
      <Columns spacing="1u" alignY="center">
        <Column>
          <Title size="small">{intl.formatMessage({ defaultMessage: "Keskuskirkko", description: "Heading of the publish settings" })}</Title>
        </Column>
        <Column width="content">
          <Badge tone="info" text={intl.formatMessage({ defaultMessage: "Pi gateway", description: "Badge naming where the slides go" })} />
        </Column>
      </Columns>

      {target ? (
        <TargetSummary target={target} />
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
        </Alert>
      )}

      <FormField
        label={intl.formatMessage({ defaultMessage: "Name", description: "Label of the presentation name field" })}
        description={intl.formatMessage({ defaultMessage: "Shown in Pi Program, for example “Sunday service 15.11.”", description: "Help text under the name field" })}
        value={settings.name ?? ""}
        error={showErrors && errors.includes("name")}
        control={(props) => <TextInput {...props} onChange={(name) => update({ name })} />}
      />

      <Columns spacing="1u">
        <Column>
          <FormField
            label={intl.formatMessage({ defaultMessage: "Used on", description: "Label of the first (or only) date the slides are used" })}
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
    </Rows>
  );
}
