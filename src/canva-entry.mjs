// Single-file entry for the Canva upload: registers the Design Editor intent, which Canva requires
// before it shows the app. Its render injects the stylesheet and starts the app.
import { prepareDesignEditor } from "@canva/intents/design";
import css from "./styles.css?inline";

let started = false;

prepareDesignEditor({
  render: async () => {
    if (started) return;
    started = true;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);

    // main.mjs renders into #app; Canva's iframe only provides #root.
    if (!document.getElementById("app")) {
      const app = document.createElement("div");
      app.id = "app";
      (document.getElementById("root") ?? document.body).append(app);
    }

    await import("./main.mjs");
  },
});
