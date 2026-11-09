// Content Publisher intent: "Publish to Keskuskirkko" in Canva's Share menu.
// Canva exports the design and hands us the files; we send them to the Pi gateway.
import { pushContent } from "../services/gateway-api.mjs";

const OUTPUT_TYPE = {
  id: "keskuskirkko_slides",
  displayName: "Keskuskirkko slides",
  mediaSlots: [
    {
      id: "slides",
      displayName: "Slides",
      fileCount: { min: 1 },
      accepts: { image: { format: "png" } },
    },
  ],
};

export default {
  async getPublishConfiguration() {
    return { status: "completed", outputTypes: [OUTPUT_TYPE] };
  },

  renderSettingsUi({ updatePublishSettings }) {
    // No per-publish settings yet: the settings are always valid.
    updatePublishSettings({ publishRef: "{}", validityState: "valid" });
  },

  renderPreviewUi() {
    // Previews come straight from the design; nothing extra to render.
  },

  async publishContent({ outputMedia, outputType }) {
    const pages = outputMedia
      .flatMap((media) => media.files)
      .map((file, index) => ({ url: file.url, pageNumber: index + 1, name: `Page ${index + 1}` }));

    if (pages.length === 0) {
      return { status: "app_error", message: "No slides were exported from Canva." };
    }

    try {
      await pushContent({ title: outputType?.displayName || "Canva Slides", pages });
      return { status: "completed" };
    } catch (error) {
      return { status: "app_error", message: `Could not send to the church gateway: ${error?.message || error}` };
    }
  },
};
