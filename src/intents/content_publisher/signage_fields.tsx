import { useIntl } from "react-intl";
import { Alert, Button, Checkbox, FormField, NumberInput, Rows, Select, Text } from "@canva/app-ui-kit";
import type { SignageScreen } from "../../services/signage-api.mjs";
import type { SignageSettings } from "../publish-targets.mjs";
import { findScreenById, formatScreenOptionLabel, isValidSecondsValue } from "./signage-publisher.mjs";
import type { ScreenListState } from "./signage-publisher.mjs";

type SignageFieldsProps = {
  signage: Partial<SignageSettings>;
  screenList: ScreenListState;
  errors: string[];
  showErrors: boolean;
  onRetryScreens: () => void;
  onChange: (patch: Partial<SignageSettings>) => void;
};

/** Signage-specific publish settings: screen picker, the Enable now switch, and default image seconds. */
export function SignageFields({
  signage,
  screenList,
  errors,
  showErrors,
  onRetryScreens,
  onChange,
}: SignageFieldsProps) {
  const intl = useIntl();
  const selectedScreen: SignageScreen | null = findScreenById(screenList.screens, signage.screenId);

  const screenOptions = screenList.screens.filter((screen) => !Array.isArray(screen.rights) || screen.rights.includes("write")).map((screen) => ({
    value: screen.id,
    label: formatScreenOptionLabel(screen),
  }));

  const maxVideoDescription =
    selectedScreen != null
      ? selectedScreen.maxVideoSeconds != null
        ? intl.formatMessage(
            {
              defaultMessage: "Max video length for this screen: {seconds} s. Default image time: {defaultSeconds} s.",
              description: "Shows the selected signage screen limits under the screen picker",
            },
            { seconds: selectedScreen.maxVideoSeconds, defaultSeconds: selectedScreen.defaultImageSeconds },
          )
        : intl.formatMessage(
            {
              defaultMessage: "No video length limit for this screen. Default image time: {defaultSeconds} s.",
              description: "Shows that the selected signage screen has no video length limit",
            },
            { defaultSeconds: selectedScreen.defaultImageSeconds },
          )
      : undefined;

  const secondsAllInvalid = signage.secondsAll !== undefined && !isValidSecondsValue(signage.secondsAll);
  const canOperate = !Array.isArray(selectedScreen?.rights) || selectedScreen.rights.includes("operate");

  return (
    <Rows spacing="2u">
      {screenList.status === "loading" && (
        <Text size="small" tone="secondary">
          {intl.formatMessage({ defaultMessage: "Loading signage screens…", description: "Shown while fetching screens from Sissi" })}
        </Text>
      )}

      {screenList.status === "error" && (
        <Alert tone="critical">
          <Rows spacing="1u">
            <Text size="small">
              {screenList.error ||
                intl.formatMessage({ defaultMessage: "Could not load signage screens.", description: "Fallback error when fetching signage screens fails" })}
            </Text>
            <Button variant="secondary" size="small" onClick={onRetryScreens}>
              {intl.formatMessage({ defaultMessage: "Retry", description: "Button to reload the signage screen list" })}
            </Button>
          </Rows>
        </Alert>
      )}

      <FormField
        label={intl.formatMessage({ defaultMessage: "Screen", description: "Label of the signage screen picker" })}
        description={maxVideoDescription}
        value={signage.screenId ?? ""}
        error={showErrors && errors.includes("screenId")}
        control={(props) => (
          <Select
            {...props}
            stretch
            disabled={screenList.status === "loading" || screenOptions.length === 0}
            placeholder={intl.formatMessage({ defaultMessage: "Choose a screen", description: "Placeholder for the signage screen picker" })}
            options={screenOptions}
            onChange={(screenId) => onChange({ screenId })}
          />
        )}
      />

      <Checkbox
        label={intl.formatMessage({ defaultMessage: "Enable now", description: "Puts the published slides live on the signage screen at once" })}
        description={canOperate
          ? intl.formatMessage({ defaultMessage: "Off: add disabled. On: put the slides on screen right away.", description: "Explains the signage live switch" })
          : intl.formatMessage({ defaultMessage: "You can publish to this screen, but need the operate right to put content live.", description: "Explains why signage live activation is unavailable" })}
        checked={signage.enableNow === true}
        disabled={!canOperate}
        onChange={(_, checked) => onChange({ enableNow: checked })}
      />

      <FormField
        label={intl.formatMessage({ defaultMessage: "Seconds per image (set all)", description: "Label of the global seconds-per-image field for signage" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Applies to every image page without its own time (1–3600 s). Leave empty to use the screen default.",
          description: "Help text under the global seconds-per-image field",
        })}
        value={signage.secondsAll}
        error={showErrors && (secondsAllInvalid || errors.includes("seconds"))}
        control={(props) => (
          <NumberInput
            {...props}
            min={1}
            max={3600}
            step={1}
            onChange={(val) => onChange({ secondsAll: val === undefined || Number.isNaN(val) ? undefined : Math.trunc(val) })}
          />
        )}
      />
    </Rows>
  );
}
