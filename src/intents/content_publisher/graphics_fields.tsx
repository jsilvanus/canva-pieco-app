import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Alert, FormField, Rows, Select, Text } from "@canva/app-ui-kit";
import { listCanvaAnimations } from "../../services/gateway-api.mjs";

type Props = { value: string; onChange: (movement: string) => void };

/** DVE choices are discovered through Pi Gateway; the plugin never calls PiGraphics directly. */
export function GraphicsFields({ value, onChange }: Props) {
  const intl = useIntl();
  const [animations, setAnimations] = useState<Array<string | { id: string; label?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listCanvaAnimations().then((items) => {
      if (!cancelled) setAnimations(items);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : String(err));
    });
    return () => { cancelled = true; };
  }, []);
  const options = animations.map((item) => {
    const id = typeof item === "string" ? item : item.id;
    const label = typeof item === "string" ? item : item.label || item.id;
    return { value: id, label: id === "none" ? intl.formatMessage({ defaultMessage: "None", description: "No DVE transition" }) : label };
  });
  return (
    <Rows spacing="1u">
      {error && <Alert tone="warn">{intl.formatMessage({ defaultMessage: "Could not load DVE choices from Pi Gateway: {error}", description: "DVE animation discovery error" }, { error })}</Alert>}
      <FormField
        label={intl.formatMessage({ defaultMessage: "DVE animation", description: "ATEM built-in DVE transition applied to this graphic" })}
        value={value}
        control={(props) => <Select {...props} stretch options={options} disabled={options.length === 0} onChange={onChange} />}
      />
      <Text size="small" tone="secondary">{intl.formatMessage({ defaultMessage: "The selected transition is attached to each graphic sent to PiGraphics.", description: "Explains ATEM DVE selection" })}</Text>
    </Rows>
  );
}
