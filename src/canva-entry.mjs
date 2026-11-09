// Single-file entry for the Canva upload: injects the stylesheet and registers both intents.
import { prepareContentPublisher } from "@canva/intents/content";
import { prepareDesignEditor } from "@canva/intents/design";
import css from "./styles.css?inline";
import contentPublisher from "./intents/content_publisher.mjs";
import designEditor from "./intents/design_editor.mjs";

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

// Each intent must be registered once, as the app loads.
prepareContentPublisher(contentPublisher);
prepareDesignEditor(designEditor);
