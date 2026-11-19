# Plan: "Signage (Sissi)" publish target

Status: **plan, not built** (2026-11-19). No code changes in this PR.

Naming: the signage project is called **Sissi** (SiSSi in the signage roadmap). It is deployed as a Docker image behind Traefik on the VPS, so the app only needs its HTTPS base URL (a Traefik route); nothing in this plan depends on how the container is built. In the UI the target is labelled "Signage (Sissi)"; the code id stays `signage`.

The contract is [simple-smart-signage `docs/plans/step-1-web-signage.md`](https://github.com/jsilvanus/simple-smart-signage/pull/4), sections 4 (API) and 8 (what the Canva app needs). This document says how the app meets it. Site data (the signage base URL, Canva team id, keys) stays out of this public repository: it lives in the private keskuskirkko repository and in the operator's own settings.

## 1. What changes for the user

A fifth target, "Signage (Sissi)", in the Content Publisher's output-type list next to PiProgram and PiGraphics. It sends slides (and video pages) straight to Sissi, the signage service on the VPS. The Pi is not involved, so it works when the Pi is down and from outside the church network.

Fields shown **only when signage is selected**:

| Field | Behaviour |
|---|---|
| Screen | Picker filled from `GET /screens` (name, orientation, size). Refreshed whenever the settings panel opens. No create or delete of screens. |
| Mode | "Add to end" (`append`, default) or "Replace playlist" (`replace`). Replace asks for a confirmation checkbox, because it removes what the screen shows now. |
| Name | The existing name field; sent as `title` (1-200 chars). |
| Seconds per image | One number field per image page (1-3600), prefilled with the screen's `defaultImageSeconds`, plus a "set all" field. |
| Video pages | Show their duration read-only (no seconds field). |

Hidden for signage: the "Used on / Until" dates and the "permanent asset" checkbox (they belong to the Pi targets' `useAt` handling). The "Church gateway" block stays, but signage gets its own base URL field (section 3).

Export size and orientation follow the chosen screen: the preview compares the design with the screen's `width`/`height`/`orientation` (a warning only, as for other targets). If a screen has no size hint, 1920x1080 (landscape) or 1080x1920 (portrait) is assumed.

## 2. Settings UI and publish flow

Canva's Content Publisher gives the app a settings form (`settings_ui.tsx`), a preview (`preview_ui.tsx`) and `publishContent`. The settings form cannot see the exported pages, so per-page seconds need care.

**Per-page seconds in the settings form.** The form runs before export, but the number of pages is known from the preview (`renderPreviewUi` receives the selected pages). Plan: the settings form stores `{ screenId, mode, secondsAll, secondsByPage }` in `publishRef` (JSON, tiny). The per-image seconds fields are rendered from the page list the context gives (spike item S2: confirm the settings context exposes page count/selections; if it does not, the per-page fields move into the preview UI, which does see the pages, and write to `publishRef` from there). Without a per-page value, a page uses "set all", and without that, the screen's default (the service applies it when `seconds` is missing).

**Flow in `publishContent`:**

1. Validate settings (screen chosen, mode, title, every seconds value a whole number 1-3600).
2. Build `pages` from `outputMedia` files in order: `{ pageNumber, kind, url, seconds? }`. Seconds only for images; never sent for video.
3. `POST /push` with the Canva user token. On 202, poll `GET /push/:pushId` every second until `ready` or `failed` (timeout 10 minutes, tolerating a few failed polls like `waitForTask` does today).
4. Return `completed` on `ready`; on `failed` return `app_error` with the service's readable message in `appDefinedPayload` (the settings UI already shows it).

Progress text ("Downloading 2/5") goes through `onContextChange`/publish status as for the Pi targets; the publisher UI is Canva's, so progress is limited to what `publishContent` can report. The design editor panel (not the Share menu) can show a full progress bar for signage later; out of scope here.

## 3. Code layout (no implementation yet)

| Piece | Where | Notes |
|---|---|---|
| Target entry | `src/intents/publish-targets.mjs` | `id: "signage"`, `kind: "signage"`. Size and orientation are not fixed: they come from the chosen screen, so the target gets `dynamicSize: true`. `validatePublishSettings` branches on `kind`: signage needs `screenId`, `mode`, name and the seconds values, and does **not** need dates or `permanent`. |
| Payload builder | same file | `buildSignagePushPayload(settings, files)` next to `buildPushPayload`. |
| API client | new `src/services/signage-api.mjs` (+ `.d.mts`) | Same shape as `gateway-api.mjs`: `listScreens()`, `pushSignage()`, `getSignagePush()`, `waitForSignagePush()`. Reuses the timeout/error handling pattern; maps the `{error:{code,message}}` shape. |
| Config | `src/config.mjs` | New `signageUrl` (`VITE_SIGNAGE_URL`, also settable in Settings and kept in localStorage like the gateway address), using the same `normalizeGatewayUrl` rules (https only). The target is enabled only when it is set. |
| Settings UI | `src/intents/content_publisher/settings_ui.tsx`, new `signage_fields.tsx` | Fields of section 1; the gateway block shows the signage URL input when signage is selected. |
| Preview | `preview_ui.tsx` | Size check against the screen instead of a fixed target size. |
| Output type | `index.tsx` `outputTypeFor` | Signage slot accepts images and video (section 5). |
| i18n | all new strings as `defaultMessage` + `description` | As the rest of the UI. |
| Tests | `test/` (node:test) | Validation per target kind, payload builder (seconds only for images, none for video), client with a fake fetch for 401/403/404/422/429/503 and the polling loop. |
| Dev mock | `signage-api.mjs` | Like the gateway dev simulation: screens list and a 3-second push, used only outside Canva. |

The upload bundle stays one classic script without `import.meta`; the new module follows the same `import.meta.env` pattern as `config.mjs`.

## 4. Auth and errors

- `Authorization: Bearer <auth.getCanvaUserToken()>` on every call, exactly as `gateway-api.mjs` does now (`canvaUserToken()`). No key in the bundle. Outside Canva (browser test) the optional push key from Settings is used, mirroring the gateway client.
- Error mapping to user text: 401 `UNAUTHORIZED` "Sign in to Canva again"; 403 `TEAM_NOT_ALLOWED` "Your Canva team is not allowed to publish to signage"; 503 `AUTH_NOT_CONFIGURED` "Signage is not set up yet"; 404 `SCREEN_NOT_FOUND` refreshes the screen list; 422 codes show the service's message; post-202 failure codes are listed in section 6; 429 `BUSY` "Signage is busy, try again in a moment". 24 h push records mean a reload mid-publish can still poll the same `pushId`.
- CORS: the Canva app origin must be in the signage service's `SISSI_CORS_ORIGINS` (and in pigateway's tunnel list for the Pi targets). Both are operator settings, not code here. Canva's developer portal may also need the signage host in the app's allowed domains (decision 1 of the signage plan: a path on the existing host avoids growing that list).

## 5. Open question answered: one MP4 per video page, or one for the whole design?

**Short answer: Canva's documentation does not say, so the app must not rely on either; a spike on the real Canva app settles it before building (S1).** What the documentation does say (checked 2026-11-19):

- `requestExport` (Design Editor intent, what the Play flow uses): file type `"video"` is one of the multi-page-capable types, and "this array can contain a single link either to a file or a ZIP, or multiple links to individual files". Images are one file per page with `zipped: "never"`. For video the page states nothing about per-page files; the default reading is **one video for the whole design**, with page-level split only via the user's "download pages as separate files" choice, which `zipped: "never"` hides. So through `requestExport`, plan for one MP4 for the whole design.
- Content Publisher (what the publish targets use): a media slot's `accepts.video.format` is `"mp4"` (the only value), `fileCount` and `durationMs` constrain the slot, and previews report `durationMs` per video. The documentation describes `OutputMedia` only as "the actual media files exported from Canva designs" and does not say how pages map to files for video. Its own video example uses `fileCount: { exact: 1 }`, which suggests one video per slot, but that is an inference.

Consequences for the plan:

1. **Declare both kinds in the signage slot**: `accepts: { image: { format: "png" }, video: { format: "mp4" } }`, no `fileCount` maximum (the service takes 1-100). Canva then decides per selected page what it hands over.
2. **Do not assume one file per page.** `pageNumber` in the push is just the file's order. If Canva returns one MP4 for a multi-page design, it becomes one `video` entry; if it returns several, each is its own entry.
3. **`kind` is optional in the contract**: the service sniffs the downloaded bytes. The app sends `kind` only when it is sure (Canva says so, or the URL path ends in `.mp4` / `.png` / `.jpg` / `.webp`) and otherwise omits it. A wrong `kind` fails the push with `KIND_MISMATCH`, so when in doubt, omit it. The app still needs to know image vs video for the UI (seconds field vs read-only duration); that uses the same hints, and an unknown file is treated as an image until the push result says otherwise.
4. **Video duration** shown read-only comes from the preview selection's `durationMs` when available; otherwise the field says "length is read when it is added" (the service reads it from the MP4 header anyway).

### Spike S1 (first task of the build, ~30 minutes, needs Juha's Canva account)

Publish a 3-page design (two stills, one page with a video) once through a throwaway Content Publisher output type with a slot accepting `image` and `video`, and log the shape of `outputMedia` (files, count, extensions, kind fields, durations). Record the result in this document. Then repeat with a design where two pages have video. If Canva always hands one MP4 for the whole design, the plan above still works (one video entry), and the UI note tells users that videos in a multi-page design play as one clip.

## 6. Contract points settled with the signage plan

Requests R1-R3 from the first draft are settled (simple-smart-signage PR #4, sections 3 and 4.3):

- **R1.** `kind` is optional; the service sniffs the type. A wrong `kind` fails with `KIND_MISMATCH`.
- **R2.** `GET /screens` returns an optional `maxVideoSeconds` per screen (`null` = no limit). A longer video fails with `VIDEO_TOO_LONG`. The preview warns when a video's `durationMs` exceeds it, and the settings form shows the limit under the screen picker.
- **R3.** A failed push leaves the screen untouched. A concurrent push to the same screen is accepted (202) and pushes apply in order, so the app does not block a second publish. `429 BUSY` only appears when more than 3 pushes run service-wide ("try again in a moment").
- One MP4 for a whole video design is accepted as a single video entry (section 5).
- Failures after the 202 come back in the poll as `DOWNLOAD_FAILED`, `TOO_LARGE`, `UNSUPPORTED_TYPE`, `KIND_MISMATCH` or `VIDEO_TOO_LONG`. The app maps each to a readable message (for example "A file is too large for the screen" or "The video is longer than this screen allows") and shows the service's message as detail.

## 7. Build order (after Juha's go)

1. S1 spike, then record the answer here.
2. `signage-api.mjs` + tests (client, errors, polling).
3. Target entry, validation, payload builder + tests.
4. Settings UI fields, preview size check, i18n strings.
5. Config/Settings URL field; bundle, upload through the usual path.
6. On-site check with the signage service's first deployment (real Canva token, real Yodeck screen). Never tested against the real service until then; say so in the README.

## 8. Not in scope

Creating or deleting screens, reordering or removing entries (the admin page does that), schedules, scheduling by date, audio on video entries, and the Pi-side targets. README gets a short "Signage (Sissi)" section when step 4 lands.

## 9. Decisions and build tasks (review of 2026-11-19; override anything above)

- **Contract:** the machine-readable source is `openapi/sissi-v1.yaml` in simple-smart-signage (branch `step-1-impl`). The client, its fake server in tests and the error mapping are built from it. New codes there: `SCREEN_EXISTS`, `RATE_LIMITED`, `INTERRUPTED` (show as "The publish was interrupted, try again"), `INVALID_SCREEN`.
- **UI label:** "Signage (Sissi)" everywhere; the PR title wording "Signage (VPS)" is retired. Code id stays `signage`.
- **Per-page seconds:** the default design puts the per-page fields in the **preview UI** (`preview_ui.tsx`), which is known to see the pages. The settings form keeps screen, mode, "set all" and the confirmation. Spike S2 may move the per-page fields to settings later; do not build for that.
- **Base URL:** `signageUrl` includes the path prefix (for example `https://host/signage`); the client appends `/api/v1`.
- **Spike S1 (real Canva account) is Juha's task** and is not done by agents. Until its result is recorded here, the code follows section 5: no assumption about files per page; `kind` omitted unless certain.
- **Brand vs team:** the service checks the brand; user-facing text keeps saying "Canva team".

### Build tasks (Sonnet-class agents, one branch `signage-target`, tests with `node --test`, no real network)

1. [x] **T1 Client:** `src/services/signage-api.mjs` + `.d.mts`: `listScreens`, `pushSignage`, `getSignagePush`, `waitForSignagePush` (1 s poll, 10 min timeout, tolerate 3 failed polls), error mapping per section 4 and the new codes, Bearer from the Canva token, dev mock. Tests with a fake fetch driven by the OpenAPI examples. Owns `src/services/signage-api.*`, `test/signage-api.test.mjs`.
2. [x] **T2 Target and payload:** `signage` entry in `publish-targets.mjs` (`dynamicSize`, accepts image png + video mp4, enabled only with `signageUrl`), `validatePublishSettings` branch, `buildSignagePushPayload` (seconds only for images, `kind` only when certain). Owns `src/intents/publish-targets.*`, `test/publish-targets.test.mjs` additions. Runs in parallel with T1.
3. [x] **T3 Config:** `signageUrl` in `src/config.mjs` (+ `.d.mts`), Settings field, localStorage, https-only normalisation, `.env.example`. After T1/T2.
4. [x] **T4 UI:** `signage_fields.tsx`, `settings_ui.tsx`, `preview_ui.tsx`, `index.tsx` (`outputTypeFor`, `publishContent` flow of section 2), i18n strings. After T1-T3.
5. [x] **T5 Bundle and docs:** rebuild `dist-js` through the usual script (the file is committed in this repo), README "Signage (Sissi)" section stating it was never tested against the real service, tick the plan. After T4.

After T1+T2 and again after T4 a reviewer agent checks the diff against this plan and the OpenAPI file.
