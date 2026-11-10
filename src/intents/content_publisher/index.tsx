// Content Publisher intent: "Publish to Keskuskirkko" in Canva's Share menu. Canva shows our targets
// as output types, our settings form (name and date) and our preview, exports the design, and hands
// us the files; we send them to the Pi gateway.
import type {
  ContentPublisherIntent,
  GetPublishConfigurationResponse,
  OutputTypeConfiguration,
  PublishContentRequest,
  PublishContentResponse,
  RenderPreviewUiRequest,
  RenderSettingsUiRequest,
} from "@canva/intents/content";
import { pushContent } from "../../services/gateway-api.mjs";
import { renderInCanva } from "../../app/mount";
import { TARGETS, targetById, validatePublishSettings, decodePublishRef, buildPushPayload } from "../publish-targets.mjs";
import type { Target } from "../publish-targets.mjs";
import { SettingsUi } from "./settings_ui";
import { PreviewUi } from "./preview_ui";

// One Canva output type per target; Canva lists them as the choices in its publish dialog.
function outputTypeFor(target: Target): OutputTypeConfiguration {
  return {
    id: target.id,
    displayName: target.displayName,
    contentNoun: "content",
    mediaSlots: [
      {
        id: "slides",
        displayName: "Slides",
        fileCount: { min: 1 },
        accepts: {
          // Any design size is accepted: a size or ratio that does not match the target only gets a warning
          // in the preview, so it never blocks publishing.
          image: target.transparent ? { format: "png", allowTransparentBackground: true } : { format: "png" },
        },
      },
    ],
  };
}

async function getPublishConfiguration(): Promise<GetPublishConfigurationResponse> {
  return { status: "completed", outputTypes: TARGETS.map(outputTypeFor) };
}

function renderSettingsUi(request: RenderSettingsUiRequest) {
  renderInCanva(<SettingsUi {...request} />);
}

function renderPreviewUi(request: RenderPreviewUiRequest) {
  renderInCanva(<PreviewUi {...request} />);
}

async function publishContent({ outputMedia, outputType, publishRef }: PublishContentRequest): Promise<PublishContentResponse> {
  const settings = { ...decodePublishRef(publishRef), targetId: outputType.id };
  const check = validatePublishSettings(settings);
  if (check.validityState !== "valid") {
    return { status: "app_error", message: `Publish settings are incomplete: ${check.errors.join(", ")}.`, appDefinedPayload: check.errors.join(",") };
  }
  if (targetById(outputType.id)?.enabled !== true) {
    return { status: "app_error", message: "This target is not available yet." };
  }

  const pages = outputMedia
    .flatMap((media) => media.files)
    .map((file, index) => ({ url: file.url, pageNumber: index + 1, name: `Page ${index + 1}` }));
  if (pages.length === 0) {
    return { status: "app_error", message: "No slides were exported from Canva." };
  }

  try {
    await pushContent(buildPushPayload(settings, pages));
    return { status: "completed" };
  } catch (error) {
    return { status: "app_error", message: `Could not send to the church gateway: ${error instanceof Error ? error.message : String(error)}` };
  }
}

const contentPublisher: ContentPublisherIntent = { getPublishConfiguration, renderSettingsUi, renderPreviewUi, publishContent };
export default contentPublisher;
