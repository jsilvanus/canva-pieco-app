/**
 * Configuration. Build-time defaults come from environment variables (baked into the bundle by
 * `pnpm run build`); the gateway address and key can also be set in the app's Settings and are
 * then kept in this browser's localStorage. A key that is built into a published bundle is
 * readable by everybody who can open the app, so for a shared app leave `VITE_GATEWAY_API_KEY`
 * empty and let each operator enter theirs in Settings.
 */
// Plain `import.meta.env` so Vite replaces it whole: Canva runs the upload as a classic script, where `import.meta` is a syntax error.
const viteEnv = import.meta.env ?? null;
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

/**
 * Saves the gateway settings and, when given, the signage ones. `signageUrl` undefined keeps what is
 * stored; an empty string removes it; anything else must pass normalizeGatewayUrl (https only, a
 * path prefix such as https://host/signage is kept). `signagePushKey` follows the same rule.
 */
export function saveRuntimeSettings({ gatewayUrl, gatewayApiKey, signageUrl, signagePushKey }) {
  const url = normalizeGatewayUrl(gatewayUrl);
  if (!url) throw new Error("The gateway address must be an https address, for example https://gateway.example.org");
  const previous = readStored();
  const next = { gatewayUrl: url, gatewayApiKey: String(gatewayApiKey ?? "").trim() };
  const signage = signageUrl === undefined ? previous.signageUrl : String(signageUrl ?? "").trim() ? normalizeGatewayUrl(signageUrl) : "";
  if (signage === null) throw new Error("The signage address must be an https address, for example https://gateway.example.org/signage");
  if (signage) next.signageUrl = signage;
  const key = signagePushKey === undefined ? previous.signagePushKey : String(signagePushKey ?? "").trim();
  if (signage && typeof key === "string" && key) next.signagePushKey = key;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
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
  /** Where picontrol runs, for the run link of a Go live list when the gateway does not give a full link (VITE_PICONTROL_URL). */
  picontrolUrl: (env.VITE_PICONTROL_URL || "").replace(/\/+$/, ""),
  /** Base address of the Sissi signage service including any path prefix, or "" when not set (VITE_SIGNAGE_URL or Settings). */
  get signageUrl() {
    return normalizeGatewayUrl(readStored().signageUrl) || normalizeGatewayUrl(env.VITE_SIGNAGE_URL) || "";
  },
  /** Optional push key for use outside Canva; never baked into the bundle (build:js clears VITE_SIGNAGE_PUSH_KEY). */
  get signagePushKey() {
    const stored = readStored();
    return typeof stored.signagePushKey === "string" && stored.signageUrl ? stored.signagePushKey : env.VITE_SIGNAGE_PUSH_KEY || "";
  },
  get gatewayApiKey() {
    const stored = readStored();
    return typeof stored.gatewayApiKey === "string" && stored.gatewayUrl ? stored.gatewayApiKey : env.VITE_GATEWAY_API_KEY || "";
  },
  // Vite sets DEV only for `vite` (the dev server); a production build has it false. Under plain
  // Node (tests) there is no Vite env and NODE_ENV decides.
  isDev: viteEnv ? Boolean(viteEnv.DEV) : env.NODE_ENV !== "production",
});
