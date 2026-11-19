// Content Publisher intent: "Publish to Keskuskirkko" in Canva's Share menu. Canva shows our targets
// as output types, our settings form and our preview, exports the design, and hands us the files;
// we send them to the Pi gateway or to Signage (Sissi).
import type {
  ContentPublisherIntent,
  GetPublishConfigurationResponse,
  OutputTypeConfiguration,
  PublishContentRequest,
  PublishContentResponse,
  RenderPreviewUiRequest,
  RenderSettingsUiRequest,
} from "@canva/intents/content";
import { CONFIG } from "../../config.mjs";
import { pushContent } from "../../services/gateway-api.mjs";
import { renderInCanva } from "../../app/mount";
import { getTargets, targetById, validatePublishSettings, decodePublishRef, buildPushPayload } from "../publish-targets.mjs";
import type { Target } from "../publish-targets.mjs";
import { isSignageTarget, publishSignageContent } from "./signage-publisher.mjs";
import { SettingsUi } from "./settings_ui";
import { PreviewUi } from "./preview_ui";

// One Canva output type per target; Canva lists them as the choices in its publish dialog.
function outputTypeFor(target: Target): OutputTypeConfiguration {
  const accepts = target.accepts
    ? {
        ...(target.accepts.image ? { image: { format: "png" as const } } : {}),
        ...(target.accepts.video ? { video: { format: "mp4" as const } } : {}),
      }
    : {
        // Any design size is accepted: a size or ratio that does not match the target only gets a warning
        // in the preview, so it never blocks publishing.
        image: target.transparent ? { format: "png" as const, allowTransparentBackground: true } : { format: "png" as const },
      };

  return {
    id: target.id,
    displayName: target.displayName,
    contentNoun: "content",
    mediaSlots: [
      {
        id: "slides",
        displayName: "Slides",
        fileCount: { min: 1 },
        accepts,
      },
    ],
  };
}

async function getPublishConfiguration(): Promise<GetPublishConfigurationResponse> {
  const targets = getTargets({ signageUrl: CONFIG.signageUrl }).filter((t) => t.kind !== "signage" || t.enabled);
  return { status: "completed", outputTypes: targets.map(outputTypeFor) };
}

function renderSettingsUi(request: RenderSettingsUiRequest) {
  renderInCanva(<SettingsUi {...request} />);
}

function renderPreviewUi(request: RenderPreviewUiRequest) {
  renderInCanva(<PreviewUi {...request} />);
}

async function publishContent({ outputMedia, outputType, publishRef }: PublishContentRequest): Promise<PublishContentResponse> {
  const target = targetById(outputType.id, { signageUrl: CONFIG.signageUrl });
  if (isSignageTarget(target)) {
    return publishSignageContent({ outputMedia, outputType, publishRef });
  }

  const settings = { ...decodePublishRef(publishRef), targetId: outputType.id };
  const check = validatePublishSettings(settings);
  if (check.validityState !== "valid") {
    return { status: "app_error", message: `Publish settings are incomplete: ${check.errors.join(", ")}.`, appDefinedPayload: check.errors.join(",") };
  }
  if (target?.enabled !== true) {
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
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "app_error", message: `Could not send to the church gateway: ${detail}`, appDefinedPayload: detail.slice(0, 300) };
  }
}

const contentPublisher: ContentPublisherIntent = { getPublishConfiguration, renderSettingsUi, renderPreviewUi, publishContent };
export default contentPublisher;
