// Content Publisher intent: "Publish to Keskuskirkko" in Canva's Share menu.
// Canva exports the design and hands us the files; we send them to the Pi gateway.
import { pushContent } from "../services/gateway-api.mjs";
import {
  TARGETS,
  targetById,
  validatePublishSettings,
  encodePublishRef,
  decodePublishRef,
  buildPushPayload,
} from "./publish-targets.mjs";

// One Canva output type per target. Canva shows them as the choices in the Share menu.
function outputTypeFor(target) {
  return {
    id: target.id,
    displayName: target.displayName,
    mediaSlots: [
      {
        id: "slides",
        displayName: "Slides",
        fileCount: { min: 1 },
        accepts: {
          image: { format: "png", aspectRatio: { exact: target.width / target.height } },
        },
      },
    ],
  };
}

export default {
  async getPublishConfiguration() {
    // The disabled Saarnavideo entry is shown, but Canva only gets the enabled targets to choose from.
    return { status: "completed", outputTypes: TARGETS.map(outputTypeFor) };
  },

  renderSettingsUi({ invocationContext, updatePublishSettings }) {
    // Settings are name, target and date range. Their form UI is still to be built with App UI Kit.
    const settings = decodePublishRef(invocationContext?.publishRef);
    const { validityState } = validatePublishSettings(settings);
    updatePublishSettings({ publishRef: encodePublishRef(settings), validityState });
  },

  renderPreviewUi() {
    // Previews come straight from the design; nothing extra to render.
  },

  async publishContent({ outputMedia, outputType, publishRef }) {
    const settings = decodePublishRef(publishRef);
    const check = validatePublishSettings({ ...settings, targetId: settings.targetId ?? outputType?.id });
    if (check.validityState !== "valid") {
      return { status: "app_error", message: `Publish settings are incomplete: ${check.errors.join(", ")}.` };
    }
    if (targetById(outputType?.id)?.enabled !== true) {
      return { status: "app_error", message: "This target is not available yet." };
    }

    const pages = outputMedia
      .flatMap((media) => media.files)
      .map((file, index) => ({ url: file.url, pageNumber: index + 1, name: `Page ${index + 1}` }));
    if (pages.length === 0) {
      return { status: "app_error", message: "No slides were exported from Canva." };
    }

    try {
      const body = buildPushPayload({ ...settings, targetId: outputType.id }, pages);
      await pushContent(body);
      return { status: "completed" };
    } catch (error) {
      return { status: "app_error", message: `Could not send to the church gateway: ${error?.message || error}` };
    }
  },
};
