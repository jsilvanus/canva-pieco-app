// Canva's app lint rules (UI kit usage, i18n of user-facing text, React, TypeScript).
import canva from "@canva/app-eslint-plugin";

export default [
  { ignores: ["dist/**", "dist-js/**", "node_modules/**", "test/**", "*.config.mjs", "src/**/*.mjs", "src/**/*.d.mts"] },
  ...canva.configs.apps,
  {
    // No Jest here (tests use node:test), but the config still loads the Jest rules.
    settings: { react: { version: "19" }, jest: { version: 29 } },
  },
];
