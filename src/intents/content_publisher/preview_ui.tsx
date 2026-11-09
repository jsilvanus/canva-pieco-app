import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Alert, Box, Grid, ImageCard, Placeholder, Rows, Text } from "@canva/app-ui-kit";
import type { OutputType, Preview, PreviewMedia, RenderPreviewUiRequest } from "@canva/intents/content";
import { decodePublishRef, targetById } from "../publish-targets.mjs";
import { TargetSummary } from "./target_summary";

type State = { previewMedia: PreviewMedia[]; outputType?: OutputType; publishRef?: string };

/** The slides as they will go out, and a warning when the design size does not match the target. */
export function PreviewUi({ invocationContext, registerOnPreviewChange }: RenderPreviewUiRequest) {
  const intl = useIntl();
  const [state, setState] = useState<State>({
    previewMedia: invocationContext.previewMedia ?? [],
    outputType: invocationContext.outputType,
    publishRef: invocationContext.publishRef,
  });
  useEffect(() => registerOnPreviewChange((next) => setState(next)), [registerOnPreviewChange]);

  const target = targetById(state.outputType?.id);
  const settings = decodePublishRef(state.publishRef);
  const previews = state.previewMedia.flatMap((media) => media.previews);
  const sized = previews.filter((p): p is Preview & { widthPx: number; heightPx: number } => "widthPx" in p);
  const mismatched = target ? sized.filter((p) => p.widthPx * target.height !== p.heightPx * target.width) : [];
  const columns = target?.orientation === "vertical" ? 3 : 2;

  return (
    <Box padding="2u">
      <Rows spacing="2u">
        {target && <TargetSummary target={target} />}
        {settings.name && <Text variant="bold">{settings.name}</Text>}
        {mismatched.length > 0 && target && (
          <Alert tone="warn">
            {intl.formatMessage(
              {
                defaultMessage: "The design is {width} × {height} px. Canva exports the design at its own size, so resize it to {targetWidth} × {targetHeight} px for this target.",
                description: "Warning when the design size does not match the publish target",
              },
              { width: mismatched[0].widthPx, height: mismatched[0].heightPx, targetWidth: target.width, targetHeight: target.height },
            )}
          </Alert>
        )}
        <Grid columns={columns} spacing="1u">
          {previews.map((preview, index) => (
            <PreviewTile key={preview.id} preview={preview} n={index + 1} />
          ))}
        </Grid>
      </Rows>
    </Box>
  );
}

function PreviewTile({ preview, n }: { preview: Preview; n: number }) {
  const intl = useIntl();
  const alt = intl.formatMessage({ defaultMessage: "Slide {n}", description: "Alt text of a slide in the publish preview" }, { n });
  if (preview.kind === "image" && preview.status === "ready") {
    return <ImageCard thumbnailUrl={preview.url} alt={alt} ariaLabel={alt} borderRadius="standard" onClick={() => {}} />;
  }
  if (preview.status === "error") {
    return (
      <Text size="small" tone="critical">
        {preview.message}
      </Text>
    );
  }
  return <Placeholder shape="rectangle" />;
}
