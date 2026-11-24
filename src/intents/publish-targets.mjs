// Publish targets for the Content Publisher intent. Pure data and checks, no Canva SDK imports,
// so it can be tested in Node.
//
// Rules from Juha (2026-11-09):
// - PiProgram goes to the ATEM or to the vertical projector.
// - PiGraphics is stream only, landscape 1080p only.
// - Saarnavideo is a tentative target: shown, but disabled.
// - Every target needs a name. The date (or date range) for when it is used is optional (Juha 2026-11-19);
//   without one the settings form asks to confirm that the slides are a permanent asset.

export const TARGETS = [
  {
    id: "piprogram",
    displayName: "Keskuskirkko (piProgram)",
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: true,
    autoSize: true,
  },
  {
    id: "pigraphics-stream",
    displayName: "Keskuskirkko (ATEM)",
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: true,
    transparent: true,
  },
  {
    id: "signage",
    kind: "signage",
    label: "Infonäytöt (Sissi)",
    displayName: "Infonäytöt (Sissi)",
    dynamicSize: true,
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: false,
    accepts: { image: { format: "png" }, video: { format: "mp4" } },
  },
  {
    id: "signage-view",
    kind: "signage-view",
    label: "Verkkosivut (Sissi)",
    displayName: "Verkkosivut (Sissi)",
    dynamicSize: true,
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: false,
    accepts: { image: { format: "png" }, video: { format: "mp4" } },
  },
  {
    id: "saarnavideo",
    displayName: "Saarnavideo [later]",
    orientation: "landscape",
    width: 1920,
    height: 1080,
    enabled: false,
  },
];

/** Fallback export size when a screen has no size hint. */
export function signageFallbackSize(orientation) {
  return orientation === "portrait" || orientation === "vertical"
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

function withOptions(target, options) {
  if (target?.kind !== "signage" && target?.kind !== "signage-view") return target;
  return { ...target, enabled: Boolean(String(options?.signageUrl ?? "").trim()) };
}

/** The targets with options applied: signage is enabled only when `options.signageUrl` is set. */
export function getTargets(options) {
  return TARGETS.map((t) => withOptions(t, options));
}

export function targetById(id, options) {
  const stableId = id === "piprogram-atem" || id === "piprogram-vertical-projector" ? "piprogram" : id;
  const t = TARGETS.find((x) => x.id === stableId) ?? null;
  return t ? withOptions(t, options) : null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks the publish settings (stored as the publishRef JSON).
 * Returns { validityState, errors }. validityState is "valid" or "invalid_missing_required_fields".
 */
export function validatePublishSettings(settings, options) {
  const errors = [];
  const target = targetById(settings?.targetId, options);
  if (!target) errors.push("target");
  else if (!target.enabled) errors.push("target_disabled");

  if (!String(settings?.name ?? "").trim()) errors.push("name");

  if (target?.kind === "signage" || target?.kind === "signage-view") {
    errors.push(...validateSignageSettings(settings));
    return {
      validityState: errors.length === 0 ? "valid" : "invalid_missing_required_fields",
      errors,
    };
  }

  const from = settings?.usage?.from ?? "";
  const toRaw = settings?.usage?.to ?? "";
  if (!from && !toRaw) {
    // No date: only fine when the user confirmed a permanent asset.
    if (settings?.permanent !== true) errors.push("permanent");
  } else {
    const to = toRaw || from;
    if (!DATE.test(from) || !DATE.test(to) || to < from) errors.push("date");
  }

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
    const settings = publishRef ? JSON.parse(publishRef) : {};
    if (settings.targetId === "piprogram-atem" || settings.targetId === "piprogram-vertical-projector") settings.targetId = "piprogram";
    return settings;
  } catch {
    return {};
  }
}

/**
 * The body for the gateway push. `useAt` uses the same date syntax as the gateway's parseUseAt
 * (a single date or "YYYY-MM-DD/YYYY-MM-DD" range), `target` says where the slides go, and
 * `orientation` is the gateway's word for it ("landscape" or "portrait"), so Pi Program only makes
 * the export package for that orientation.
 */
export function buildPushPayload(settings, pages) {
  const from = settings.usage?.from ?? "";
  const to = settings.usage?.to || from;
  const target = targetById(settings.targetId);
  const targetId = target?.id === "piprogram" ? "piprogram" : settings.targetId;
  return {
    title: settings.name.trim(),
    target: targetId,
    ...(target && target.id !== "piprogram" ? { orientation: target.orientation === "vertical" ? "portrait" : "landscape" } : {}),
    ...(from ? { useAt: from === to ? from : `${from}/${to}` } : {}),
    pages,
  };
}

// ---- Signage (Sissi) ----

const validSeconds = (v) => Number.isInteger(v) && v >= 1 && v <= 3600;

function validateSignageSettings(settings) {
  const errors = [];
  if (String(settings?.name ?? "").trim().length > 200) errors.push("name");
  const s = settings?.signage ?? {};
  if (!String(s.screenId ?? "").trim()) errors.push("screenId");
  if (settings.targetId === "signage-view") {
    for (const field of ["title", "text", "alt"]) if (typeof s[field] === "string" && s[field].length > 500) errors.push(field);
    if (s.link && (!/^https:\/\//i.test(s.link) || s.link.length > 2048)) errors.push("link");
  }
  const values = [];
  if (s.secondsAll !== undefined && s.secondsAll !== null) values.push(s.secondsAll);
  if (s.secondsByPage && typeof s.secondsByPage === "object") values.push(...Object.values(s.secondsByPage));
  if (!values.every(validSeconds)) errors.push("seconds");
  return errors;
}

const KIND_BY_EXT = { mp4: "video", png: "image", jpg: "image", jpeg: "image", webp: "image" };

/** "image" / "video" when certain (Canva says so, or the URL path extension), else undefined. */
export function signageKindFor(file) {
  if (file?.kind === "image" || file?.kind === "video") return file.kind;
  try {
    const m = /\.([a-z0-9]+)$/i.exec(new URL(file.url).pathname);
    return m ? KIND_BY_EXT[m[1].toLowerCase()] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Body for POST /push. `settings` is { name, signage: { screenId, enableNow, secondsAll, secondsByPage } };
 * `files` are { url, pageNumber?, kind? } in order. Seconds are never sent for video; `kind` only when certain.
 */
export function buildSignagePushPayload(settings, files) {
  const s = settings.signage ?? {};
  return {
    screenId: s.screenId,
    // Always an add. Items go in disabled (content publishing) unless "enable now" is on (a live change).
    mode: "append",
    enabled: s.enableNow === true,
    title: String(settings.name ?? "").trim(),
    pages: files.map((f, i) => {
      const pageNumber = f.pageNumber ?? i + 1;
      const kind = signageKindFor(f);
      const seconds = s.secondsByPage?.[pageNumber] ?? s.secondsAll;
      return {
        pageNumber,
        ...(kind ? { kind } : {}),
        url: f.url,
        ...(settings.targetId === "signage-view" ? {
          alt: String(s.alt || f.name || settings.name || `Page ${pageNumber}`).trim(),
          ...(s.title ? { title: s.title } : {}),
          ...(s.text ? { text: s.text } : {}),
          ...(s.link ? { link: s.link } : {}),
        } : {}),
        ...(kind !== "video" && seconds !== undefined && seconds !== null ? { seconds } : {}),
      };
    }),
  };
}

/** Serialises the signage settings for publishRef. */
export function encodeSignageSettings(sig) {
  const out = { screenId: sig?.screenId ?? "" };
  if (sig?.secondsAll !== undefined) out.secondsAll = sig.secondsAll;
  if (sig?.secondsByPage) out.secondsByPage = sig.secondsByPage;
  if (sig?.enableNow) out.enableNow = true;
  for (const key of ["alt", "title", "text", "link"]) if (sig?.[key]) out[key] = sig[key];
  return JSON.stringify(out);
}

export function parseSignageSettings(text) {
  let o;
  try {
    o = typeof text === "string" ? JSON.parse(text) : text;
  } catch {
    o = null;
  }
  if (!o || typeof o !== "object") o = {};
  return {
    screenId: typeof o.screenId === "string" ? o.screenId : "",
    ...(o.secondsAll !== undefined ? { secondsAll: o.secondsAll } : {}),
    secondsByPage: o.secondsByPage && typeof o.secondsByPage === "object" ? o.secondsByPage : {},
    // publishRefs from before 2026-11-23 may hold mode/confirmReplace; they are ignored (nothing goes live by itself).
    enableNow: o.enableNow === true,
    ...(typeof o.alt === "string" ? { alt: o.alt } : {}),
    ...(typeof o.title === "string" ? { title: o.title } : {}),
    ...(typeof o.text === "string" ? { text: o.text } : {}),
    ...(typeof o.link === "string" ? { link: o.link } : {}),
  };
}
