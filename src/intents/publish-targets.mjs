// Publish targets for the Content Publisher intent. Pure data and checks, no Canva SDK imports,
// so it can be tested in Node.
//
// Rules from Juha (2026-11-09):
// - PiProgram goes to the ATEM or to the vertical projector.
// - PiGraphics is stream only, landscape 1080p only.
// - Saarnavideo is a tentative target: shown, but disabled.
// - Every target needs a name and a date (or a date range) for when it is used.

export const TARGETS = [
  {
    id: "piprogram-atem",
    displayName: "PiProgram → ATEM",
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: true,
  },
  {
    id: "piprogram-vertical-projector",
    displayName: "PiProgram → vertical projector",
    orientation: "vertical",
    width: 1080,
    height: 1920,
    enabled: true,
  },
  {
    id: "pigraphics-stream",
    displayName: "PiGraphics → stream",
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: true,
  },
  {
    id: "saarnavideo",
    displayName: "Saarnavideo (later)",
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: false,
  },
];

export function targetById(id) {
  return TARGETS.find((t) => t.id === id) ?? null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks the publish settings (stored as the publishRef JSON).
 * Returns { validityState, errors }. validityState is "valid" or "invalid_missing_required_fields".
 */
export function validatePublishSettings(settings) {
  const errors = [];
  const target = targetById(settings?.targetId);
  if (!target) errors.push("target");
  else if (!target.enabled) errors.push("target_disabled");

  if (!String(settings?.name ?? "").trim()) errors.push("name");

  const from = settings?.usage?.from ?? "";
  const to = settings?.usage?.to ?? from;
  if (!DATE.test(from) || !DATE.test(to) || to < from) errors.push("date");

  return {
    validityState: errors.length === 0 ? "valid" : "invalid_missing_required_fields",
    errors,
  };
}

/** Serialises settings for Canva's publishRef (max 32 KB by Canva's rules; ours is tiny). */
export function encodePublishRef(settings) {
  return JSON.stringify(settings);
}

export function decodePublishRef(publishRef) {
  try {
    return publishRef ? JSON.parse(publishRef) : {};
  } catch {
    return {};
  }
}

/**
 * The body for the gateway push. `useAt` uses the same date syntax as the gateway's parseUseAt
 * (a single date or "YYYY-MM-DD/YYYY-MM-DD" range), `target` says where the slides go.
 */
export function buildPushPayload(settings, pages) {
  const from = settings.usage.from;
  const to = settings.usage.to ?? from;
  return {
    title: settings.name.trim(),
    target: settings.targetId,
    useAt: from === to ? from : `${from}/${to}`,
    pages,
  };
}
