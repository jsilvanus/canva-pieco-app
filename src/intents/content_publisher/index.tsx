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
import { createGoLiveList, pushContent, waitForTask, pushCanvaGraphic } from "../../services/gateway-api.mjs";
import { reportValopankkiExport } from "../../services/valopankki-api.mjs";
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

  const isSissi = target.kind === "signage" || target.kind === "signage-view";
  return {
    id: target.id,
    displayName: target.displayName,
    contentNoun: "content",
    mediaSlots: [
      {
        id: "slides",
        displayName: "Slides",
        fileCount: isSissi ? { exact: 1 } : { min: 1 },
        accepts,
      },
    ],
  };
}

async function getPublishConfiguration(): Promise<GetPublishConfigurationResponse> {
  const targets = getTargets({ signageUrl: CONFIG.signageUrl }).filter((t) => (t.kind !== "signage" && t.kind !== "signage-view") || t.enabled);
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

  if (target?.id === "pigraphics-stream") {
    const settings = { ...decodePublishRef(publishRef), targetId: outputType.id };
    const check = validatePublishSettings(settings);
    if (check.validityState !== "valid") {
      return { status: "app_error", message: `Publish settings are incomplete: ${check.errors.join(", ")}.`, appDefinedPayload: check.errors.join(",") };
    }
    const files = outputMedia.flatMap((media) => media.files ?? []);
    if (files.length === 0) return { status: "app_error", message: "No graphic was exported from Canva." };
    const from = settings.usage?.from ?? "";
    const to = settings.usage?.to || from;
    const useAt = from ? (from === to ? from : `${from}/${to}`) : null;
    const movement = settings.graphics?.movement === "none" ? "cut" : settings.graphics?.movement || "cut";
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        await pushCanvaGraphic({
          title: files.length > 1 ? `${String(settings.name ?? "Graphic")} — ${index + 1}` : String(settings.name ?? "Graphic"),
          imageUrl: file.url,
          movement,
          useAt,
        });
      }
      if (settings.designId) {
        void reportValopankkiExport({
          canvaDesignId: settings.designId,
          canvaDesignTitle: String(settings.name ?? "Graphic"),
          exportTarget: outputType.id,
        }).catch(() => {});
      }
      return { status: "completed" };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { status: "app_error", message: `Could not send graphic to ATEM: ${detail}`, appDefinedPayload: detail.slice(0, 300) };
    }
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
    const task = await pushContent(buildPushPayload(settings, pages));
    if (settings.designId) {
      void reportValopankkiExport({
        canvaDesignId: settings.designId,
        canvaDesignTitle: settings.name,
        exportTarget: outputType.id,
      }).catch(() => {});
    }
    const goLive = settings.goLive;
    if (!goLive?.on) return { status: "completed" };
    // Publish and go live: wait until the slides are in Pi Program, save the Go live list and send the user to its run link.
    // The push answer often carries the library item already; only wait when it does not.
    const finished = task.itemId ? task : await waitForTask(task.taskId);
    const list = await createGoLiveList({
      itemId: finished.itemId || task.itemId || "",
      title: settings.name,
      feed: goLive.feed,
      piOutput: goLive.piOutput,
      projector: goLive.projector,
      ftb: goLive.ftb,
    });
    return list.link ? { status: "completed", postPublishAction: { type: "redirect", url: list.link } } : { status: "completed" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "app_error", message: `Could not send to the church gateway: ${detail}`, appDefinedPayload: detail.slice(0, 300) };
  }
}

const contentPublisher: ContentPublisherIntent = { getPublishConfiguration, renderSettingsUi, renderPreviewUi, publishContent };
export default contentPublisher;
