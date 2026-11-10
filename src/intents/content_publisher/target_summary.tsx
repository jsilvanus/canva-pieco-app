import { useIntl } from "react-intl";
import { Box, Rows, Text, Title } from "@canva/app-ui-kit";
import type { Target } from "../publish-targets.mjs";

/** Where the slides go, in which orientation and at which resolution. */
export function TargetSummary({ target }: { target: Target }) {
  const intl = useIntl();
  const orientation =
    target.orientation === "vertical"
      ? intl.formatMessage({ defaultMessage: "Vertical", description: "Portrait orientation of a publish target" })
      : intl.formatMessage({ defaultMessage: "Landscape", description: "Landscape orientation of a publish target" });

  return (
    <Box background="neutralSubtle" borderRadius="large" padding="1.5u">
      <Rows spacing="0.5u">
        <Title size="xsmall">{target.displayName}</Title>
        <Text size="small" tone="secondary">
          {intl.formatMessage(
            { defaultMessage: "{orientation} · {width} × {height} px", description: "Orientation and resolution of a publish target" },
            { orientation, width: target.width, height: target.height },
          )}
        </Text>
        {target.transparent && (
          <Text size="small" tone="secondary">
            {intl.formatMessage({ defaultMessage: "Transparent background is kept.", description: "Shown for overlay targets that keep transparency" })}
          </Text>
        )}
      </Rows>
    </Box>
  );
}
