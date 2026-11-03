# Launch checklist

What is ready in the repository, what the person who owns the Canva Developer Portal account has to do, and what is not verified. Nothing here has been run inside real Canva or against a real church gateway.

## Decide first: private or public app

The app only does something with a Pi Gateway that the browser in Canva can reach over https. A Canva reviewer has no such gateway, so a **public listing** would have to work for them in Dev Mock Mode only (the app switches to it by itself outside Canva or when the gateway is unreachable in a dev build) and the listing would promise something they cannot test. For one church (Keskuskirkko) a **private app / team distribution** is the better first launch. Check in the Developer Portal which distribution options your Canva plan offers; this repository cannot tell.

## In the repository (done)

- Build: `pnpm install && pnpm run build`, bundle in `dist/`. CI runs `pnpm run check` and `pnpm test`.
- The production build does **not** simulate. Earlier, `isDev` was true in production builds, so a failed push could have been shown as a success from the local simulation. Simulation now runs only under `vite` (dev server) and under tests.
- Progress while pushing: the gateway returns a task id; the app shows fetching slides from Canva, unpacking, thumbnails (done/total) and "Ready to present", and only goes to Step 2 when the slides are ready. A failed task shows the gateway's reason.
- Settings (link under the title): gateway address (https only, or http on localhost) and access key, kept in this browser's localStorage. Build-time `VITE_GATEWAY_URL` / `VITE_GATEWAY_API_KEY` are only defaults.
- **Do not put a real key in a published bundle.** Anything built into the bundle can be read by everybody who can open the app. Build without `VITE_GATEWAY_API_KEY` and let each operator enter the key in Settings.

## For the portal owner (not done)

1. Create the app in the [Developer Portal](https://www.canva.com/developers/) (type: Canva App), set the app name and icon.
2. Add the https origin of the gateway to the app's allowed/connect origins (the portal's field for network access). The gateway must also list Canva's origins in `PIGATEWAY_CORS_ORIGINS`.
3. Put the production bundle's URL (or upload the bundle) as the portal asks.
4. Check which permissions the portal needs for design export (`requestExport`); the code only uses the export call and the gateway.
5. Privacy policy and support contact: the app sends the exported slide images (as short-lived Canva links that the gateway downloads) and the access key to the church's own gateway; it stores the gateway address and key in the browser. Nothing is sent anywhere else. A policy text and a support address have to come from the church; none is written here.
6. Screenshots and a short description, if the distribution needs a listing. Suggested text: "Send the pages of a Canva design to the church's presentation system, route them to the projectors and drive the slides live."
7. Submit for review if you chose a public listing.

## Gateway side (before the first real service)

- The gateway needs a trusted https certificate and a name the operator's browser can reach (see the thread about putting the VPS Traefik in front of the Pi gateway; not built).
- pigateway with the Canva routes (pigateway #20) and piprogram with export packages (merged) must be deployed from main.
- Projector picture mute (`Key M`, "Pic Mute") is **not** wired in the gateway yet: the button reports an error. `unblankProjectors` is reported as a warning.
- The Atlona mapping used by Step 2 is an assumption: PiPGM1 on input 3, PiPGM2 on input 4; Both projectors = outputs 1 and 2, Landscape screen = output 3, All displays = 1 to 4. Check on site.

## First test, with a person at the church

1. Open the app in Canva, Settings: gateway address and key, status dot turns green.
2. Push a design of 3 pages. Watch the progress go through all stages to "Ready to present".
3. Step 2: Pi Program 2, Both projectors, apply. Check the projectors show slide 1.
4. Step 3: next, previous, jump from the strip, Fade to Black.
