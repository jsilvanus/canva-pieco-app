import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Alert, Box, FormField, Grid, ImageCard, NumberInput, Placeholder, Rows, Text } from "@canva/app-ui-kit";
import type { OutputType, Preview, PreviewMedia, RenderPreviewUiRequest } from "@canva/intents/content";
import { CONFIG } from "../../config.mjs";
import { listScreens } from "../../services/signage-api.mjs";
import type { SignageScreen } from "../../services/signage-api.mjs";
import { decodePublishRef, encodeSignageSettings, parseSignageSettings, targetById } from "../publish-targets.mjs";
import {
  computeSignageWarnings,
  findScreenById,
  formatDurationSeconds,
  isSignageTarget,
  isValidSecondsValue,
  isVideoTooLong,
  screenTargetDimensions,
  updatePageSeconds,
  writeDraftSecondsByPage,
} from "./signage-publisher.mjs";
import { TargetSummary } from "./target_summary";

type State = { previewMedia: PreviewMedia[]; outputType?: OutputType; publishRef?: string };

/** The slides as they will go out, warnings when size/duration mismatches, and per-page seconds for signage. */
export function PreviewUi({ invocationContext, registerOnPreviewChange }: RenderPreviewUiRequest) {
  const intl = useIntl();
  const [state, setState] = useState<State>({
    previewMedia: invocationContext.previewMedia ?? [],
    outputType: invocationContext.outputType,
    publishRef: invocationContext.publishRef,
  });
  const [screens, setScreens] = useState<SignageScreen[]>([]);
  const [localSecondsByPage, setLocalSecondsByPage] = useState<Record<string, number> | null>(null);

  useEffect(() => registerOnPreviewChange((next) => setState(next)), [registerOnPreviewChange]);

  const target = targetById(state.outputType?.id, { signageUrl: CONFIG.signageUrl });
  const isSignage = isSignageTarget(target);

  useEffect(() => {
    if (!isSignage) return;
    let cancelled = false;
    void listScreens()
      .then((list) => {
        if (!cancelled) setScreens(list);
      })
      .catch(() => {
        if (!cancelled) setScreens([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignage]);

  const settings = decodePublishRef(state.publishRef);
  const signage = parseSignageSettings(settings.signage ? encodeSignageSettings(settings.signage) : undefined);
  const secondsByPage = localSecondsByPage ?? signage.secondsByPage;
  const selectedScreen = isSignage ? findScreenById(screens, signage.screenId) : null;

  const previews = state.previewMedia.flatMap((media) => media.previews);
  const sized = previews.filter((p): p is Preview & { widthPx: number; heightPx: number } => "widthPx" in p);

  const signageWarnings = isSignage ? computeSignageWarnings(previews, selectedScreen) : null;
  const nonSignageMismatch =
    !isSignage && target
      ? sized.filter((p) => Math.abs(p.widthPx * target.height - p.heightPx * target.width) > 0.01 * p.heightPx * target.width)
      : [];

  const mismatch = signageWarnings?.sizeMismatch ?? (nonSignageMismatch[0] && target
    ? { widthPx: nonSignageMismatch[0].widthPx, heightPx: nonSignageMismatch[0].heightPx, targetWidth: target.width, targetHeight: target.height }
    : null);

  const columns =
    isSignage && selectedScreen
      ? screenTargetDimensions(selectedScreen).orientation === "portrait"
        ? 3
        : 2
      : target?.orientation === "vertical"
        ? 3
        : 2;

  const handlePageSecondsChange = (pageNumber: number, rawValue: number | undefined) => {
    const val = rawValue === undefined || Number.isNaN(rawValue) ? undefined : Math.trunc(rawValue);
    const next = updatePageSeconds(secondsByPage, pageNumber, val);
    setLocalSecondsByPage(next);
    writeDraftSecondsByPage(next);
  };

  return (
    <Box padding="2u">
      <Rows spacing="2u">
        {target && <TargetSummary target={target} screen={selectedScreen} />}
        {settings.name && <Text variant="bold">{settings.name}</Text>}
        {mismatch && (
          <Alert tone="warn">
            {intl.formatMessage(
              {
                defaultMessage: "The design is {width} × {height} px. Canva exports the design at its own size, so for this target a size like {targetWidth} × {targetHeight} px is best. You can still publish.",
                description: "Warning when the design size does not match the publish target",
              },
              { width: mismatch.widthPx, height: mismatch.heightPx, targetWidth: mismatch.targetWidth, targetHeight: mismatch.targetHeight },
            )}
          </Alert>
        )}
        {signageWarnings && signageWarnings.videoTooLongPages.length > 0 && selectedScreen?.maxVideoSeconds != null && (
          <Alert tone="warn">
            {intl.formatMessage(
              {
                defaultMessage: "A video exceeds this screen's {maxSeconds} s limit. Sissi may reject it when publishing.",
                description: "Warning in preview when a video duration exceeds maxVideoSeconds",
              },
              { maxSeconds: selectedScreen.maxVideoSeconds },
            )}
          </Alert>
        )}
        <Grid columns={columns} spacing="1u">
          {previews.map((preview, index) => {
            const pageNumber = index + 1;
            const pageVal = secondsByPage[String(pageNumber)];
            const displaySeconds = pageVal ?? signage.secondsAll ?? selectedScreen?.defaultImageSeconds;
            const durationSec = preview.kind === "video" && "durationMs" in preview ? formatDurationSeconds(preview.durationMs) : null;
            const tooLong =
              isSignage &&
              preview.kind === "video" &&
              "durationMs" in preview &&
              isVideoTooLong(preview.durationMs, selectedScreen?.maxVideoSeconds);

            return (
              <Rows key={preview.id} spacing="0.5u">
                <PreviewTile preview={preview} n={pageNumber} />
                {isSignage && preview.kind === "video" && (
                  <Text size="small" tone={tooLong ? "critical" : "secondary"}>
                    {durationSec != null
                      ? intl.formatMessage(
                          { defaultMessage: "Video: {seconds} s", description: "Read-only video duration under a signage preview tile" },
                          { seconds: durationSec },
                        )
                      : intl.formatMessage({
                          defaultMessage: "length is read when it is added",
                          description: "Shown when video durationMs is not yet available in signage preview",
                        })}
                  </Text>
                )}
                {isSignage && preview.kind !== "video" && (
                  <FormField
                    label={intl.formatMessage(
                      { defaultMessage: "Page {n} (s)", description: "Label of per-page seconds field in signage preview" },
                      { n: pageNumber },
                    )}
                    value={displaySeconds}
                    error={pageVal !== undefined && !isValidSecondsValue(pageVal)}
                    control={(props) => (
                      <NumberInput
                        {...props}
                        min={1}
                        max={3600}
                        step={1}
                        onChange={(val) => handlePageSecondsChange(pageNumber, val)}
                      />
                    )}
                  />
                )}
              </Rows>
            );
          })}
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
  if (preview.kind === "video" && (preview.status === "ready" || preview.status === "thumbnail" || preview.status === "upgrading")) {
    return <ImageCard thumbnailUrl={preview.thumbnailUrl} alt={alt} ariaLabel={alt} borderRadius="standard" onClick={() => {}} />;
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
