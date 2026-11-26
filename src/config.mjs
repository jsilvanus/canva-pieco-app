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
export function saveRuntimeSettings({ gatewayUrl, gatewayApiKey, signageUrl, signagePushKey, annoUrl, valopankkiUrl, piDiscoveryUrl }) {
  const url = normalizeGatewayUrl(gatewayUrl);
  if (!url) throw new Error("The gateway address must be an https address, for example https://gateway.example.org");
  const previous = readStored();
  const next = { gatewayUrl: url, gatewayApiKey: String(gatewayApiKey ?? "").trim() };
  const signage = signageUrl === undefined ? previous.signageUrl : String(signageUrl ?? "").trim() ? normalizeGatewayUrl(signageUrl) : "";
  if (signage === null) throw new Error("The signage address must be an https address, for example https://gateway.example.org/signage");
  if (signage) next.signageUrl = signage;
  const key = signagePushKey === undefined ? previous.signagePushKey : String(signagePushKey ?? "").trim();
  if (signage && typeof key === "string" && key) next.signagePushKey = key;

  const anno = annoUrl === undefined ? previous.annoUrl : String(annoUrl ?? "").trim() ? normalizeGatewayUrl(annoUrl) : "";
  if (anno === null) throw new Error("The Anno address must be an https address, for example https://kehitys.riihimaenseurakunta.fi/vuosi");
  if (anno) next.annoUrl = anno;

  const valopankki = valopankkiUrl === undefined ? previous.valopankkiUrl : String(valopankkiUrl ?? "").trim() ? normalizeGatewayUrl(valopankkiUrl) : "";
  if (valopankki === null) throw new Error("The Valopankki address must be an https address");
  if (valopankki) next.valopankkiUrl = valopankki;

  const discovery = piDiscoveryUrl === undefined ? previous.piDiscoveryUrl : String(piDiscoveryUrl ?? "").trim() ? normalizeGatewayUrl(piDiscoveryUrl) : "";
  if (discovery === null) throw new Error("The Pi Discovery address must be an https address");
  if (discovery) next.piDiscoveryUrl = discovery;

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
    return normalizeGatewayUrl(readStored().gatewayUrl) || (env.VITE_GATEWAY_URL || "https://kehitys.riihimaenseurakunta.fi/canva").replace(/\/+$/, "");
  },
  /** Where picontrol runs, for the run link of a Go live list when the gateway does not give a full link (VITE_PICONTROL_URL). */
  picontrolUrl: (env.VITE_PICONTROL_URL || "").replace(/\/+$/, ""),
  /** Base address of the Sissi signage service including any path prefix, or "" when not set (VITE_SIGNAGE_URL or Settings). */
  get signageUrl() {
    return normalizeGatewayUrl(readStored().signageUrl) || normalizeGatewayUrl(env.VITE_SIGNAGE_URL) || "";
  },
  /** Base address of the Anno church year API (VITE_ANNO_URL or Settings). */
  get annoUrl() {
    return normalizeGatewayUrl(readStored().annoUrl) || normalizeGatewayUrl(env.VITE_ANNO_URL) || "https://kehitys.riihimaenseurakunta.fi/vuosi";
  },
  /** Base address of the Tunnus identity provider (VITE_TUNNUS_URL or default VPS staging URL). */
  get tunnusUrl() {
    return normalizeGatewayUrl(readStored().tunnusUrl) || normalizeGatewayUrl(env.VITE_TUNNUS_URL) || "https://kehitys.riihimaenseurakunta.fi/identity";
  },
  /** Optional Valopankki media library base URL (VITE_VALOPANKKI_URL or Settings). */
  get valopankkiUrl() {
    return normalizeGatewayUrl(readStored().valopankkiUrl) || normalizeGatewayUrl(env.VITE_VALOPANKKI_URL) || "";
  },
  /** Pi Discovery endpoint (defaults to Tunnus, or custom VITE_PI_DISCOVERY_URL / Settings). */
  get piDiscoveryUrl() {
    return normalizeGatewayUrl(readStored().piDiscoveryUrl) || normalizeGatewayUrl(env.VITE_PI_DISCOVERY_URL) || this.tunnusUrl;
  },
  /** Optional push key for use outside Canva; never baked into the bundle (build:js clears VITE_SIGNAGE_PUSH_KEY). */
  get signagePushKey() {
    const stored = readStored();
    return typeof stored.signagePushKey === "string" && stored.signageUrl ? stored.signagePushKey : env.VITE_SIGNAGE_PUSH_KEY || "";
  },
  /**
   * Sign in with Tunnus through Canva's OAuth (on by default; set VITE_TUNNUS_SIGN_IN=0 to turn off).
   */
  get tunnusSignIn() {
    return !/^(0|false|off|no)$/i.test(String(env.VITE_TUNNUS_SIGN_IN ?? "").trim());
  },
  /** The identifier of the Auth provider in the Canva Developer Portal (VITE_AUTH_PROVIDER). */
  authProvider: env.VITE_AUTH_PROVIDER || "tunnus",
  /** Custom label for the church account sign-in button (VITE_SIGN_IN_LABEL). */
  signInLabel: env.VITE_SIGN_IN_LABEL || "Kirjaudu Tunnuksella",
  get gatewayApiKey() {
    const stored = readStored();
    return typeof stored.gatewayApiKey === "string" && stored.gatewayUrl ? stored.gatewayApiKey : env.VITE_GATEWAY_API_KEY || "";
  },
  // Vite sets DEV only for `vite` (the dev server); a production build has it false. Under plain
  // Node (tests) there is no Vite env and NODE_ENV decides.
  isDev: viteEnv ? Boolean(viteEnv.DEV) : env.NODE_ENV !== "production",
});
