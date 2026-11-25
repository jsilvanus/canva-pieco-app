import test from "node:test";
import assert from "node:assert/strict";
import {
  listPiSystems,
  resolveExportTargetIngestUrl,
  resolveExportTargetAuth,
  listDiscoveredExportTargets,
} from "../src/services/pi-discovery.mjs";
import {
  getValopankkiBrandKit,
  listValopankkiCollections,
  searchValopankkiAssets,
  useValopankkiAsset,
  recordAssetUsedInDesign,
  getAssetsUsedInDesign,
  getTrackedDesignAssets,
  removeAssetFromDesign,
  clearAssetsUsedInDesign,
  reportValopankkiExport,
} from "../src/services/valopankki-api.mjs";
import { inspectCurrentDesignElements } from "../src/services/canva-sdk.mjs";
import {
  getOverwriteTarget,
  setOverwriteTarget,
  clearOverwriteTarget,
  listPiProgramItems,
} from "../src/services/gateway-api.mjs";

test("listPiSystems discovers services via Tunnus OpenAPI /api/v1/discovery", async () => {
  const mockDiscoveryResponse = {
    updated_at: "2026-11-25T15:00:00Z",
    services: [
      {
        id: "keskuskirkko-piprogram",
        name: "Keskuskirkko — Sali (Pi Program)",
        type: "piprogram",
        venue: "keskuskirkko",
        url: "https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443",
        auth: {
          type: "api_key",
          header_name: "X-API-Key",
        },
        capabilities: ["slides", "stage_display"],
      },
      {
        id: "kappeli-piprogram",
        name: "Kappeli (Pi Program)",
        type: "piprogram",
        venue: "kappeli",
        url: "https://gateway.kappeli.riihimaenseurakunta.fi:8443",
        auth: {
          type: "none",
        },
        capabilities: ["slides"],
      },
    ],
  };

  const mockFetch = async (url) => {
    if (url.includes("/api/v1/discovery")) {
      return {
        ok: true,
        status: 200,
        json: async () => mockDiscoveryResponse,
      };
    }
    return { ok: false, status: 404 };
  };

  const systems = await listPiSystems({
    discoveryUrl: "https://tunnus.riihimaenseurakunta.fi",
    gatewayUrl: "https://gateway.local:8443",
    fetch: mockFetch,
  });

  assert.equal(systems.length, 3); // primary + 2 discovered
  assert.equal(systems[0].id, "primary");
  assert.equal(systems[1].id, "keskuskirkko-piprogram");
  assert.equal(systems[1].venue, "keskuskirkko");
  assert.equal(systems[2].id, "kappeli-piprogram");
  assert.equal(systems[2].venue, "kappeli");
});

test("listPiSystems falls back gracefully when discovery is offline", async () => {
  const mockFetch = async () => {
    throw new Error("Network unreachable");
  };

  const systems = await listPiSystems({
    discoveryUrl: "https://offline.tunnus.local",
    gatewayUrl: "https://gateway.local:8443",
    fetch: mockFetch,
  });

  assert.equal(systems.length, 1);
  assert.equal(systems[0].id, "primary");
  assert.equal(systems[0].gatewayUrl, "https://gateway.local:8443");
});

test("getValopankkiBrandKit parses brand kit response", async () => {
  const mockBrandKit = {
    id: "b08a9c2e-f782-441d-91b7-a36c61fcf110",
    parishName: "Riihimäen seurakunta",
    parishSlug: "riihimaki",
    colors: [
      { name: "Pääväri", hex: "#0D2C54", role: "primary" },
      { name: "Kultakeltainen", hex: "#F4B41A", role: "secondary" },
    ],
    fonts: [{ name: "Heading", family: "Lora", style: "serif" }],
    logos: [
      {
        assetId: "logo-1",
        title: "Päälogo",
        format: "svg",
        mimeType: "image/svg+xml",
        thumbnailUrl: "https://valopankki.local/thumb.png",
        useUrl: "https://valopankki.local/use/logo-1",
      },
    ],
  };

  const mockFetch = async (url) => {
    if (url.includes("/brand-kit")) {
      return { ok: true, status: 200, json: async () => mockBrandKit };
    }
    return { ok: false, status: 404 };
  };

  const kit = await getValopankkiBrandKit({
    valopankkiUrl: "https://valopankki.local",
    fetch: mockFetch,
  });

  assert.ok(kit);
  assert.equal(kit.parishName, "Riihimäen seurakunta");
  assert.equal(kit.colors.length, 2);
  assert.equal(kit.logos[0].assetId, "logo-1");
});

test("searchValopankkiAssets passes filters and parses pagination", async () => {
  const mockAssets = {
    items: [
      {
        id: "asset-1",
        title: "Risti",
        kind: "symbol",
        format: "svg",
        mimeType: "image/svg+xml",
        isBrandAsset: true,
        tags: ["risti"],
        thumbnailUrl: "https://valopankki.local/thumb.webp",
        useUrl: "https://valopankki.local/use/asset-1",
      },
    ],
    pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  };

  let requestedUrl = "";
  const mockFetch = async (url) => {
    requestedUrl = url;
    return { ok: true, status: 200, json: async () => mockAssets };
  };

  const res = await searchValopankkiAssets({
    search: "risti",
    kind: "symbol",
    valopankkiUrl: "https://valopankki.local",
    fetch: mockFetch,
  });

  assert.ok(requestedUrl.includes("search=risti"));
  assert.ok(requestedUrl.includes("kind=symbol"));
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].title, "Risti");
});

test("useValopankkiAsset posts usage log and retrieves asset downloadUrl", async () => {
  let postedBody = null;
  const mockUsageResponse = {
    usageId: "usage-123",
    asset: {
      id: "asset-1",
      title: "Risti",
      format: "svg",
      mimeType: "image/svg+xml",
      width: 1200,
      height: 1200,
      downloadUrl: "https://s3.local/signed/risti.svg",
    },
    recordedAt: "2026-11-25T17:00:00Z",
  };

  const mockFetch = async (url, options) => {
    postedBody = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => mockUsageResponse };
  };

  const result = await useValopankkiAsset(
    "asset-1",
    { canvaDesignId: "DAG12345", canvaDesignTitle: "Adventti", action: "inserted" },
    { valopankkiUrl: "https://valopankki.local", fetch: mockFetch }
  );

  assert.equal(postedBody.canvaDesignId, "DAG12345");
  assert.equal(postedBody.canvaDesignTitle, "Adventti");
  assert.equal(postedBody.channel, "canva");
  assert.equal(postedBody.action, "inserted");
  assert.equal(result.usageId, "usage-123");
  assert.equal(result.asset.downloadUrl, "https://s3.local/signed/risti.svg");
});

test("design assets tracking records, retrieves, and clears asset usage in design", () => {
  const designId = "DAG_TEST_DESIGN_1";
  clearAssetsUsedInDesign(designId);
  assert.deepEqual(getAssetsUsedInDesign(designId), []);

  recordAssetUsedInDesign(designId, "asset-cross-1");
  recordAssetUsedInDesign(designId, "asset-logo-2");
  recordAssetUsedInDesign(designId, "asset-cross-1"); // deduplicated

  const used = getAssetsUsedInDesign(designId);
  assert.equal(used.length, 2);
  assert.ok(used.includes("asset-cross-1"));
  assert.ok(used.includes("asset-logo-2"));

  clearAssetsUsedInDesign(designId);
  assert.deepEqual(getAssetsUsedInDesign(designId), []);
});

test("reportValopankkiExport reports export audit to /api/canva/v1/audit/export", async () => {
  let exportAuditBody = null;
  const mockFetch = async (url, options) => {
    if (url.includes("/audit/export")) {
      exportAuditBody = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => ({ recorded: 2, canvaDesignId: "DAG_EXP_1" }) };
    }
    return { ok: false, status: 404 };
  };

  const designId = "DAG_EXP_1";
  recordAssetUsedInDesign(designId, "asset-1");
  recordAssetUsedInDesign(designId, "asset-2");

  const res = await reportValopankkiExport(
    {
      canvaDesignId: designId,
      canvaDesignTitle: "Jumalanpalvelus",
      exportTarget: "piprogram",
    },
    { valopankkiUrl: "https://valopankki.local", fetch: mockFetch }
  );

  assert.equal(res.success, true);
  assert.equal(res.recorded, 2);
  assert.equal(exportAuditBody.canvaDesignId, "DAG_EXP_1");
  assert.equal(exportAuditBody.exportTarget, "piprogram");
  assert.deepEqual(exportAuditBody.assetIds, ["asset-1", "asset-2"]);
});

test("overwrite target state can be set, read, and cleared", () => {
  clearOverwriteTarget();
  assert.equal(getOverwriteTarget(), null);

  setOverwriteTarget({
    itemId: "item-42",
    title: "Messu 1 adventti",
    designId: "DAG_OLD_123",
    updatedAt: Date.now(),
  });

  const current = getOverwriteTarget();
  assert.ok(current);
  assert.equal(current.itemId, "item-42");
  assert.equal(current.designId, "DAG_OLD_123");

  clearOverwriteTarget();
  assert.equal(getOverwriteTarget(), null);
});

test("resolveExportTargetIngestUrl resolves absolute and relative ingest paths", () => {
  const service = {
    url: "https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443",
  };

  // Relative path against service URL
  const targetRel = {
    ingest: { path: "/api/v1/pipgm/items" },
  };
  const resolvedRel = resolveExportTargetIngestUrl(targetRel, service);
  assert.equal(resolvedRel, "https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443/api/v1/pipgm/items");

  // Absolute URL override
  const targetAbs = {
    ingest: { url: "https://cdn.custom.domain/upload" },
  };
  const resolvedAbs = resolveExportTargetIngestUrl(targetAbs, service);
  assert.equal(resolvedAbs, "https://cdn.custom.domain/upload");
});

test("resolveExportTargetAuth inherits service auth and supports target override", () => {
  const service = {
    auth: {
      type: "oidc",
      client_id: "canva-pieco-app",
      scopes: ["signage:write"],
    },
  };

  // Inherited
  const targetDefault = { ingest: { path: "/api/screens/1" } };
  const authInherited = resolveExportTargetAuth(targetDefault, service);
  assert.equal(authInherited.type, "oidc");
  assert.equal(authInherited.client_id, "canva-pieco-app");

  // Overridden
  const targetCustom = {
    ingest: {
      auth: { type: "api_key", header_name: "X-Special-Key" },
    },
  };
  const authOverridden = resolveExportTargetAuth(targetCustom, service);
  assert.equal(authOverridden.type, "api_key");
  assert.equal(authOverridden.header_name, "X-Special-Key");
});

test("listDiscoveredExportTargets parses flattened metadata.export_targets", async () => {
  const mockDiscovery = {
    services: [
      {
        id: "keskuskirkko-piprogram",
        name: "Keskuskirkko — Sali (Pi Program)",
        type: "piprogram",
        venue: "keskuskirkko",
        url: "https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443",
        auth: { type: "api_key", header_name: "X-API-Key" },
        capabilities: ["slides", "export_target"],
        metadata: {
          export_targets: [
            {
              id: "sali-valkokangas-16-9",
              name: "Pääsalin valkokangas (16:9)",
              category: "slides",
              aspect_ratio: "16:9",
              resolution: { width: 1920, height: 1080 },
              formats: ["png", "jpeg"],
              multi_page: true,
              ingest: { path: "/api/v1/pipgm/items", method: "POST" },
            },
          ],
        },
      },
      {
        id: "sissi-signage",
        name: "Kyltti / Sissi Infonäytöt",
        type: "signage",
        venue: "parish-wide",
        url: "https://kehitys.riihimaenseurakunta.fi/sissi",
        auth: { type: "oidc", client_id: "canva-pieco-app" },
        capabilities: ["screen_push", "export_target"],
        metadata: {
          export_targets: [
            {
              id: "keskuskirkko-aula-portrait",
              name: "Keskuskirkon eteisaula (Pysty 9:16)",
              category: "signage",
              aspect_ratio: "9:16",
              resolution: { width: 1080, height: 1920 },
              formats: ["png", "jpeg"],
              multi_page: false,
              ingest: { path: "/api/screens/aula/content" },
              prefill_rules: { extract_text: true },
            },
          ],
        },
      },
    ],
  };

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => mockDiscovery,
  });

  const targets = await listDiscoveredExportTargets({
    discoveryUrl: "https://tunnus.riihimaenseurakunta.fi",
    fetch: mockFetch,
  });

  assert.equal(targets.length, 2);

  // Check 1st target (PiProgram slides)
  assert.equal(targets[0].targetId, "sali-valkokangas-16-9");
  assert.equal(targets[0].serviceId, "keskuskirkko-piprogram");
  assert.equal(targets[0].category, "slides");
  assert.equal(targets[0].aspectRatio, "16:9");
  assert.equal(targets[0].multiPage, true);
  assert.equal(
    targets[0].ingestUrl,
    "https://gateway.keskuskirkko.riihimaenseurakunta.fi:8443/api/v1/pipgm/items"
  );
  assert.equal(targets[0].auth.type, "api_key");

  // Check 2nd target (Sissi signage screen with multiPage=false and extractText=true)
  assert.equal(targets[1].targetId, "keskuskirkko-aula-portrait");
  assert.equal(targets[1].category, "signage");
  assert.equal(targets[1].aspectRatio, "9:16");
  assert.equal(targets[1].multiPage, false);
  assert.equal(targets[1].prefillRules.extract_text, true);
  assert.equal(
    targets[1].ingestUrl,
    "https://kehitys.riihimaenseurakunta.fi/sissi/api/screens/aula/content"
  );
  assert.equal(targets[1].auth.type, "oidc");
});

test("detailed tracked assets support metadata, removal, and canvas inspection", async () => {
  const designId = "DAG_DETAILED_TEST_1";
  clearAssetsUsedInDesign(designId);

  // Record asset with rich metadata
  recordAssetUsedInDesign(designId, {
    id: "photo-church-1",
    title: "Keskuskirkko kesällä",
    kind: "photo",
    format: "jpeg",
    thumbnailUrl: "https://valopankki.local/thumb-1.jpg",
  });

  const tracked = getTrackedDesignAssets(designId);
  assert.equal(tracked.length, 1);
  assert.equal(tracked[0].id, "photo-church-1");
  assert.equal(tracked[0].title, "Keskuskirkko kesällä");
  assert.equal(tracked[0].kind, "photo");
  assert.equal(tracked[0].format, "jpeg");
  assert.ok(tracked[0].insertedAt);

  // Remove specific asset
  removeAssetFromDesign(designId, "photo-church-1");
  assert.equal(getTrackedDesignAssets(designId).length, 0);

  // Canvas elements inspection fallback outside Canva
  const inspection = await inspectCurrentDesignElements();
  assert.equal(inspection.supported, true);
  assert.equal(inspection.imageCount, 1);
});
