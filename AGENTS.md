# Standing Rules

- **Always increment `BUILD_VERSION` when building the JS bundle.** Use `pnpm run build:js` (which runs `node scripts/build-js.mjs` to bump `BUILD_VERSION` in `src/build-version.mjs` before running `vite build -c vite.js-only.config.mjs` with `VITE_GATEWAY_API_KEY` and `VITE_SIGNAGE_PUSH_KEY` cleared). Never build the JS bundle without bumping `BUILD_VERSION`.
