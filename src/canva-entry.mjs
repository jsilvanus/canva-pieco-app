// Single-file entry for the Canva upload: injects the UI kit stylesheet and registers both intents.
import { prepareContentPublisher } from "@canva/intents/content";
import { prepareDataConnector } from "@canva/intents/data";
import { prepareDesignEditor } from "@canva/intents/design";
// Canva's UI kit styles; Canva apps are left-to-right in every locale we serve.
import css from "@canva/app-ui-kit/styles.ltr.css?inline";
import contentPublisher from "./intents/content_publisher";
import dataConnector from "./intents/data_connector";
import designEditor from "./intents/design_editor.mjs";

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

// Each intent must be registered once, as the app loads.
prepareContentPublisher(contentPublisher);
prepareDataConnector(dataConnector);
prepareDesignEditor(designEditor);
