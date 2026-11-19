import { useIntl } from "react-intl";
import { Box, Rows, Text, Title } from "@canva/app-ui-kit";
import type { SignageScreen } from "../../services/signage-api.mjs";
import type { Target } from "../publish-targets.mjs";
import { screenTargetDimensions } from "./signage-publisher.mjs";

/** Where the slides go, in which orientation and at which resolution. */
export function TargetSummary({ target, screen }: { target: Target; screen?: SignageScreen | null }) {
  const intl = useIntl();
  const dims = target.dynamicSize && screen ? screenTargetDimensions(screen) : null;
  const orientationKey = dims ? dims.orientation : target.orientation;
  const orientation =
    orientationKey === "vertical" || orientationKey === "portrait"
      ? intl.formatMessage({ defaultMessage: "Vertical", description: "Portrait orientation of a publish target" })
      : intl.formatMessage({ defaultMessage: "Landscape", description: "Landscape orientation of a publish target" });

  return (
    <Box background="neutralSubtle" borderRadius="large" padding="1.5u">
      <Rows spacing="0.5u">
        <Title size="xsmall">{target.displayName}</Title>
        <Text size="small" tone="secondary">
          {target.dynamicSize && !dims
            ? intl.formatMessage({
                defaultMessage: "Orientation and size follow the chosen screen.",
                description: "Shown in target summary for signage before a screen is chosen",
              })
            : intl.formatMessage(
                { defaultMessage: "{orientation} · {width} × {height} px", description: "Orientation and resolution of a publish target" },
                { orientation, width: dims ? dims.width : target.width, height: dims ? dims.height : target.height },
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
