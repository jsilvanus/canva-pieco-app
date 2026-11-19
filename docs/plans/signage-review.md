# Signage (Sissi) Review — T1–T4

**Verdict: T5 is cleared to start.**  
No must-fix items found. All checks pass (`npm test`: 59/59, `npm run typecheck`: clean, `npm run lint`: clean).

## 1. Alignment with `docs/plans/signage-target.md` (sections 1–9) & `openapi/sissi-v1.yaml`

- **Target & Config (`src/intents/publish-targets.mjs`, `src/config.mjs`, `src/app/settings_form.tsx`, `.env.example`, `package.json`):**
  - `signage` target uses `id: "signage"`, `kind: "signage"`, label/displayName `"Signage (Sissi)"`, `dynamicSize: true`, `accepts: { image: { format: "png" }, video: { format: "mp4" } }`, and is enabled only when `signageUrl` is set.
  - `CONFIG.signageUrl` uses `normalizeGatewayUrl` (https-only, http allowed on localhost, preserves path prefix like `/signage`) and persists in `localStorage`. `build:js` clears `VITE_SIGNAGE_PUSH_KEY`.
- **API Client (`src/services/signage-api.mjs`):**
  - Appends `/api/v1` to `signageUrl`, sends `Authorization: Bearer <token>` (Canva user token first, `signagePushKey` fallback outside Canva).
  - Covers all 23 `ErrorCode` values in `openapi/sissi-v1.yaml` (including `SCREEN_EXISTS`, `RATE_LIMITED`, `INTERRUPTED`, `INVALID_SCREEN`, `SCREEN_NOT_FOUND` with `refreshScreens: true`, and post-202 detail codes `DOWNLOAD_FAILED`, `TOO_LARGE`, `UNSUPPORTED_TYPE`, `KIND_MISMATCH`, `VIDEO_TOO_LONG`).
  - `waitForSignagePush` polls every 1 s up to 10 min, tolerates 3 failed polls, and aborts immediately on 401/403/404.
  - Dev mock provides 2 simulated screens and a 3 s push only in dev, outside Canva, when no `signageUrl` is set.
- **UI & Publish Flow (`src/intents/content_publisher/*`):**
  - `settings_ui.tsx` + `signage_fields.tsx`: hides "Used on / Until" dates and "permanent asset" checkbox for signage; shows screen picker (refreshed on open and on `SCREEN_NOT_FOUND`), `append`/`replace` mode with confirmation checkbox, `maxVideoSeconds` + `defaultImageSeconds` hint, and `secondsAll` (1–3600).
  - `preview_ui.tsx`: checks aspect ratio against screen size (or `1920×1080` / `1080×1920` fallback), warns when video `durationMs > maxVideoSeconds`, renders per-page seconds inputs for images and read-only duration (or `"length is read when it is added"`) for videos, and syncs `secondsByPage` to `settings_ui.tsx` via `BroadcastChannel` / `storage`.
  - `index.tsx` + `signage-publisher.mjs`: `outputTypeFor` uses `target.accepts` for signage; `publishSignageContent` validates, builds payload, polls, and returns `completed` or `app_error` with `appDefinedPayload`.
  - All new UI strings use `react-intl` (`defaultMessage` + `description`).

## 2. Specific Constraints

- **Payload & `kind` / `seconds`:** `buildSignagePushPayload` and `pushSignage` omit `kind` unless certain (`file.format` or `.mp4`/`.png`/`.jpg`/`.jpeg`/`.webp` extension) and never send `seconds` for `video` pages.
- **Classic-script bundle (`import.meta`):** Verified across `src/` — `import.meta.env ?? null` appears only in `src/config.mjs` (line 9).
- **Existing targets:** `piprogram-atem`, `piprogram-vertical-projector`, `pigraphics-stream`, and `saarnavideo` definitions, `allowTransparentBackground` handling, date/permanent validation, and `buildPushPayload` are unaffected.

## 3. Minor Notes (Non-blocking)

1. `src/app/settings_form.tsx`: `error={error || undefined}` is attached only to the Gateway address `FormField`, so an invalid `signageUrl` validation error displays under the Gateway address field.
2. `src/intents/content_publisher/settings_ui.tsx`: `onSaved={() => setTouched(true)}` on `<SettingsForm>` is a no-op if `touched` is already `true` (so `CONFIG.signageUrl` is not re-read until the next render); `readDraftSecondsByPage()` is exported in `signage-publisher.mjs` but not called on mount (relies on live `subscribeDraftSecondsByPage` events).
