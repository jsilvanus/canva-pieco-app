// Single-file entry for the Canva upload: injects the stylesheet, then starts the app.
import css from "./styles.css?inline";

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

await import("./main.mjs");
