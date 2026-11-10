import { createRoot } from "react-dom/client";
import { AppI18nProvider } from "@canva/app-i18n-kit";
import { AppUiProvider } from "@canva/app-ui-kit";
import { App } from "./app";

/** Renders the panel into Canva's #root with Canva's UI and i18n providers. */
export function mount(container: HTMLElement) {
  createRoot(container).render(
    <AppI18nProvider>
      <AppUiProvider>
        <App />
      </AppUiProvider>
    </AppI18nProvider>,
  );
}
