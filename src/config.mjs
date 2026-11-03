/**
 * Configuration. Build-time defaults come from environment variables (baked into the bundle by
 * `pnpm run build`); the gateway address and key can also be set in the app's Settings and are
 * then kept in this browser's localStorage. A key that is built into a published bundle is
 * readable by everybody who can open the app, so for a shared app leave `VITE_GATEWAY_API_KEY`
 * empty and let each operator enter theirs in Settings.
 */
const viteEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : null;
const env = viteEnv || (typeof process !== "undefined" ? process.env : {});

const STORAGE_KEY = "canva-pieco-app.settings";

function readStored() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Only an https address (or http on localhost, for development) is accepted. */
export function normalizeGatewayUrl(value) {
  const text = String(value ?? "").trim().replace(/\/+$/, "");
  if (!text) return null;
  try {
    const url = new URL(text);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
    if (url.username || url.password) return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function saveRuntimeSettings({ gatewayUrl, gatewayApiKey }) {
  const url = normalizeGatewayUrl(gatewayUrl);
  if (!url) throw new Error("The gateway address must be an https address, for example https://gateway.example.org");
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ gatewayUrl: url, gatewayApiKey: String(gatewayApiKey ?? "").trim() }));
  } catch {
    throw new Error("This browser would not keep the settings (storage is blocked).");
  }
}

export function clearRuntimeSettings() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored
  }
}

export const CONFIG = Object.freeze({
  appName: env.VITE_APP_NAME || "Church Slide Bridge",
  get gatewayUrl() {
    return normalizeGatewayUrl(readStored().gatewayUrl) || (env.VITE_GATEWAY_URL || "https://gateway.local:8443").replace(/\/+$/, "");
  },
  get gatewayApiKey() {
    const stored = readStored();
    return typeof stored.gatewayApiKey === "string" && stored.gatewayUrl ? stored.gatewayApiKey : env.VITE_GATEWAY_API_KEY || "";
  },
  // Vite sets DEV only for `vite` (the dev server); a production build has it false. Under plain
  // Node (tests) there is no Vite env and NODE_ENV decides.
  isDev: viteEnv ? Boolean(viteEnv.DEV) : env.NODE_ENV !== "production",
});
