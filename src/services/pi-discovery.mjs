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

        const rawUrl = entry.url || entry.gatewayUrl || entry.tunnelUrl;
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
