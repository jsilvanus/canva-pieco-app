// Local preview outside Canva (pnpm dev): test providers, simulated export, real gateway calls.
import "@canva/app-ui-kit/styles.css";
import { createRoot } from "react-dom/client";
import { TestAppI18nProvider } from "@canva/app-i18n-kit";
import { TestAppUiProvider } from "@canva/app-ui-kit";
import { App } from "./app/app";

createRoot(document.getElementById("root") ?? document.body).render(
  <TestAppI18nProvider>
    <TestAppUiProvider>
      <App />
    </TestAppUiProvider>
  </TestAppI18nProvider>,
);
