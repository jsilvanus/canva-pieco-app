import { CONFIG, normalizeGatewayUrl } from "../config.mjs";
import { getBearerToken } from "./auth.mjs";

/**
 * @typedef {Object} ServiceAuth
 * @property {'none' | 'api_key' | 'bearer' | 'oidc'} type
 * @property {string} [client_id]
 * @property {string[]} [scopes]
 * @property {string} [audience]
 * @property {string} [header_name]
 */

/**
 * @typedef {Object} DiscoveredService
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} venue
 * @property {string} url
 * @property {ServiceAuth} [auth]
 * @property {string[]} [capabilities]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} PiSystemEndpoint
 * @property {string} id
 * @property {string} name
 * @property {string} gatewayUrl
 * @property {'configured' | 'discovered'} source
 * @property {string} [venue]
 * @property {string} [location]
 * @property {boolean} [online]
 * @property {string} [type]
 * @property {ServiceAuth} [auth]
 * @property {string[]} [capabilities]
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * Queries Tunnus Discovery API (`/api/v1/discovery`) for active Pi systems / PiProgram endpoints,
 * passing the user's Tunnus Bearer token for access and tenant context.
 * Always includes the primary configured gateway as the fallback entry.
 *
 * @param {Object} [options]
 * @param {string} [options.discoveryUrl]
 * @param {string} [options.gatewayUrl]
 * @param {string} [options.serviceType='piprogram']
 * @param {typeof fetch} [options.fetch]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<PiSystemEndpoint[]>}
 */
export async function listPiSystems({
  discoveryUrl = CONFIG.piDiscoveryUrl || CONFIG.tunnusUrl,
  gatewayUrl = CONFIG.gatewayUrl,
  serviceType = "piprogram",
  fetch: fetchFn = globalThis.fetch,
  signal,
} = {}) {
  const normalizedGateway = normalizeGatewayUrl(gatewayUrl) || gatewayUrl;
  const systems = [
    {
      id: "primary",
      name: "Keskuskirkko (Primary Gateway)",
      gatewayUrl: normalizedGateway,
      source: "configured",
      venue: "keskuskirkko",
      online: true,
      type: "piprogram",
    },
  ];

  const normalizedDiscovery = normalizeGatewayUrl(discoveryUrl);
  if (!normalizedDiscovery || typeof fetchFn !== "function") {
    return systems;
  }

  const token = await getBearerToken().catch(() => null);
  const headers = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Tunnus Discovery contract:
  // 1. /api/v1/discovery?type=piprogram
  // 2. /api/v1/discovery/piprogram
  // 3. /api/v1/discovery (unfiltered)
  // 4. Fallback legacy /api/v1/pi-systems and /api/v1/systems
  const candidatePaths = [
    `/api/v1/discovery?type=${encodeURIComponent(serviceType)}`,
    `/api/v1/discovery/${encodeURIComponent(serviceType)}`,
    "/api/v1/discovery",
    "/api/v1/pi-systems",
    "/api/v1/systems",
  ];

  for (const path of candidatePaths) {
    try {
      const res = await fetchFn(`${normalizedDiscovery}${path}`, {
        method: "GET",
        headers,
        signal,
      });
      if (!res.ok) continue;
      const body = await res.json();

      /** @type {any[]} */
      let list = [];
      if (Array.isArray(body)) {
        list = body;
      } else if (Array.isArray(body?.services)) {
        // Tunnus OpenAPI DiscoveryResponse schema: { updated_at: string, services: DiscoveredService[] }
        list = body.services;
      } else if (Array.isArray(body?.items)) {
        list = body.items;
      } else if (Array.isArray(body?.systems)) {
        list = body.systems;
      }

      if (!list.length) continue;

      const seenUrls = new Set([normalizedGateway]);
      for (const entry of list) {
        if (!entry || typeof entry !== "object") continue;

        // If from general discovery without type query, filter by type if present
        if (entry.type && serviceType && entry.type !== serviceType && entry.type !== "pigateway") {
          continue;
        }

        const rawUrl = entry.endpoint_url || entry.url || entry.gatewayUrl || entry.tunnelUrl;
        const url = normalizeGatewayUrl(rawUrl);
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        systems.push({
          id: String(entry.id || url),
          name: String(entry.name || entry.label || entry.title || url),
          gatewayUrl: url,
          source: "discovered",
          venue: typeof entry.venue === "string" ? entry.venue : undefined,
          location: typeof entry.location === "string" ? entry.location : typeof entry.venue === "string" ? entry.venue : undefined,
          online: typeof entry.online === "boolean" ? entry.online : true,
          type: typeof entry.type === "string" ? entry.type : serviceType,
          auth: entry.auth && typeof entry.auth === "object" ? entry.auth : undefined,
          capabilities: Array.isArray(entry.capabilities) ? entry.capabilities : undefined,
          metadata: entry.metadata && typeof entry.metadata === "object" ? entry.metadata : undefined,
        });
      }

      if (systems.length > 1) {
        break; // Successfully discovered additional systems
      }
    } catch {
      // Continue to next candidate
    }
  }

  return systems;
}

/**
 * Resolves the absolute upload URL for an export target based on target.ingest and parent service URL.
 * Follows the Tunnus Discovery convention:
 * 1. If target.ingest.url is absolute (https://...), use directly.
 * 2. If target.ingest.path is relative (/api/v1/...), resolve against service root.
 *
 * @param {any} target
 * @param {any} service
 * @returns {string}
 */
export function resolveExportTargetIngestUrl(target, service) {
  if (!target?.ingest) return "";
  const rawUrl = target.ingest.url;
  if (typeof rawUrl === "string" && /^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }
  const baseUrl = service?.endpoint_url || service?.gatewayUrl || service?.url || "";
  const path = target.ingest.path || "";
  if (!baseUrl) return path;

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Resolves the authentication parameters for an export target, inheriting from parent service auth.
 *
 * @param {any} target
 * @param {any} service
 * @returns {ServiceAuth}
 */
export function resolveExportTargetAuth(target, service) {
  return target?.ingest?.auth || service?.auth || { type: "none" };
}

/**
 * Discovers export targets across all active parish services registered in Tunnus.
 * Parses the flattened `metadata.export_targets` list and applies URL resolution and auth inheritance.
 *
 * @param {Object} [options]
 * @param {string} [options.discoveryUrl]
 * @param {string} [options.category] Optional filter (e.g. 'slides', 'signage', 'broadcast')
 * @param {typeof fetch} [options.fetch]
 * @param {AbortSignal} [options.signal]
 */
export async function listDiscoveredExportTargets({
  discoveryUrl = CONFIG.piDiscoveryUrl || CONFIG.tunnusUrl,
  category,
  fetch: fetchFn = globalThis.fetch,
  signal,
} = {}) {
  const normalizedDiscovery = normalizeGatewayUrl(discoveryUrl);
  if (!normalizedDiscovery || typeof fetchFn !== "function") {
    return [];
  }

  const token = await getBearerToken().catch(() => null);
  const headers = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetchFn(`${normalizedDiscovery}/api/v1/discovery?capability=export_target`, {
      method: "GET",
      headers,
      signal,
    });
    if (!res.ok) return [];
    const body = await res.json();
    const services = Array.isArray(body?.services)
      ? body.services
      : Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body)
      ? body
      : [];

    const resolvedTargets = [];
    for (const service of services) {
      if (!service || typeof service !== "object") continue;
      const targets = service.metadata?.export_targets;
      if (!Array.isArray(targets)) continue;

      for (const target of targets) {
        if (!target || typeof target !== "object") continue;
        if (category && target.category && target.category !== category) continue;

        resolvedTargets.push({
          targetId: target.id,
          serviceId: service.id,
          serviceName: service.name,
          venue: service.venue,
          name: target.name || target.id,
          category: target.category || "slides",
          aspectRatio: target.aspect_ratio || "16:9",
          resolution: target.resolution || { width: 1920, height: 1080 },
          formats: Array.isArray(target.formats) ? target.formats : ["png"],
          multiPage: Boolean(target.multi_page),
          alphaChannel: Boolean(target.alpha_channel),
          ingestUrl: resolveExportTargetIngestUrl(target, service),
          method: target.ingest?.method || "POST",
          auth: resolveExportTargetAuth(target, service),
          prefillRules: target.prefill_rules || { extract_text: false },
        });
      }
    }
    return resolvedTargets;
  } catch {
    return [];
  }
}
