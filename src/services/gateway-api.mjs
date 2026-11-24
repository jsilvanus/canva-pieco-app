import { CONFIG } from "../config.mjs";
import { getBearerToken } from "./auth.mjs";

/**
 * Custom error class for Pi Gateway API errors.
 */
export class GatewayError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
    this.details = details;
  }
}

let customFetchImpl = null;

export function setFetchImpl(fn) {
  customFetchImpl = fn;
}

export function resetFetchImpl() {
  customFetchImpl = null;
}

/**
 * Standard headers for Pi Gateway requests: the Tunnus sign-in token when signed in, else the Canva user
 * token when there is one, otherwise the
 * key from Settings or the build (outside Canva, e.g. a browser test).
 */
async function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const userToken = await getBearerToken();
  if (userToken) {
    headers["Authorization"] = `Bearer ${userToken}`;
  } else if (CONFIG.gatewayApiKey) {
    headers["Authorization"] = `Bearer ${CONFIG.gatewayApiKey}`;
    headers["X-Api-Key"] = CONFIG.gatewayApiKey;
  }
  return headers;
}

/**
 * Helper to execute a fetch request with timeout.
 */
async function apiRequest(path, options = {}) {
  const url = `${CONFIG.gatewayUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

  try {
    const fetchFn = customFetchImpl || fetch;
    const response = await fetchFn(url, {
      ...options,
      headers: {
        ...(await getHeaders()),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errData = null;
      try {
        errData = await response.json();
      } catch {
        // ignore parse error
      }
      const nested = errData?.error && typeof errData.error === "object" ? errData.error.message : null;
      const message = nested || errData?.message || (typeof errData?.error === "string" ? errData.error : null) || `HTTP ${response.status} from Gateway`;
      throw new GatewayError(message, response.status, errData);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new GatewayError(`Request to Gateway timed out (${url})`, 504);
    }
    if (err instanceof GatewayError) throw err;
    throw new GatewayError(`Failed to connect to Pi Gateway at ${CONFIG.gatewayUrl}: ${err.message}`, 0);
  }
}

// In-memory simulation state for offline dev testing
const devSimulationState = {
  currentPresentation: null,
  pipelineId: "pipgm1",
  matrixRoute: "both_projectors",
  currentSlide: 1,
  totalSlides: 1,
  ftb: false,
  picMute: false,
  tasks: new Map(),
};

const USE_AT_ITEM = /^\d{4}-\d{2}-\d{2}(T\d{2})?$/;

/**
 * Service date for the gateway (`useAt`): one date (2026-11-08), a date and hour (2026-11-08T10),
 * a range (2026-11-08/2026-11-09) or several of these separated by commas. Returns null for an
 * empty field, a string for one item and a list for several. Throws on anything else.
 */
export function parseUseAt(text) {
  const items = String(text ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;
  for (const item of items) {
    const parts = item.split("/");
    if (parts.length > 2 || !parts.every((p) => USE_AT_ITEM.test(p))) {
      throw new Error(`"${item}" is not a service date. Use 2026-11-08, 2026-11-08T10 or a range 2026-11-08/2026-11-09.`);
    }
  }
  return items.length === 1 ? items[0] : items;
}

/**
 * Step 1: Push exported slides to Pi Gateway. The gateway answers 202 with a task: it downloads
 * the pages, Pi Program unpacks them and makes step pictures and thumbnails. Follow it with
 * waitForTask() until `ready`.
 */
export async function pushContent({ title, pages, useAt = null, target = null, orientation = null }) {
  try {
    return await apiRequest("/api/v1/canva/push", {
      method: "POST",
      body: JSON.stringify({
        title,
        pages: pages.map((p) => ({
          pageNumber: p.pageNumber,
          url: p.url,
          name: p.name,
        })),
        ...(useAt ? { useAt } : {}),
        ...(target ? { target } : {}),
        ...(orientation ? { orientation } : {}),
      }),
    });
  } catch (err) {
    if (CONFIG.isDev && !(err instanceof GatewayError && err.status >= 400 && err.status < 500)) {
      console.warn("[canva-pieco-app] Gateway unreachable in dev mode - using local simulation:", err.message);
      const presentationId = `pres_${Date.now()}`;
      devSimulationState.currentPresentation = {
        presentationId,
        title,
        pages,
        pageCount: pages.length,
      };
      devSimulationState.totalSlides = pages.length;
      devSimulationState.currentSlide = 1;
      const taskId = `sim_${presentationId}`;
      devSimulationState.tasks.set(taskId, { startedAt: Date.now(), presentationId, title, pageCount: pages.length });
      return buildSimulatedTask(taskId);
    }
    throw err;
  }
}

const SIMULATED_TASK_MS = 3000;

function buildSimulatedTask(taskId) {
  const sim = devSimulationState.tasks.get(taskId);
  const fraction = Math.min(1, (Date.now() - sim.startedAt) / SIMULATED_TASK_MS);
  const total = sim.pageCount;
  const downloadDone = Math.min(total, Math.floor((fraction / 0.3) * total));
  const ready = fraction >= 1;
  const state = ready ? "ready" : fraction < 0.3 ? "downloading" : fraction < 0.5 ? "unpacking" : "preparing";
  const pictureTotal = total * 2;
  const pictureDone = fraction < 0.5 ? 0 : Math.min(pictureTotal, Math.floor(((fraction - 0.5) / 0.5) * pictureTotal));
  return {
    taskId,
    presentationId: sim.presentationId,
    title: sim.title,
    state,
    progress: fraction,
    pageCount: total,
    downloaded: { done: fraction >= 0.3 ? total : downloadDone, total },
    pictures: { done: ready ? pictureTotal : pictureDone, total: fraction < 0.5 ? 0 : pictureTotal },
    saved: fraction >= 0.5,
    ready,
    error: null,
    isSimulated: true,
  };
}

/**
 * Current state of a push task: state (queued, downloading, unpacking, preparing, ready, failed),
 * progress 0..1, downloaded and pictures {done,total}, saved, ready, error.
 */
export async function getTask(taskId) {
  if (devSimulationState.tasks.has(taskId)) return buildSimulatedTask(taskId);
  return apiRequest(`/api/v1/canva/tasks/${encodeURIComponent(taskId)}`, { timeoutMs: 5000 });
}

/**
 * Polls a task until it is ready (resolves with the task) or failed (rejects). `onUpdate` gets
 * every poll result. A few failed polls in a row (network hiccup) are tolerated.
 */
export async function waitForTask(taskId, { onUpdate, pollMs = 700, timeoutMs = 15 * 60_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const deadline = Date.now() + timeoutMs;
  let misses = 0;
  for (;;) {
    let task;
    try {
      task = await getTask(taskId);
      misses = 0;
    } catch (err) {
      if ((err instanceof GatewayError && err.status === 404) || ++misses >= 5) throw err;
      await sleep(pollMs);
      continue;
    }
    if (onUpdate) onUpdate(task);
    if (task.state === "failed") throw new GatewayError(task.error || "Preparing the slides failed", 500, task);
    if (task.state === "ready" && task.ready !== false) return task;
    if (Date.now() > deadline) throw new GatewayError("Preparing the slides took too long", 504, task);
    await sleep(pollMs);
  }
}

/**
 * Step 2: Configure Presentation Pipeline and route to displays.
 */
export async function setupPresentation({ presentationId, pipelineId, matrixRoute, unblankProjectors, cueSlide = 1, piOutput = null }) {
  try {
    return await apiRequest("/api/v1/canva/setup", {
      method: "POST",
      body: JSON.stringify({
        presentationId,
        pipelineId,
        matrixRoute,
        unblankProjectors,
        cueSlide,
        ...(piOutput ? { piOutput } : {}),
      }),
    });
  } catch (err) {
    if (CONFIG.isDev) {
      console.warn("[canva-pieco-app] Gateway unreachable in dev mode - simulating setup:", err.message);
      devSimulationState.pipelineId = pipelineId;
      devSimulationState.matrixRoute = matrixRoute;
      devSimulationState.currentSlide = cueSlide;
      if (unblankProjectors) {
        devSimulationState.picMute = false;
      }
      return {
        success: true,
        pipelineId,
        matrixRoute,
        picMute: devSimulationState.picMute,
        currentSlide: cueSlide,
        isSimulated: true,
      };
    }
    throw err;
  }
}

/**
 * Step 3: Slide Navigation (next, prev, gotoPage).
 */
export async function controlSlide({ pipelineId, action, page }) {
  try {
    return await apiRequest("/api/v1/canva/control", {
      method: "POST",
      body: JSON.stringify({
        pipelineId,
        action,
        page,
      }),
    });
  } catch (err) {
    if (CONFIG.isDev) {
      console.warn("[canva-pieco-app] Simulating slide control:", action, page);
      if (action === "next") {
        devSimulationState.currentSlide = Math.min(devSimulationState.totalSlides, devSimulationState.currentSlide + 1);
      } else if (action === "prev") {
        devSimulationState.currentSlide = Math.max(1, devSimulationState.currentSlide - 1);
      } else if (action === "gotoPage" && typeof page === "number") {
        devSimulationState.currentSlide = Math.max(1, Math.min(devSimulationState.totalSlides, page));
      }
      return {
        success: true,
        currentPage: devSimulationState.currentSlide,
        isSimulated: true,
      };
    }
    throw err;
  }
}

/**
 * Step 3: Fade to Black (FTB) on Pi Program.
 */
export async function toggleFtb({ pipelineId, enabled }) {
  try {
    return await apiRequest("/api/v1/canva/control", {
      method: "POST",
      body: JSON.stringify({
        pipelineId,
        action: "ftb",
        enabled,
      }),
    });
  } catch (err) {
    if (CONFIG.isDev) {
      devSimulationState.ftb = enabled;
      return { success: true, ftb: enabled, isSimulated: true };
    }
    throw err;
  }
}

/**
 * Step 3: Hardware Projector Pic Mute (shutter beam blanking via /canva/control).
 */
export async function setProjectorPicMute({ muted, pipelineId }) {
  try {
    return await apiRequest("/api/v1/canva/control", {
      method: "POST",
      body: JSON.stringify({
        pipelineId,
        action: "picMute",
        muted,
      }),
    });
  } catch (err) {
    if (CONFIG.isDev) {
      devSimulationState.picMute = muted;
      return { success: true, muted, isSimulated: true };
    }
    throw err;
  }
}

/** DVE transition names advertised by PiGraphics through Pi Gateway. */
export async function listCanvaAnimations() {
  try {
    const data = await apiRequest("/api/v1/canva/animations", { timeoutMs: 5000 });
    const animations = Array.isArray(data?.animations) ? data.animations : [];
    return animations.filter((item) => typeof item === "string" || (item && typeof item.id === "string"));
  } catch (err) {
    if (CONFIG.isDev) return ["none", "fly-left", "fly-right", "fly-bottom", "fly-top", "zoom", "dissolve", "cut"];
    throw err;
  }
}

/**
 * Push transparent graphic still to ATEM Media Pool with Flying Key.
 */
export async function pushCanvaGraphic({
  title,
  image,
  imageUrl,
  movement = "fly-left",
  autoHideMs = 7000,
  keyer = "usk",
  slot = 7,
  useAt = null,
}) {
  try {
    return await apiRequest("/api/v1/graphics/canva/push", {
      method: "POST",
      body: JSON.stringify({
        title,
        image,
        imageUrl,
        movement,
        autoHideMs,
        keyer,
        slot,
        ...(useAt ? { useAt } : {}),
      }),
    });
  } catch (err) {
    if (CONFIG.isDev) {
      console.warn("[canva-pieco-app] Gateway unreachable in dev mode - simulating graphics push:", err.message);
      return {
        ok: true,
        isSimulated: true,
        title: title || "Canva Graphic",
        slot,
        mediaPlayer: 1,
        movement,
        keyer,
        autoHideMs,
      };
    }
    throw err;
  }
}

/**
 * Takes active ATEM graphic keyer (USK or DSK) off air.
 */
export async function setCanvaGraphicOffAir({ keyer = "usk", index = 1 } = {}) {
  try {
    return await apiRequest("/api/v1/graphics/canva/off-air", {
      method: "POST",
      body: JSON.stringify({ keyer, index }),
    });
  } catch (err) {
    if (CONFIG.isDev) {
      console.warn("[canva-pieco-app] Simulating graphic off-air:", err.message);
      return { ok: true, isSimulated: true, offAir: true, keyer, index };
    }
    throw err;
  }
}

/**
 * Health check & status polling.
 */
export async function getGatewayStatus(pipelineId = "pipgm1") {
  try {
    return await apiRequest(`/api/v1/canva/status?pipelineId=${pipelineId}`, { timeoutMs: 3000 });
  } catch (err) {
    if (CONFIG.isDev) {
      return {
        online: false,
        isSimulated: true,
        pipelineId: devSimulationState.pipelineId,
        matrixRoute: devSimulationState.matrixRoute,
        currentSlide: devSimulationState.currentSlide,
        totalSlides: devSimulationState.totalSlides,
        ftb: devSimulationState.ftb,
        picMute: devSimulationState.picMute,
      };
    }
    throw err;
  }
}

const PI_INPUT = { pi1: 3, pi2: 4 };
const PROJECTOR_OUTPUT = { left: 1, right: 2 };

/**
 * The steps of a "Go live" action list: save the slides as the feed's playlist, send the feed to a Pi output,
 * send that Pi output to the left (1) or right (2) projector, cue the first slide, then fade to black or not.
 * The gateway accepts only these step kinds from Canva and checks every value again.
 */
export function buildGoLiveSteps({ itemId, title, feed, piOutput, projector, ftb }) {
  const pipeline = String(feed || "").toUpperCase();
  if (!/^PIPGM[1-3]$/.test(pipeline)) throw new Error("Choose a Pi Program feed (1 to 3).");
  if (!itemId) throw new Error("The slides have no library item yet. Push them again.");
  if (!PI_INPUT[piOutput]) throw new Error("Choose the Pi output (Pi 1 or Pi 2).");
  if (projector !== "none" && !PROJECTOR_OUTPUT[projector]) throw new Error("Choose the left or the right projector.");
  const feedName = `PiPGM${pipeline.slice(-1)}`;
  const steps = [
    { action: "pipgm:playlist-set", params: { feed: feedName, itemIds: [itemId], ...(title ? { name: String(title).slice(0, 120) } : {}) } },
    { action: "pipgm:route", params: { feed: feedName, output: piOutput } },
  ];
  if (projector !== "none") steps.push({ action: "matrix:route", params: { input: PI_INPUT[piOutput], output: PROJECTOR_OUTPUT[projector] } });
  steps.push({ action: "pipgm:control", params: { feed: feedName, action: "gotoItem", itemIndex: 0 } });
  steps.push({ action: "pipgm:ftb", params: { feed: feedName, on: Boolean(ftb) } });
  return steps;
}

/**
 * Saves the Go live action list in the gateway and returns it with the link that runs it. The plugin does not
 * run the list: the link opens picontrol on the church network, which does.
 * Resolves with { id, name, expiresAt, runPath, link }; `link` is a full URL when the gateway or VITE_PICONTROL_URL knows where picontrol is.
 */
export async function createGoLiveList({ itemId, title, feed, piOutput, projector, ftb }) {
  const steps = buildGoLiveSteps({ itemId, title, feed, piOutput, projector, ftb });
  const name = `Go live: ${title || "Canva slides"}`.slice(0, 120);
  let list;
  try {
    list = await apiRequest("/api/v1/canva/action-lists", { method: "POST", body: JSON.stringify({ name, steps }) });
  } catch (err) {
    if (CONFIG.isDev && !(err instanceof GatewayError && err.status >= 400 && err.status < 500)) {
      console.warn("[canva-pieco-app] Gateway unreachable in dev mode - simulating the Go live list:", err.message);
      const id = `sim_${Date.now()}`;
      return { id, name, steps, runPath: `/run/${id}`, link: null, expiresAt: null, isSimulated: true };
    }
    throw err;
  }
  const link = list.link || (CONFIG.picontrolUrl && list.runPath ? `${CONFIG.picontrolUrl}${list.runPath}` : null);
  return { ...list, link };
}

/** Progress of the gateway task: the first 30 % is the download, the rest Pi Program's unpacking and thumbnails. */
export function describeTask(task) {
  const percent = 30 + Math.round(Math.max(0, Math.min(1, task.progress ?? 0)) * 69);
  const dl = task.downloaded || { done: 0, total: task.pageCount || 0 };
  const pics = task.pictures || { done: 0, total: 0 };
  const label =
    task.state === "ready"
      ? "Ready to present"
      : task.state === "downloading" || task.state === "queued"
        ? `Fetching slides from Canva ${dl.done}/${dl.total}`
        : task.state === "unpacking"
          ? "Unpacking slides in Pi Program..."
          : pics.total > 0
            ? `Making thumbnails ${pics.done}/${pics.total}`
            : "Preparing slides...";
  return { percent: task.state === "ready" ? 100 : percent, label };
}
