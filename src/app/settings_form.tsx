import { useState } from "react";
import { useIntl } from "react-intl";
import { Button, Columns, Column, FormField, Rows, TextInput } from "@canva/app-ui-kit";
import { CONFIG, saveRuntimeSettings, clearRuntimeSettings } from "../config.mjs";

/** Gateway address and access key, kept in this browser's storage (see config.mjs). */
export function SettingsForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const intl = useIntl();
  const [gatewayUrl, setGatewayUrl] = useState(CONFIG.gatewayUrl);
  const [gatewayApiKey, setGatewayApiKey] = useState(CONFIG.gatewayApiKey);
  const [error, setError] = useState("");

  const save = () => {
    try {
      saveRuntimeSettings({ gatewayUrl, gatewayApiKey });
      setError("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Rows spacing="1.5u">
      <FormField
        label={intl.formatMessage({ defaultMessage: "Gateway address (https)", description: "Label of the gateway URL field" })}
        value={gatewayUrl}
        error={error || undefined}
        control={(props) => <TextInput {...props} type="url" onChange={setGatewayUrl} />}
      />
      <FormField
        label={intl.formatMessage({ defaultMessage: "Access key", description: "Label of the gateway access key field" })}
        labelMarker="optional"
        description={intl.formatMessage({
          defaultMessage: "Leave empty when the gateway accepts your Canva sign-in.",
          description: "Help text under the access key field",
        })}
        value={gatewayApiKey}
        control={(props) => <TextInput {...props} onChange={setGatewayApiKey} />}
      />
      <Columns spacing="1u">
        <Column>
          <Button variant="primary" onClick={save} stretch>
            {intl.formatMessage({ defaultMessage: "Save", description: "Saves the gateway settings" })}
          </Button>
        </Column>
        <Column>
          <Button
            variant="secondary"
            onClick={() => {
              clearRuntimeSettings();
              onSaved();
            }}
            stretch
          >
            {intl.formatMessage({ defaultMessage: "Use defaults", description: "Clears the saved gateway settings" })}
          </Button>
        </Column>
        <Column width="content">
          <Button variant="tertiary" onClick={onClose}>
            {intl.formatMessage({ defaultMessage: "Close", description: "Closes the settings form" })}
          </Button>
        </Column>
      </Columns>
    </Rows>
  );
}
