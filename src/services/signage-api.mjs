import { CONFIG } from "../config.mjs";
import { getBearerToken } from "./auth.mjs";

/**
 * Client for the Sissi signage service (contract: simple-smart-signage openapi/sissi-v1.yaml).
 * The base URL (`signageUrl`) includes the path prefix, for example https://host/signage; this
 * client appends /api/v1. No `import.meta` here (the upload bundle is a classic script); the
 * only environment access is through config.mjs.
 */

/** What the user sees for each error code. A null text means "show the service's own message". */
const USER_MESSAGES = {
  UNAUTHORIZED: "Sign in to Canva again",
  TEAM_NOT_ALLOWED: "Your Canva team is not allowed to publish to signage",
  AUTH_NOT_CONFIGURED: "Signage is not set up yet",
  SCREEN_NOT_FOUND: "This screen no longer exists. The screen list was refreshed, choose a screen again",
  SCREEN_EXISTS: "A screen with this id already exists",
  ENTRY_NOT_FOUND: "That playlist entry no longer exists",
  PUSH_NOT_FOUND: "The publish is no longer known to signage. Publish again",
  INVALID_MODE: null,
  INVALID_ENABLED: null,
  FORBIDDEN: "You may add slides to this screen but not put them live. Publish without \"Enable now\"",
  INVALID_TITLE: null,
  INVALID_PAGES: null,
  INVALID_KIND: null,
  INVALID_SECONDS: null,
  INVALID_SCREEN: null,
  PAGE_URL_NOT_ALLOWED: null,
  TOO_MANY_PAGES: null,
  BUSY: "Signage is busy, try again in a moment",
  RATE_LIMITED: "Too many attempts, wait a moment and try again",
  DOWNLOAD_FAILED: "Signage could not download a file from Canva",
  TOO_LARGE: "A file is too large for the screen",
  UNSUPPORTED_TYPE: "A file is not a type the screen can show",
  KIND_MISMATCH: "A file is not the kind (image or video) it was expected to be",
  VIDEO_TOO_LONG: "The video is longer than this screen allows",
  INTERRUPTED: "The publish was interrupted, try again",
};

/** Codes whose user text is followed by the service's message as detail. */
const DETAIL_CODES = new Set(["DOWNLOAD_FAILED", "TOO_LARGE", "UNSUPPORTED_TYPE", "KIND_MISMATCH", "VIDEO_TOO_LONG"]);

/** Fallback by HTTP status when the body has no known code. */
const STATUS_CODES = {
  401: "UNAUTHORIZED",
  403: "TEAM_NOT_ALLOWED",
  404: "SCREEN_NOT_FOUND",
  429: "BUSY",
  503: "AUTH_NOT_CONFIGURED",
};

/**
 * Error of the signage client.
 * - `code`: the service's error code, or NETWORK, TIMEOUT, NOT_CONFIGURED, BAD_RESPONSE, UNKNOWN.
 * - `status`: HTTP status (0 = no answer, 504 = timeout, 500 for a push that failed after the 202).
 * - `userMessage`: readable text for the UI. `message` is the same, plus the service's detail when there is one.
 * - `serviceMessage`: the service's own message (never contains a signed URL query), or null.
 * - `refreshScreens`: true when the screen list should be reloaded (SCREEN_NOT_FOUND).
 */
export class SignageError extends Error {
  constructor(code, status, userMessage, { serviceMessage = null, details = null } = {}) {
    super(serviceMessage && DETAIL_CODES.has(code) ? `${userMessage}: ${serviceMessage}` : userMessage);
    this.name = "SignageError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
    this.serviceMessage = serviceMessage;
    this.details = details;
    this.refreshScreens = code === "SCREEN_NOT_FOUND";
  }
}

/** Builds a SignageError from a service code and message (also used for post-202 failures). */
export function signageErrorFromCode(code, status, serviceMessage = null, details = null) {
  const known = Object.hasOwn(USER_MESSAGES, code) ? code : null;
  const text = known ? USER_MESSAGES[known] : null;
  const userMessage = text || serviceMessage || (known ? `Signage refused the request (${known})` : `Signage answered HTTP ${status}`);
  return new SignageError(known || code || "UNKNOWN", status, userMessage, { serviceMessage, details });
}

let customFetchImpl = null;

export function setSignageFetchImpl(fn) {
  customFetchImpl = fn;
}

export function resetSignageFetchImpl() {
  customFetchImpl = null;
}

function resolveBaseUrl(options) {
  const raw = options.baseUrl ?? CONFIG.signageUrl ?? "";
  return String(raw).trim().replace(/\/+$/, "");
}

/** Authorization: the Canva token, else (outside Canva) the optional push key. */
async function getHeaders(options, token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const bearer = token || options.pushKey || CONFIG.signagePushKey || "";
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  return headers;
}

async function apiRequest(path, options = {}) {
  const base = resolveBaseUrl(options);
  const url = `${base}/api/v1${path}`;
  const token = await (options.getToken || getBearerToken)();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  try {
    const fetchFn = options.fetch || customFetchImpl || fetch;
    const response = await fetchFn(url, {
      method: options.method || "GET",
      headers: await getHeaders(options, token),
      ...(options.body !== undefined ? { body: options.body } : {}),
      signal: controller.signal,
    });
    if (!response.ok) {
      let data = null;
      try {
        data = await response.json();
      } catch {
        // not JSON
      }
      const err = data?.error && typeof data.error === "object" ? data.error : {};
      const code = typeof err.code === "string" ? err.code : STATUS_CODES[response.status] || "UNKNOWN";
      throw signageErrorFromCode(code, response.status, typeof err.message === "string" ? err.message : null, data);
    }
    try {
      return await response.json();
    } catch {
      throw new SignageError("BAD_RESPONSE", response.status, "Signage sent an answer the app could not read");
    }
  } catch (err) {
    if (err instanceof SignageError) throw err;
    if (err?.name === "AbortError") throw new SignageError("TIMEOUT", 504, "Signage did not answer in time");
    throw new SignageError("NETWORK", 0, "Could not reach signage. Check the signage address and your connection", { serviceMessage: err?.message ?? null });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---- Dev mock: used only outside Canva, in dev, when no signage address is set ----

const MOCK_SCREENS = [
  { id: "lobby", name: "Lobby (simulated)", orientation: "landscape", width: 1920, height: 1080, defaultImageSeconds: 10, maxVideoSeconds: null, entryCount: 3, enabledEntryCount: 3, playlistVersion: 1 },
  { id: "hall", name: "Hall (simulated)", orientation: "vertical", width: 1080, height: 1920, defaultImageSeconds: 8, maxVideoSeconds: 60, entryCount: 0, enabledEntryCount: 0, playlistVersion: 1 },
];
const MOCK_VIEWS = [
  { id: "aikuistyo", name: "Aikuistyö (simulated)", kind: "view", orientation: "landscape", width: 1200, height: 630, defaultImageSeconds: 10, maxVideoSeconds: null, entryCount: 0, enabledEntryCount: 0, playlistVersion: 1, rights: ["write", "operate"] },
];
const MOCK_PUSH_MS = 3000;
const mockPushes = new Map();

async function useMock(options) {
  if (options.mock === true) return true;
  if (options.mock === false) return false;
  if (!CONFIG.isDev || resolveBaseUrl(options)) return false;
  return !(await (options.getToken || getBearerToken)());
}

function mockStatus(pushId, now) {
  const push = mockPushes.get(pushId);
  if (!push) return null;
  const fraction = Math.min(1, (now - push.startedAt) / MOCK_PUSH_MS);
  const total = push.total;
  return {
    pushId,
    screenId: push.screenId,
    state: fraction >= 1 ? "ready" : fraction < 0.1 ? "queued" : "downloading",
    progress: fraction,
    pages: { done: Math.min(total, Math.floor(fraction * total)), total },
    error: null,
    playlistVersion: fraction >= 1 ? 2 : null,
    isSimulated: true,
  };
}

function notConfigured() {
  return new SignageError("NOT_CONFIGURED", 0, "Set the signage address in Settings first");
}

/**
 * Screens for the picker: [{ id, name, orientation, width, height, defaultImageSeconds, maxVideoSeconds, entryCount, playlistVersion }].
 * Options (all optional): baseUrl, pushKey, fetch, getToken, timeoutMs, mock.
 */
export async function listScreens(options = {}) {
  const kind = options.kind;
  if (await useMock(options)) return (kind === "view" ? MOCK_VIEWS : MOCK_SCREENS).map((s) => ({ ...s }));
  if (!resolveBaseUrl(options)) throw notConfigured();
  const data = await apiRequest(`/screens${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`, options);
  if (!Array.isArray(data?.screens)) throw new SignageError("BAD_RESPONSE", 200, "Signage sent an answer the app could not read");
  return data.screens;
}

/** Lists only web views; aggregate targets are excluded by Sissi. */
export function listViews(options = {}) {
  return listScreens({ ...options, kind: "view" });
}

/**
 * Starts a push (202). `enabled` false (default) adds the slides disabled; true puts them live at once.
 * `pages` are `{ pageNumber, url, kind?, seconds? }` in play order.
 * Resolves with { pushId, taskId, state, screenId }. Follow it with waitForSignagePush().
 */
export async function pushSignage({ screenId, mode = "append", enabled = false, title, pages }, options = {}) {
  if (await useMock(options)) {
    const pushId = `sim_${Date.now()}_${mockPushes.size}`;
    mockPushes.set(pushId, { startedAt: (options.now || Date.now)(), total: pages.length, screenId });
    return { pushId, taskId: pushId, state: "queued", screenId, isSimulated: true };
  }
  if (!resolveBaseUrl(options)) throw notConfigured();
  return apiRequest("/push", {
    ...options,
    method: "POST",
    body: JSON.stringify({
      screenId,
      mode,
      enabled,
      title,
      pages: pages.map((p) => ({
        pageNumber: p.pageNumber,
        url: p.url,
        ...(p.kind ? { kind: p.kind } : {}),
        ...(p.kind !== "video" && p.seconds != null ? { seconds: p.seconds } : {}),
      })),
    }),
  });
}

/** Current state of a push: { pushId, screenId, state, progress, pages: {done,total}, error, playlistVersion }. */
export async function getSignagePush(pushId, options = {}) {
  if (String(pushId).startsWith("sim_") && mockPushes.has(pushId)) return mockStatus(pushId, (options.now || Date.now)());
  if (!resolveBaseUrl(options)) throw notConfigured();
  return apiRequest(`/push/${encodeURIComponent(pushId)}`, { ...options, timeoutMs: options.timeoutMs || 5000 });
}

/** Progress text for the UI, e.g. "Downloading 2/5". */
export function describeSignagePush(status) {
  if (status.state === "ready") return "Added to signage";
  if (status.state === "failed") return "Publishing failed";
  const { done = 0, total = 0 } = status.pages || {};
  if (status.state === "queued") return "Waiting to start...";
  return total > 0 ? `Downloading ${Math.min(done + 1, total)}/${total}` : "Downloading...";
}

/**
 * Polls a push until `ready` (resolves with the status) or `failed` (rejects with a SignageError
 * carrying the service's code, e.g. DOWNLOAD_FAILED). `onProgress` gets { state, progress, done, total, label, status }
 * after every successful poll. Up to 3 failed polls in a row are tolerated; a 401, 403 or 404 on
 * a poll ends at once. Gives up after `timeoutMs` (code TIMEOUT).
 * Options: pollMs (1000), timeoutMs (10 min), sleep, now (clocks, for tests), plus the request options.
 */
export async function waitForSignagePush(
  pushId,
  { onProgress, pollMs = 1000, timeoutMs = 10 * 60_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now, ...requestOptions } = {},
) {
  const deadline = now() + timeoutMs;
  let misses = 0;
  for (;;) {
    let status;
    try {
      status = await getSignagePush(pushId, { ...requestOptions, now });
      misses = 0;
    } catch (err) {
      const fatal = err instanceof SignageError && [401, 403, 404].includes(err.status);
      if (fatal || ++misses > 3) throw err;
      if (now() > deadline) throw new SignageError("TIMEOUT", 504, "Publishing took too long. Check the screen before trying again");
      await sleep(pollMs);
      continue;
    }
    if (onProgress) {
      const { done = 0, total = 0 } = status.pages || {};
      onProgress({ state: status.state, progress: status.progress ?? 0, done, total, label: describeSignagePush(status), status });
    }
    if (status.state === "failed") {
      const e = status.error || {};
      throw signageErrorFromCode(typeof e.code === "string" ? e.code : "UNKNOWN", 500, typeof e.message === "string" ? e.message : null, status);
    }
    if (status.state === "ready") return status;
    if (now() > deadline) throw new SignageError("TIMEOUT", 504, "Publishing took too long. Check the screen before trying again", { details: status });
    await sleep(pollMs);
  }
}
