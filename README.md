# canva-pieco-app

**canva-pieco-app** is the official Canva App (SDK plugin) for church slide presentations in the Pi stack. It runs directly inside Canva as an interactive panel, connecting to the church's **Pi Gateway** to stage media in **Pi Program**, configure **Pi Matrix** display routes, and control live slide playback during services.

No separate receiver daemon is needed on the church Pi; Pi Gateway fronts the internal services and Pi Program manages slide media storage.

---

## 3-Phase Service Workflow

```
[ Step 1: Push Content ] ➔ [ Step 2: Presentation Setup ] ➔ [ Step 3: Live Control ]
```

### 1. Step 1: Push Content (Media Staging)
* Calls Canva Apps SDK (`@canva/design` `requestExport`) to export current design pages as individual unzipped PNGs.
* Sends the page URLs to Pi Gateway (`POST /api/v1/canva/push`), which answers with a task. The app follows it (`GET /api/v1/canva/tasks/{taskId}`) and shows fetching, unpacking, thumbnails and "Ready to present" before it goes on to Step 2.
* Media is safely staged in Pi Program storage. **Live screens and current matrix video routes remain untouched.**

### 2. Step 2: Presentation Setup (Pipeline & Matrix Routing)
* **Target Pipeline**: Choose `Pi Program 1` (primary) or `Pi Program 2` (secondary/split).
* **Pi Matrix Destination**: Select where the pipeline outputs:
  * *Both Projectors* (Stage Left & Right)
  * *Landscape Screen* (Side Wall)
  * *All Displays*
  * *Keep Current Route*
* **Projector Shutter Option**: Checkbox to automatically unblank projector beams (`Turn OFF Pic Mute`) on live activation.
* **Cue Slide 1**: Pre-stages the first slide on the pipeline stage.
* Action button **Set up and go live** arms the presentation and switches matrix routes.

### 3. Step 3: Live Presentation Controls
* **Navigation**: **Previous** and **Next** buttons.
* **Keyboard Hotkeys**:
  * `Right Arrow` / `Space` / `PageDown`: Next Slide
  * `Left Arrow` / `PageUp`: Previous Slide
  * `Key B`: Fade to Black (FTB) toggle
  * `Key M`: Projector Picture Mute hardware toggle
* **Thumbnail Quick Jump**: Slide thumbnail strip to jump directly to any page.
* **Output & Shutter Controls**:
  * **Fade to Black (FTB)**: Pi Program output slide blanking.
  * **Projector Pic Mute**: Physical hardware beam shutter control (blank/unblank projector lamp output).
  * **Restart (Slide 1)**: Quick reset to beginning.

---

## UI

The panel is built the way Canva expects apps to be built:

* **React** with Canva's **App UI Kit** (`@canva/app-ui-kit`): `AppUiProvider`, `Rows`, `Columns`, `Button`, `FormField`, `Select`, `Tabs`, `Switch`, `ImageCard`, `ProgressBar`, `Alert`. Canva's theme and styles, no custom CSS.
* **Localization** with `@canva/app-i18n-kit` (`AppI18nProvider`) and `react-intl`. Every user-facing string is a message with a `description`; `babel-plugin-formatjs` gives each one the content-hash id Canva's translation tooling uses.
* **Linting** with `@canva/app-eslint-plugin` (`apps` config) and TypeScript (`pnpm run lint`, `pnpm run typecheck`; both run in `pnpm run check`).
* **Intents**: `src/canva-entry.mjs` registers Design Editor (this panel) and Content Publisher. The upload is one classic-script file (`pnpm run build:js` → `dist-js/canva-pieco-app.js`).

UI code is in `src/app/` (TSX); the gateway, SDK and config services stay in plain JS with type declarations next to them.

---

## Build-time Configuration

Target host, API key, and plugin branding are defaults baked into the static bundle at build time via environment variables. The gateway address and key can also be set in the app (Settings), kept in the browser. Do not bake a real key into a published bundle. See `docs/launch.md` for the launch checklist.

### Environment Variables

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `VITE_APP_NAME` | Plugin display title shown in Canva | `Church Slide Bridge` | `"Keskuskirkko Slide Bridge"` |
| `VITE_GATEWAY_URL` | Base HTTPS URL of Pi Gateway | `https://gateway.local:8443` | `"https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443"` |
| `VITE_GATEWAY_API_KEY`| Scoped API Token for Pi Gateway | `""` | `"secret-canva-api-key"` |

See `.env.example` for reference.

### Multi-Church / Multi-Venue Builds

To build a custom bundle for a specific church:

```bash
# Example for Keskuskirkko
VITE_APP_NAME="Keskuskirkko Slide Bridge" \
VITE_GATEWAY_URL="https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443" \
VITE_GATEWAY_API_KEY="church-token-xyz" \
pnpm run build
```

The resulting `dist/` folder contains pure static files (`index.html`, JS, CSS) ready to host.

---

## Development & Local Testing

### Local Dev Server
```bash
pnpm install
pnpm run dev
```
Runs at `http://localhost:3100`.

* When opened in a standard browser (outside Canva), `canva-pieco-app` detects this and automatically enables **Dev Mock Mode** with simulated slide exports. `src/dev.tsx` renders the panel with Canva's test providers (`TestAppUiProvider`, `TestAppI18nProvider`), which are for local testing only.

### Tests
```bash
pnpm test
```
Runs Node's native test runner against the client and API services with mock network responses.

---

## Canva Developer Portal Setup

1. Go to the [Canva Developer Portal](https://www.canva.dev/).
2. Create an App (type: **Canva App**).
3. Under **Development URL**, specify your local Vite server (`http://localhost:3100` or tunneled HTTPS URL) or production static hosting URL.
4. Enable app permissions:
   * **Design Export** (`requestExport`) from `@canva/design`.

---

## Security Model

Because Canva apps run in a sandboxed iframe on Canva domains:
1. **Strict HTTPS**: Gateway URL must be HTTPS to prevent browser mixed-content blocking.
2. **CORS Restrictions**: Pi Gateway restricts CORS on Canva routes to Canva origins (`https://*.canva-apps.com`, Canva developer origins).
3. **Scoped Gateway Routes**: Pi Gateway only exposes 4 flat endpoints:
   * `POST /api/v1/canva/push`: Staged slide upload to Pi Program.
   * `POST /api/v1/canva/setup`: Pipeline arming & predefined Pi Matrix route presets.
   * `POST /api/v1/canva/control`: All live controls (`next`, `prev`, `gotoPage`, `ftb`, `picMute`).
   * `GET  /api/v1/canva/status`: Pipeline and projector status.
4. See `openapi/openapi.yaml` for the complete API contract.

---

## Pi Ecosystem Integration & Status Updates

This project is an integral component of the [Pi Production Ecosystem](file:///d:/piecosystem).

> [!IMPORTANT]
> Any changes to this repository's architectural role, API routes, communication protocols, exposed ports, dependencies, or runtime status **must be documented in the central `piecosystem` coordination repository** (`docs/projects-catalog.md` and `docs/inter-service-matrix.md`).
> Always verify cross-system health with `npm run status` in `D:\piecosystem`.
