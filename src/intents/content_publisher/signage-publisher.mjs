import { CONFIG } from "../../config.mjs";
import { describeSignagePush, pushSignage, SignageError, waitForSignagePush } from "../../services/signage-api.mjs";
import {
  buildSignagePushPayload,
  decodePublishRef,
  encodeSignageSettings,
  parseSignageSettings,
  signageFallbackSize,
  targetById,
  validatePublishSettings,
} from "../publish-targets.mjs";

const DRAFT_STORAGE_KEY = "canva-pieco-app.signage-draft";
const DRAFT_CHANNEL = "canva-pieco-app.signage-draft";

/**
 * Pure helpers and orchestration for the Signage (Sissi) Content Publisher UI and publish flow.
 * Kept free of Canva SDK and React imports so Node tests can exercise all logic directly.
 */

export function isSignageTarget(target) {
  return target?.kind === "signage" || target?.kind === "signage-view";
}

export function screenTargetDimensions(screen) {
  const orientation =
    screen?.orientation === "vertical" || screen?.orientation === "portrait" ? "vertical" : "landscape";
  const fallback = signageFallbackSize(orientation);
  return {
    orientation,
    width: typeof screen?.width === "number" && screen.width > 0 ? screen.width : fallback.width,
    height: typeof screen?.height === "number" && screen.height > 0 ? screen.height : fallback.height,
  };
}

export function formatScreenOptionLabel(screen) {
  const { orientation, width, height } = screenTargetDimensions(screen);
  return `${screen.name} (${orientation}, ${width} × ${height})`;
}

export function findScreenById(screens, screenId) {
  if (!Array.isArray(screens) || !screenId) return null;
  return screens.find((s) => s.id === screenId) ?? null;
}

/** Pure state transitions for the screen picker list. */
export function screenListInitialState() {
  return { status: "loading", screens: [], error: null, refreshRequired: false };
}

export function screenListLoaded(screens) {
  return { status: "ready", screens: Array.isArray(screens) ? screens : [], error: null, refreshRequired: false };
}

export function screenListFailed(error) {
  const message = error instanceof Error ? error.message : String(error);
  const refreshRequired = error instanceof SignageError ? error.refreshScreens : false;
  return { status: "error", screens: [], error: message, refreshRequired };
}

/** True when an appDefinedPayload from publishContent indicates SCREEN_NOT_FOUND. */
export function isScreenNotFoundPayload(payload) {
  if (!payload) return false;
  return payload.includes("SCREEN_NOT_FOUND") || payload.toLowerCase().includes("screen no longer exists");
}

/** Merges a patch into `settings.signage`, normalizing via encode/parseSignageSettings. */
export function mergeSignageSettings(prevSettings, patch) {
  const current = parseSignageSettings(prevSettings?.signage);
  const next = { ...current, ...patch };
  if (patch.secondsAll === undefined || patch.secondsAll === null || Number.isNaN(patch.secondsAll)) {
    delete next.secondsAll;
  }
  const normalized = parseSignageSettings(encodeSignageSettings(next));
  return { ...prevSettings, signage: normalized };
}

export function updatePageSeconds(secondsByPage, pageNumber, value) {
  const next = { ...(secondsByPage && typeof secondsByPage === "object" ? secondsByPage : {}) };
  if (value === undefined || value === null || Number.isNaN(value)) {
    delete next[String(pageNumber)];
  } else {
    next[String(pageNumber)] = value;
  }
  return next;
}

export function isValidSecondsValue(value) {
  return Number.isInteger(value) && value >= 1 && value <= 3600;
}

/** Checks whether a video duration in ms exceeds the screen's maxVideoSeconds limit. */
export function isVideoTooLong(durationMs, maxVideoSeconds) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) return false;
  if (typeof maxVideoSeconds !== "number" || !Number.isFinite(maxVideoSeconds)) return false;
  return durationMs > maxVideoSeconds * 1000;
}

/** Formats video duration in ms as whole seconds, or returns null when unknown. */
export function formatDurationSeconds(durationMs) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) return null;
  return Math.max(1, Math.round(durationMs / 1000));
}

/**
 * Computes preview warnings for a signage screen:
 * - sizeMismatch: first preview whose aspect ratio differs by > 1% from the screen (or fallback)
 * - videoTooLongPages: 1-based page numbers whose durationMs exceeds screen.maxVideoSeconds
 */
export function computeSignageWarnings(previews, screen) {
  const { width: targetWidth, height: targetHeight } = screenTargetDimensions(screen);
  let sizeMismatch = null;
  const videoTooLongPages = [];

  for (let i = 0; i < previews.length; i += 1) {
    const p = previews[i];
    if (
      !sizeMismatch &&
      typeof p?.widthPx === "number" &&
      typeof p?.heightPx === "number" &&
      Math.abs(p.widthPx * targetHeight - p.heightPx * targetWidth) > 0.01 * p.heightPx * targetWidth
    ) {
      sizeMismatch = { widthPx: p.widthPx, heightPx: p.heightPx, targetWidth, targetHeight };
    }
    if (p?.kind === "video" && isVideoTooLong(p.durationMs, screen?.maxVideoSeconds ?? null)) {
      videoTooLongPages.push(i + 1);
    }
  }

  return { sizeMismatch, videoTooLongPages };
}

/**
 * Cross-iframe draft sync for `secondsByPage` (Preview UI -> Settings UI), since Canva's
 * RenderPreviewUiRequest does not expose `updatePublishSettings`.
 */
export function writeDraftSecondsByPage(secondsByPage) {
  const payload = JSON.stringify({ secondsByPage: secondsByPage ?? {} });
  try {
    globalThis.localStorage?.setItem(DRAFT_STORAGE_KEY, payload);
  } catch {
    // ignore storage errors
  }
  try {
    if (typeof globalThis.BroadcastChannel === "function") {
      const ch = new globalThis.BroadcastChannel(DRAFT_CHANNEL);
      ch.postMessage({ secondsByPage: secondsByPage ?? {} });
      ch.close();
    }
  } catch {
    // ignore channel errors
  }
}

export function readDraftSecondsByPage() {
  try {
    const raw = globalThis.localStorage?.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.secondsByPage && typeof parsed.secondsByPage === "object" ? parsed.secondsByPage : null;
  } catch {
    return null;
  }
}

export function subscribeDraftSecondsByPage(onChange) {
  const cleanups = [];
  try {
    if (typeof globalThis.BroadcastChannel === "function") {
      const ch = new globalThis.BroadcastChannel(DRAFT_CHANNEL);
      ch.onmessage = (event) => {
        if (event?.data?.secondsByPage && typeof event.data.secondsByPage === "object") {
          onChange(event.data.secondsByPage);
        }
      };
      cleanups.push(() => ch.close());
    }
  } catch {
    // ignore
  }
  try {
    if (typeof globalThis.addEventListener === "function") {
      const handler = (event) => {
        if (event?.key === DRAFT_STORAGE_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed?.secondsByPage && typeof parsed.secondsByPage === "object") {
              onChange(parsed.secondsByPage);
            }
          } catch {
            // ignore
          }
        }
      };
      globalThis.addEventListener("storage", handler);
      cleanups.push(() => globalThis.removeEventListener("storage", handler));
    }
  } catch {
    // ignore
  }
  return () => {
    for (const fn of cleanups) fn();
  };
}

function fileKindHint(file) {
  if (file?.format === "mp4") return "video";
  if (file?.format === "png" || file?.format === "jpg") return "image";
  return undefined;
}

/**
 * Orchestrates publishing to Signage (Sissi).
 * Returns a Canva PublishContentResponse (`completed` or `app_error`).
 */
export async function publishSignageContent(
  { outputMedia, outputType, publishRef },
  deps = {},
) {
  const signageUrl = deps.signageUrl ?? CONFIG.signageUrl;
  const pushFn = deps.pushSignage ?? pushSignage;
  const waitFn = deps.waitForSignagePush ?? waitForSignagePush;
  const onProgress = deps.onProgress;

  const settings = { ...decodePublishRef(publishRef), targetId: outputType.id };
  const check = validatePublishSettings(settings, { signageUrl });
  if (check.validityState !== "valid") {
    return {
      status: "app_error",
      message: `Publish settings are incomplete: ${check.errors.join(", ")}.`,
      appDefinedPayload: check.errors.join(","),
    };
  }
  if (targetById(outputType.id, { signageUrl })?.enabled !== true) {
    return { status: "app_error", message: "Signage is not available yet." };
  }

  const files = (outputMedia ?? [])
    .flatMap((media) => media.files ?? [])
    .map((file, index) => ({
      url: file.url,
      pageNumber: index + 1,
      kind: fileKindHint(file),
    }));
  if (files.length === 0) {
    return { status: "app_error", message: "No slides were exported from Canva." };
  }

  try {
    const payload = buildSignagePushPayload(settings, files);
    const accepted = await pushFn(payload);
    const finalStatus = await waitFn(accepted.pushId, {
      onProgress: (progress) => {
        if (onProgress) onProgress({ ...progress, label: describeSignagePush(progress.status) });
      },
    });
    return { status: "completed", externalId: finalStatus.pushId };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      status: "app_error",
      message: `Could not send to signage: ${detail}`,
      appDefinedPayload: detail.slice(0, 300),
    };
  }
}
