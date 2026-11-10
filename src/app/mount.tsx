import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AppI18nProvider } from "@canva/app-i18n-kit";
import { AppUiProvider } from "@canva/app-ui-kit";
import { App } from "./app";

/** Renders a surface into Canva's #root with Canva's UI and i18n providers. */
export function renderInCanva(node: ReactNode) {
  const container = document.getElementById("root") || document.body.appendChild(document.createElement("div"));
  createRoot(container).render(
    <AppI18nProvider>
      <AppUiProvider>{node}</AppUiProvider>
    </AppI18nProvider>,
  );
}

/** The design panel. */
export function mount() {
  renderInCanva(<App />);
}
