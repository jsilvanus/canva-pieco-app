import { CONFIG } from "../config.mjs";

/**
 * Sign-in with Tunnus through Canva's OAuth (see docs/plans/tunnus-sign-in.md).
 *
 * Canva runs the OAuth flow on its own servers and keeps the tokens; the app only asks Canva for the
 * current access token and sends it as a Bearer token to the gateway and to Sissi. Nothing is stored
 * here and no client secret is ever in the app. The services check the token and the person's rights.
 */

/** What the sign-in asks Tunnus for. `groups` gives the rights, `offline_access` lets Canva refresh the token. */
export const SIGN_IN_SCOPES = Object.freeze(["openid", "profile", "email", "groups", "offline_access"]);
/** Tunnus only issues a refresh token with `prompt=consent`. */
export const SIGN_IN_QUERY_PARAMS = Object.freeze({ prompt: "consent" });

let customOauth = null;
let customFetchImpl = null;

/** Test hook: an object shaped like Canva's OAuth client (requestAuthorization, getAccessToken, deauthorize). */
export function setOauthClient(client) {
  customOauth = client;
}
export function resetOauthClient() {
  customOauth = null;
}
export function setAuthFetchImpl(fn) {
  customFetchImpl = fn;
}
export function resetAuthFetchImpl() {
  customFetchImpl = null;
}

async function oauthClient() {
  if (customOauth) return customOauth;
  const { auth } = await import("@canva/user");
  return auth.initOauth({ provider: CONFIG.authProvider });
}

/** The Canva user token (inside Canva only). It names the Canva user and team, not the parish person. */
export async function getCanvaUserToken() {
  try {
    const { auth } = await import("@canva/user");
    const token = await auth.getCanvaUserToken();
    return typeof token === "string" && token ? token : null;
  } catch {
    return null;
  }
}

/** The Tunnus access token of the signed-in person, or null (not signed in, sign-in off, outside Canva). */
export async function getTunnusToken({ forceRefresh = false } = {}) {
  if (!CONFIG.tunnusSignIn) return null;
  try {
    const oauth = await oauthClient();
    const res = await oauth.getAccessToken(forceRefresh ? { forceRefresh: true } : undefined);
    return res && typeof res.token === "string" && res.token ? res.token : null;
  } catch {
    return null;
  }
}

/**
 * The Bearer token for the gateway and Sissi: the Tunnus token when signed in, else the Canva user token
 * (team scope), else null (the caller then falls back to the key from Settings).
 */
export async function getBearerToken() {
  return (await getTunnusToken()) || (await getCanvaUserToken());
}

/** Opens the Tunnus login in Canva's popup. Resolves true when the person signed in. */
export async function signIn() {
  const oauth = await oauthClient();
  const res = await oauth.requestAuthorization({ scope: new Set(SIGN_IN_SCOPES), queryParams: { ...SIGN_IN_QUERY_PARAMS } });
  return res?.status === "completed";
}

/** Disconnects the person; Canva revokes the tokens when Tunnus has a revocation URL set in the portal. */
export async function signOut() {
  const oauth = await oauthClient();
  await oauth.deauthorize();
}

/**
 * Whether `rights` (strings like "canva:write") allow `right`. `<module>:admin` includes every level of that
 * module, and `*:<level>` covers every Pi module. Rights are explicit: write does not give operate.
 */
export function hasRight(rights, right) {
  const [module, level] = String(right).split(":");
  if (!module || !level) return false;
  const set = new Set(Array.isArray(rights) ? rights : []);
  return set.has(right) || set.has(`${module}:admin`) || set.has(`*:${level}`) || set.has("*:admin");
}

/**
 * What the app may show. `state`:
 * - "off": sign-in is not turned on; nothing is gated here (the services still check every call).
 * - "signed-out": sign-in is on but nobody is signed in; the app still works as before (Canva team token)
 *   and offers to sign in.
 * - "signed-in": `name` and `rights` come from the gateway.
 * - "no-access": signed in, but the gateway refused the person (no rights at all).
 * - "unknown": the gateway has no session route yet (older gateway) or could not be reached; nothing is gated.
 * `canWrite` and `canOperate` only hide or disable controls. The server enforces on every call.
 */
function jwtDisplayName(token) {
  try {
    const parts = String(token ?? "").split(".");
    if (parts.length !== 3) return "";
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    const email = typeof parsed?.email === "string" ? parsed.email.trim() : "";
    return name || email;
  } catch {
    return "";
  }
}

export async function loadAccount(options = {}) {
  if (!CONFIG.tunnusSignIn) return account("off");
  const token = await (options.getToken || getTunnusToken)();
  if (!token) return account("signed-out");
  const fallbackName = jwtDisplayName(token);
  const base = String(options.baseUrl ?? CONFIG.gatewayUrl).replace(/\/+$/, "");
  const fetchFn = options.fetch || customFetchImpl || fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  try {
    const res = await fetchFn(`${base}/api/v1/canva/session`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) return account("no-access", { name: fallbackName });
    if (!res.ok) return account("unknown", { name: fallbackName });
    const body = await res.json();
    const rights = Array.isArray(body?.rights) ? body.rights.filter((r) => typeof r === "string") : [];
    const name = (typeof body?.name === "string" && body.name.trim()) || fallbackName;
    if (rights.length === 0) return account("no-access", { name });
    return account("signed-in", { name, rights });
  } catch {
    return account("unknown", { name: fallbackName });
  } finally {
    clearTimeout(timer);
  }
}

function account(state, extra = {}) {
  const rights = extra.rights || [];
  const gated = state === "signed-in" || state === "no-access";
  return {
    state,
    name: extra.name || "",
    rights,
    canWrite: gated ? hasRight(rights, "canva:write") : true,
    canOperate: gated ? hasRight(rights, "canva:operate") : true,
  };
}
