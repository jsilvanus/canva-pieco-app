import { CONFIG, normalizeGatewayUrl } from "../config.mjs";
import { getBearerToken } from "./auth.mjs";
import { isRunningInCanva } from "./canva-sdk.mjs";

const DEFAULT_VALOPANKKI_BASE = "https://kehitys.riihimaenseurakunta.fi/valopankki";
const DESIGN_ASSETS_PREFIX = "canva-pieco-app.design-assets.";

const memoryDesignAssets = new Map();

export function recordAssetUsedInDesign(designId, assetId) {
  if (!designId || !assetId) return;
  const list = memoryDesignAssets.get(designId) || [];
  if (!list.includes(String(assetId))) list.push(String(assetId));
  memoryDesignAssets.set(designId, list);

  try {
    const key = `${DESIGN_ASSETS_PREFIX}${designId}`;
    globalThis.localStorage?.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getAssetsUsedInDesign(designId) {
  if (!designId) return [];
  try {
    const key = `${DESIGN_ASSETS_PREFIX}${designId}`;
    const raw = globalThis.localStorage?.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return memoryDesignAssets.get(designId) || [];
}

export function clearAssetsUsedInDesign(designId) {
  if (!designId) return;
  const key = `${DESIGN_ASSETS_PREFIX}${designId}`;
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // ignore
  }
  memoryDesignAssets.delete(designId);
}

function resolveApiBase(customUrl) {
  const base = normalizeGatewayUrl(customUrl) || normalizeGatewayUrl(CONFIG.valopankkiUrl) || DEFAULT_VALOPANKKI_BASE;
  // Ensure we don't duplicate /api/canva/v1
  const clean = base.replace(/\/api\/canva\/v1\/?$/, "").replace(/\/+$/, "");
  return `${clean}/api/canva/v1`;
}

async function buildHeaders(parishSlug) {
  const headers = {
    Accept: "application/json",
  };
  const token = await getBearerToken().catch(() => null);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (parishSlug) {
    headers["X-Parish-Slug"] = parishSlug;
  }
  return headers;
}

/**
 * Retrieves the active brand kit from Valopankki.
 */
export async function getValopankkiBrandKit({
  valopankkiUrl,
  parishSlug,
  fetch: fetchFn = globalThis.fetch,
  signal,
} = {}) {
  const apiBase = resolveApiBase(valopankkiUrl);
  const headers = await buildHeaders(parishSlug);

  try {
    const res = await fetchFn(`${apiBase}/brand-kit`, {
      method: "GET",
      headers,
      signal,
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 401) return null;
      throw new Error(`Valopankki brand-kit error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    return null;
  }
}

/**
 * Lists thematic collections from Valopankki.
 */
export async function listValopankkiCollections({
  type = "all",
  valopankkiUrl,
  parishSlug,
  fetch: fetchFn = globalThis.fetch,
  signal,
} = {}) {
  const apiBase = resolveApiBase(valopankkiUrl);
  const headers = await buildHeaders(parishSlug);
  const params = new URLSearchParams();
  if (type && type !== "all") {
    params.set("type", type);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetchFn(`${apiBase}/collections${query}`, {
    method: "GET",
    headers,
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to list collections: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data?.collections) ? data.collections : [];
}

/**
 * Searches and lists assets from Valopankki for the media grid.
 */
export async function searchValopankkiAssets({
  search = "",
  kind,
  format,
  collectionId,
  brandKitOnly,
  page = 1,
  limit = 20,
  valopankkiUrl,
  parishSlug,
  fetch: fetchFn = globalThis.fetch,
  signal,
} = {}) {
  const apiBase = resolveApiBase(valopankkiUrl);
  const headers = await buildHeaders(parishSlug);
  const params = new URLSearchParams();

  if (search.trim()) params.set("search", search.trim());
  if (kind && kind !== "all") params.set("kind", kind);
  if (format && format !== "all") params.set("format", format);
  if (collectionId) params.set("collectionId", collectionId);
  if (brandKitOnly) params.set("brandKitOnly", "true");
  if (page > 1) params.set("page", String(page));
  if (limit) params.set("limit", String(Math.min(limit, 50)));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetchFn(`${apiBase}/assets${query}`, {
    method: "GET",
    headers,
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Valopankki assets: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pagination: data?.pagination || { page, limit, totalItems: data?.items?.length || 0, totalPages: 1 },
  };
}

/**
 * Records usage in Valopankki and retrieves the high-resolution asset download URL.
 * Supports action: 'inserted' (when adding to canvas) or 'exported' (when design is published).
 */
export async function useValopankkiAsset(
  assetIdOrUrl,
  usageData = {},
  {
    valopankkiUrl,
    parishSlug,
    fetch: fetchFn = globalThis.fetch,
    signal,
  } = {}
) {
  const apiBase = resolveApiBase(valopankkiUrl);
  const headers = await buildHeaders(parishSlug);
  headers["Content-Type"] = "application/json";

  const url = String(assetIdOrUrl).startsWith("http")
    ? assetIdOrUrl
    : `${apiBase}/assets/${encodeURIComponent(assetIdOrUrl)}/use`;

  const payload = {
    canvaDesignId: usageData.canvaDesignId,
    canvaDesignTitle: usageData.canvaDesignTitle,
    channel: usageData.channel || "canva",
    action: usageData.action || "inserted",
    exportTarget: usageData.exportTarget,
  };

  const res = await fetchFn(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to record Valopankki asset use: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Reports when a Canva design containing Valopankki assets is exported or published.
 * Calls `POST /api/canva/v1/audit/export` with fallback to individual `/use` calls.
 */
export async function reportValopankkiExport(
  {
    canvaDesignId,
    canvaDesignTitle,
    exportTarget,
    assetIds,
    exportedAt = new Date().toISOString(),
  },
  {
    valopankkiUrl,
    parishSlug,
    fetch: fetchFn = globalThis.fetch,
    signal,
  } = {}
) {
  if (!canvaDesignId) return { recorded: 0, success: false };

  const knownAssetIds = assetIds && assetIds.length > 0 ? assetIds : getAssetsUsedInDesign(canvaDesignId);
  const apiBase = resolveApiBase(valopankkiUrl);
  const headers = await buildHeaders(parishSlug);
  headers["Content-Type"] = "application/json";

  try {
    // 1. Try dedicated batch export report endpoint
    const res = await fetchFn(`${apiBase}/audit/export`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        canvaDesignId,
        canvaDesignTitle,
        channel: "canva",
        exportTarget,
        assetIds: knownAssetIds,
        exportedAt,
      }),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      return { recorded: data?.recorded ?? knownAssetIds.length, success: true };
    }

    // 2. Fallback to individual asset usage calls if audit endpoint returns 404
    if (res.status === 404 && knownAssetIds.length > 0) {
      let recorded = 0;
      for (const assetId of knownAssetIds) {
        try {
          await useValopankkiAsset(assetId, {
            canvaDesignId,
            canvaDesignTitle,
            channel: "canva",
            action: "exported",
            exportTarget,
          }, { valopankkiUrl, parishSlug, fetch: fetchFn, signal });
          recorded++;
        } catch {
          // continue
        }
      }
      return { recorded, success: recorded > 0 };
    }
  } catch {
    // Network failure or offline - do not break export
  }

  return { recorded: 0, success: false };
}

/**
 * Full workflow: logs insertion usage to Valopankki, uploads into Canva via `@canva/asset`,
 * records asset-to-design association, and places the element on the user's canvas.
 */
export async function insertValopankkiAssetIntoDesign(
  asset,
  designContext = {},
  options = {}
) {
  const assetId = asset.id || (typeof asset.useUrl === "string" ? asset.useUrl.split("/").pop() : "asset");
  if (designContext.designId && assetId) {
    recordAssetUsedInDesign(designContext.designId, assetId);
  }

  if (!isRunningInCanva()) {
    return { status: "simulated", usageId: "simulated-usage-id" };
  }

  // 1. Notify Valopankki & get high-res download URL
  const targetIdOrUrl = asset.useUrl || asset.id;
  const usageResult = await useValopankkiAsset(targetIdOrUrl, {
    canvaDesignId: designContext.designId,
    canvaDesignTitle: designContext.title,
    channel: "canva",
    action: "inserted",
  }, options);

  const downloadUrl = usageResult?.asset?.downloadUrl || asset.useUrl || asset.thumbnailUrl;
  const mimeType = usageResult?.asset?.mimeType || asset.mimeType || "image/png";

  // 2. Upload into Canva session
  const [{ upload }, { addElementAtCursor, addElementAtPoint }, { features }] = await Promise.all([
    import("@canva/asset"),
    import("@canva/design"),
    import("@canva/platform"),
  ]);

  const imageRef = await upload({
    type: "image",
    mimeType: mimeType === "image/svg+xml" ? "image/svg+xml" : mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
    url: downloadUrl,
    thumbnailUrl: asset.thumbnailUrl || downloadUrl,
  });

  // 3. Place on the user's canvas
  if (features.isSupported(addElementAtCursor)) {
    await addElementAtCursor({
      type: "image",
      ref: imageRef.ref,
    });
    return { status: "completed", usageId: usageResult.usageId };
  }

  if (features.isSupported(addElementAtPoint)) {
    await addElementAtPoint({
      type: "image",
      ref: imageRef.ref,
    });
    return { status: "completed", usageId: usageResult.usageId };
  }

  return { status: "unsupported", usageId: usageResult.usageId };
}
