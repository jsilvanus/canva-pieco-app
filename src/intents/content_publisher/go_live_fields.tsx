import { useIntl } from "react-intl";
import { Checkbox, FormField, RadioGroup, Rows, Select } from "@canva/app-ui-kit";
import type { GoLiveSettings } from "../publish-targets.mjs";

export const DEFAULT_GO_LIVE: GoLiveSettings = { on: false, feed: "pipgm1", piOutput: "pi1", projector: "left", ftb: false };

/** "Publish and go live": the same play options as the sidebar panel, applied after the slides are in church storage. */
export function GoLiveFields({ value, onChange }: { value?: GoLiveSettings; onChange: (next: GoLiveSettings) => void }) {
  const intl = useIntl();
  const g = { ...DEFAULT_GO_LIVE, ...value };
  const set = (patch: Partial<GoLiveSettings>) => onChange({ ...g, ...patch });
  return (
    <Rows spacing="1u">
      <Checkbox
        checked={g.on}
        onChange={(_, checked) => set({ on: checked })}
        label={intl.formatMessage({ defaultMessage: "Publish and go live", description: "Also puts the slides on the displays after publishing" })}
        description={intl.formatMessage({ defaultMessage: "After publishing, the control page opens and puts the slides on the chosen display.", description: "Explains publish and go live" })}
      />
      {g.on && (
        <>
          <FormField
            label={intl.formatMessage({ defaultMessage: "Feed", description: "Label of the Pi Program feed choice" })}
            value={g.feed}
            control={(props) => (
              <RadioGroup
                {...props}
                onChange={(feed) => set({ feed })}
                options={[
                  { value: "pipgm1", label: "Pi Program 1" },
                  { value: "pipgm2", label: "Pi Program 2" },
                  { value: "pipgm3", label: "Pi Program 3" },
                ]}
              />
            )}
          />
          <FormField
            label={intl.formatMessage({ defaultMessage: "Pi output", description: "Label of the Pi output choice" })}
            value={g.piOutput}
            control={(props) => (
              <Select
                {...props}
                stretch
                onChange={(piOutput) => set({ piOutput })}
                options={[
                  { value: "pi1", label: "Pi 1 (Atlona input 3)" },
                  { value: "pi2", label: "Pi 2 (Atlona input 4)" },
                ]}
              />
            )}
          />
          <FormField
            label={intl.formatMessage({ defaultMessage: "Projector", description: "Label of the projector choice" })}
            value={g.projector}
            control={(props) => (
              <RadioGroup
                {...props}
                onChange={(projector) => set({ projector })}
                options={[
                  { value: "left", label: intl.formatMessage({ defaultMessage: "Left projector", description: "Projector 1" }) },
                  { value: "right", label: intl.formatMessage({ defaultMessage: "Right projector", description: "Projector 2" }) },
                  { value: "none", label: intl.formatMessage({ defaultMessage: "Not to a projector", description: "Leave the projectors as they are" }) },
                ]}
              />
            )}
          />
          <Checkbox
            checked={g.ftb}
            onChange={(_, checked) => set({ ftb: checked })}
            label={intl.formatMessage({ defaultMessage: "Start with fade to black", description: "The feed stays black until it is faded in" })}
          />
        </>
      )}
    </Rows>
  );
}
