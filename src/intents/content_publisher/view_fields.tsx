import { useIntl } from "react-intl";
import { Alert, Button, Checkbox, FormField, NumberInput, Rows, Select, Text, TextInput } from "@canva/app-ui-kit";
import type { SignageScreen } from "../../services/signage-api.mjs";
import type { SignageSettings } from "../publish-targets.mjs";
import type { ScreenListState } from "./signage-publisher.mjs";
import { findScreenById, formatScreenOptionLabel, isValidSecondsValue } from "./signage-publisher.mjs";

type Props = {
  value: Partial<SignageSettings>;
  views: ScreenListState;
  errors: string[];
  showErrors: boolean;
  onRetry: () => void;
  onChange: (patch: Partial<SignageSettings>) => void;
};

/** Sissi web-view publishing: view picker, embed metadata, and independent live activation. */
export function ViewFields({ value, views, errors, showErrors, onRetry, onChange }: Props) {
  const intl = useIntl();
  const selected: SignageScreen | null = findScreenById(views.screens, value.screenId);
  const options = views.screens.filter((view) => !Array.isArray(view.rights) || view.rights.includes("write")).map((view) => ({
    value: view.id,
    label: formatScreenOptionLabel(view),
  }));
  const canOperate = !Array.isArray(selected?.rights) || selected.rights.includes("operate");
  const secondsInvalid = value.secondsAll !== undefined && !isValidSecondsValue(value.secondsAll);

  return (
    <Rows spacing="2u">
      {views.status === "loading" && <Text size="small" tone="secondary">{intl.formatMessage({ defaultMessage: "Loading web views…", description: "Loading Sissi web views" })}</Text>}
      {views.status === "error" && (
        <Alert tone="critical">
          <Rows spacing="1u">
            <Text size="small">{views.error || intl.formatMessage({ defaultMessage: "Could not load web views.", description: "Error loading Sissi web views" })}</Text>
            <Button variant="secondary" size="small" onClick={onRetry}>{intl.formatMessage({ defaultMessage: "Retry", description: "Retry loading web views" })}</Button>
          </Rows>
        </Alert>
      )}
      <FormField
        label={intl.formatMessage({ defaultMessage: "View", description: "Sissi web view selector" })}
        value={value.screenId ?? ""}
        error={showErrors && errors.includes("screenId")}
        control={(props) => <Select {...props} stretch disabled={views.status !== "ready" || options.length === 0} placeholder={intl.formatMessage({ defaultMessage: "Choose a web view", description: "Sissi web view selector placeholder" })} options={options} onChange={(screenId) => onChange({ screenId })} />}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Heading", description: "Optional heading shown by the Sissi web embed" })}
        labelMarker="optional"
        value={value.title ?? ""}
        control={(props) => <TextInput {...props} onChange={(title) => onChange({ title })} />}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Description", description: "Optional description shown by the Sissi web embed" })}
        labelMarker="optional"
        value={value.text ?? ""}
        control={(props) => <TextInput {...props} onChange={(text) => onChange({ text })} />}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Link URL", description: "Optional HTTPS link for the Sissi web embed" })}
        labelMarker="optional"
        value={value.link ?? ""}
        error={showErrors && errors.includes("link")}
        control={(props) => <TextInput {...props} onChange={(link) => onChange({ link })} />}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Seconds per image", description: "Default duration for images published to a Sissi web view" })}
        labelMarker="optional"
        value={value.secondsAll}
        error={showErrors && (secondsInvalid || errors.includes("seconds"))}
        control={(props) => <NumberInput {...props} min={1} max={3600} step={1} onChange={(secondsAll) => onChange({ secondsAll: secondsAll === undefined || Number.isNaN(secondsAll) ? undefined : Math.trunc(secondsAll) })} />}
      />
      <Checkbox
        label={intl.formatMessage({ defaultMessage: "Go live now", description: "Enable the newly published entries on the selected web view immediately" })}
        description={canOperate
          ? intl.formatMessage({ defaultMessage: "Off: add the entries disabled. On: make them visible on the website immediately.", description: "Explains web view activation" })
          : intl.formatMessage({ defaultMessage: "You can publish to this view, but need the operate right to make entries live.", description: "Explains why web view activation is unavailable" })}
        checked={value.enableNow === true}
        disabled={!canOperate}
        onChange={(_, checked) => onChange({ enableNow: checked })}
      />
    </Rows>
  );
}
