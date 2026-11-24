# Launch checklist

What is ready in the repository, what the person who owns the Canva Developer Portal account has to do, and what is not verified. Nothing here has been run inside real Canva or against a real church gateway.

## Decide first: private or public app

The app only does something with a Pi Gateway that the browser in Canva can reach over https. A Canva reviewer has no such gateway, so a **public listing** would have to work for them in Dev Mock Mode only (the app switches to it by itself outside Canva or when the gateway is unreachable in a dev build) and the listing would promise something they cannot test. For one church (Keskuskirkko) a **private app / team distribution** is the better first launch. Check in the Developer Portal which distribution options your Canva plan offers; this repository cannot tell.

## In the repository (done)

- Build: `pnpm install && pnpm run build`, bundle in `dist/`. CI runs `pnpm run check` and `pnpm test`.
- The production build does **not** simulate. Earlier, `isDev` was true in production builds, so a failed push could have been shown as a success from the local simulation. Simulation now runs only under `vite` (dev server) and under tests.
- Service date (`useAt`) on Step 1: one date, a date and hour, a range, or several dates separated by commas. Sent on `POST /api/v1/canva/push`; empty sends nothing.
- Pi output (`piOutput`) on Step 2: Pi 1 (Atlona input 3) or Pi 2 (Atlona input 4), sent on `POST /api/v1/canva/setup`; the default "Gateway default" sends nothing.
- Gateway address in the build: `https://kehitys.riihimaenseurakunta.fi/canva` (`.env.example`).
- Auth (team scope): inside Canva the app sends the Canva user token (`auth.getCanvaUserToken()` from `@canva/user`) as `Authorization: Bearer`. pigateway's Canva listener verifies it against Canva's JWKS for the app and accepts only the teams in `PIGATEWAY_CANVA_ALLOWED_BRANDS`. No key is shipped in the bundle. The Settings key is only a fallback outside Canva.
- Needs on the gateway: `PIGATEWAY_CANVA_APP_ID` (the app id from the Developer Portal) and `PIGATEWAY_CANVA_ALLOWED_BRANDS` (the church team id). See pigateway `docs/canva-listener.md`.
- Progress while pushing: the gateway returns a task id; the app shows fetching slides from Canva, unpacking, thumbnails (done/total) and "Ready to present", and only goes to Step 2 when the slides are ready. A failed task shows the gateway's reason.
- Settings (link under the title): gateway address (https only, or http on localhost) and access key, kept in this browser's localStorage. Build-time `VITE_GATEWAY_URL` / `VITE_GATEWAY_API_KEY` are only defaults.
- **Do not put a real key in a published bundle.** Anything built into the bundle can be read by everybody who can open the app. Build without `VITE_GATEWAY_API_KEY` and let each operator enter the key in Settings.

## Sign in with Tunnus (built in the app, off by default, not run in Canva)

Plan: [Canva app sign-in with Tunnus](https://claude.ai/artifact/BFkuQeWS4e2hQqkwQabWrJ). With `VITE_TUNNUS_SIGN_IN=1` the panel shows "Sign in with the church account". Canva runs the OAuth flow on its own servers and keeps the tokens; the app only calls `auth.initOauth({ provider })`, `requestAuthorization` (scopes `openid profile email groups offline_access`, `prompt=consent`) and `getAccessToken`, and sends that Tunnus token as the Bearer token to the gateway and to Sissi. Signed out, the app keeps using the Canva user token (team scope), then the Settings key, exactly as before. No client secret is in the app.

- **Rights:** the app asks `GET /api/v1/canva/session` and gets `{ name, rights }`. `canva:write` allows publishing (push, playlists, signage content); `canva:operate` allows Go live, the playback and graphics controls and projector routing. They are separate. Without a right the control is disabled or hidden; the gateway still checks every call. A gateway without the session route (404) or an unreachable one gates nothing in the app.
- **Portal setup (portal owner):** Auth providers, add provider with identifier `tunnus` (or `VITE_AUTH_PROVIDER`), the client id and secret of the Tunnus `canva` client, credential transfer mode Headers, PKCE on, Tunnus's authorize and token URLs (from its discovery document), and the portal's Redirect URL copied into the Tunnus client. The client secret is only ever pasted into the portal and the infra secrets, never into this repository or the bundle.
- **Needs before it can be turned on:** the Tunnus `canva` client (infra repo), pigateway accepting Tunnus tokens and answering `/api/v1/canva/session` (pigateway thread), and Sissi checking `sissi:*` rights. None of these exist yet, so leave `VITE_TUNNUS_SIGN_IN` empty until they do.
- **Open until a spike in real Canva:** whether the Tunnus access token carries `groups` and a two-name `aud`, token lifetime and refresh, whether a team-only app can use OAuth, and whether the popup works with Tunnus's headers (Cross-Origin-Opener-Policy). The publish dialog (Content Publisher) does not show a sign-in button; it uses the sign-in made in the design panel.

## For the portal owner (not done)

1. Create the app in the [Developer Portal](https://www.canva.com/developers/) (type: Canva App), set the app name and icon.
2. Add the https origin of the gateway to the app's allowed/connect origins (the portal's field for network access): `https://kehitys.riihimaenseurakunta.fi`. On the Pi, the Canva-only listener (`PIGATEWAY_CANVA_TUNNEL_PORT`, 3010) must list the Canva app's origin from the portal in `PIGATEWAY_CANVA_TUNNEL_CORS_ORIGINS`. That origin is still open: the church has to give it.
3. Put the production bundle's URL (or upload the bundle) as the portal asks.
4. Check which permissions the portal needs for design export (`requestExport`); the code only uses the export call and the gateway.
5. Privacy policy and support contact: the app sends the exported slide images (as short-lived Canva links that the gateway downloads) and the access key to the church's own gateway; it stores the gateway address and key in the browser. Nothing is sent anywhere else. A policy text and a support address have to come from the church; none is written here.
6. Screenshots and a short description, if the distribution needs a listing. Suggested text: "Send the pages of a Canva design to the church's presentation system, route them to the projectors and drive the slides live."
7. Submit for review if you chose a public listing.

## Gateway side (before the first real service)

- Reachable now (since 2026-11-03): `https://kehitys.riihimaenseurakunta.fi/canva/api/v1/...`. Traefik on the church VPS terminates TLS and forwards through the radio tunnel to pigateway's Canva-only listener. Without the key the status route answers 401.
- pigateway with the Canva routes (pigateway #20) and piprogram with export packages (merged) must be deployed from main.
- Projector picture mute (`Key M`, "Pic Mute") is **not** wired in the gateway yet: the button reports an error. `unblankProjectors` is reported as a warning.
- The Atlona mapping used by Step 2 is an assumption: PiPGM1 on input 3, PiPGM2 on input 4; Both projectors = outputs 1 and 2, Landscape screen = output 3, All displays = 1 to 4. Check on site.

## First test, with a person at the church

1. Open the app in Canva, Settings: gateway address and key, status dot turns green.
2. Push a design of 3 pages. Watch the progress go through all stages to "Ready to present".
3. Step 2: Pi Program 2, Both projectors, apply. Check the projectors show slide 1.
4. Step 3: next, previous, jump from the strip, Fade to Black.
