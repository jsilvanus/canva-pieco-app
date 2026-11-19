import { useIntl } from "react-intl";
import { Alert, Button, Checkbox, FormField, NumberInput, RadioGroup, Rows, Select, Text } from "@canva/app-ui-kit";
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

/** Signage-specific publish settings: screen picker, playlist mode, confirmation, and default image seconds. */
export function SignageFields({
  signage,
  screenList,
  errors,
  showErrors,
  onRetryScreens,
  onChange,
}: SignageFieldsProps) {
  const intl = useIntl();
  const mode = signage.mode === "replace" ? "replace" : "append";
  const selectedScreen: SignageScreen | null = findScreenById(screenList.screens, signage.screenId);

  const screenOptions = screenList.screens.map((screen) => ({
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

      <FormField
        label={intl.formatMessage({ defaultMessage: "Playlist mode", description: "Label of the signage append/replace mode selector" })}
        value={mode}
        control={(props) => (
          <RadioGroup<"append" | "replace">
            {...props}
            value={mode}
            options={[
              {
                value: "append",
                label: intl.formatMessage({ defaultMessage: "Add to end", description: "Signage mode that appends slides to the existing playlist" }),
              },
              {
                value: "replace",
                label: intl.formatMessage({ defaultMessage: "Replace playlist", description: "Signage mode that replaces the screen's current playlist" }),
              },
            ]}
            onChange={(nextMode) => onChange({ mode: nextMode })}
          />
        )}
      />

      {mode === "replace" && (
        <Checkbox
          label={intl.formatMessage({
            defaultMessage: "Replace what the screen is showing now",
            description: "Required confirmation checkbox when Replace playlist mode is selected",
          })}
          checked={signage.confirmReplace === true}
          onChange={(_, checked) => onChange({ confirmReplace: checked })}
        />
      )}

      {showErrors && mode === "replace" && errors.includes("confirmReplace") && (
        <Text size="small" tone="critical">
          {intl.formatMessage({
            defaultMessage: "Confirm replacing the current playlist before publishing.",
            description: "Validation message when Replace playlist is chosen without confirmation",
          })}
        </Text>
      )}

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
