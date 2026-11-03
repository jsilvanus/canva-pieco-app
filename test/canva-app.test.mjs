import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../src/config.mjs";
import { isRunningInCanva, exportDesignPages } from "../src/services/canva-sdk.mjs";
import {
  pushContent,
  parseUseAt,
  waitForTask,
  describeTask,
  setupPresentation,
  controlSlide,
  toggleFtb,
  setProjectorPicMute,
  getGatewayStatus,
  pushCanvaGraphic,
  setCanvaGraphicOffAir,
  setFetchImpl,
  resetFetchImpl,
} from "../src/services/gateway-api.mjs";

beforeEach(() => {
  // Use instant mock fetch during unit tests to avoid network timeouts
  setFetchImpl(async (url, init = {}) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : {};

    if (path === "/api/v1/canva/push") {
      return new Response(
        JSON.stringify({
          taskId: "ctask_mock",
          presentationId: "pres_mock123",
          title: body.title,
          state: "queued",
          progress: 0,
          pageCount: body.pages?.length || 0,
          downloaded: { done: 0, total: body.pages?.length || 0 },
          pictures: { done: 0, total: 0 },
          saved: false,
          ready: false,
          error: null,
        }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }

    if (path === "/api/v1/canva/setup") {
      return new Response(
        JSON.stringify({
          success: true,
          pipelineId: body.pipelineId,
          matrixRoute: body.matrixRoute,
          picMute: body.unblankProjectors ? false : true,
          currentSlide: body.cueSlide || 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (path === "/api/v1/canva/control") {
      let currentPage = 1;
      let ftb = false;
      let muted = undefined;
      if (body.action === "gotoPage") currentPage = body.page;
      if (body.action === "ftb") ftb = body.enabled;
      if (body.action === "picMute") muted = body.muted;
      return new Response(
        JSON.stringify({ success: true, currentPage, ftb, muted }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (path === "/api/v1/canva/status") {
      return new Response(
        JSON.stringify({
          online: true,
          pipelineId: "pipgm1",
          matrixRoute: "both_projectors",
          currentSlide: 1,
          totalSlides: 4,
          ftb: false,
          picMute: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (path === "/api/v1/graphics/canva/push") {
      return new Response(
        JSON.stringify({
          ok: true,
          title: body.title,
          slot: body.slot || 7,
          mediaPlayer: body.mediaPlayer || 1,
          movement: body.movement || "fly-left",
          keyer: body.keyer || "usk",
          autoHideMs: body.autoHideMs,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (path === "/api/v1/graphics/canva/off-air") {
      return new Response(
        JSON.stringify({
          ok: true,
          offAir: true,
          keyer: body.keyer || "usk",
          index: body.index || 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404 });
  });
});

afterEach(() => {
  resetFetchImpl();
});

test("CONFIG initializes with defaults or environment values", () => {
  assert.ok(CONFIG.appName, "appName must be present");
  assert.ok(CONFIG.gatewayUrl, "gatewayUrl must be present");
  assert.strictEqual(CONFIG.gatewayUrl.endsWith("/"), false, "gatewayUrl must not end with a slash");
});

test("canva-sdk detects environment and provides simulated export when outside Canva iframe", async () => {
  const inCanva = isRunningInCanva();
  assert.strictEqual(typeof inCanva, "boolean");

  const exportResult = await exportDesignPages();
  assert.strictEqual(exportResult.status, "completed");
  assert.ok(Array.isArray(exportResult.exportBlobs));
  assert.ok(exportResult.exportBlobs.length > 0);
  assert.ok(exportResult.exportBlobs[0].url);
  assert.strictEqual(exportResult.exportBlobs[0].pageNumber, 1);
});

test("gateway-api executes Step 1 (pushContent) successfully", async () => {
  const pages = [
    { pageNumber: 1, url: "https://export.canva.com/slide-1.png", name: "Intro" },
    { pageNumber: 2, url: "https://export.canva.com/slide-2.png", name: "Scripture" },
  ];

  const res = await pushContent({ title: "Sunday Service", pages });
  assert.strictEqual(res.taskId, "ctask_mock");
  assert.strictEqual(res.presentationId, "pres_mock123");
  assert.strictEqual(res.state, "queued");
  assert.strictEqual(res.pageCount, 2);
});

test("waitForTask reports every step until the slides are ready", async () => {
  const steps = [
    { state: "downloading", progress: 0.15, downloaded: { done: 1, total: 2 } },
    { state: "unpacking", progress: 0.3 },
    { state: "preparing", progress: 0.6, pictures: { done: 2, total: 4 }, saved: true },
    { state: "ready", progress: 1, pictures: { done: 4, total: 4 }, saved: true, ready: true },
  ];
  let n = 0;
  setFetchImpl(async () => new Response(JSON.stringify({ taskId: "t", presentationId: "p", pageCount: 2, ...steps[n++] }), { status: 200 }));
  const seen = [];
  const done = await waitForTask("t", { onUpdate: (t) => seen.push(describeTask(t).label), sleep: async () => {} });
  assert.strictEqual(done.ready, true);
  assert.deepStrictEqual(seen, [
    "Fetching slides from Canva 1/2",
    "Unpacking slides in Pi Program...",
    "Making thumbnails 2/4",
    "Ready to present",
  ]);
  assert.strictEqual(describeTask(steps[3]).percent, 100);
  assert.ok(describeTask({ state: "downloading", progress: 0 }).percent >= 30);
});

test("waitForTask rejects with the gateway's reason when the task fails", async () => {
  setFetchImpl(async () => new Response(JSON.stringify({ state: "failed", progress: 0.3, error: "a Canva page is larger than the limit" }), { status: 200 }));
  await assert.rejects(waitForTask("t", { sleep: async () => {} }), /larger than the limit/);
});

test("waitForTask gives up on an unknown task and survives a short network break", async () => {
  setFetchImpl(async () => new Response(JSON.stringify({ error: { message: "Unknown task" } }), { status: 404 }));
  await assert.rejects(waitForTask("gone", { sleep: async () => {} }), /Unknown task/);
  let calls = 0;
  setFetchImpl(async () => {
    calls += 1;
    if (calls < 3) throw new Error("offline");
    return new Response(JSON.stringify({ state: "ready", progress: 1, ready: true }), { status: 200 });
  });
  const done = await waitForTask("t", { sleep: async () => {} });
  assert.strictEqual(done.state, "ready");
});

test("in dev mode without a gateway the push is simulated as a task that progresses to ready", async () => {
  setFetchImpl(async () => {
    throw new Error("connection refused");
  });
  const task = await pushContent({ title: "Dev", pages: [{ pageNumber: 1, url: "x" }, { pageNumber: 2, url: "y" }] });
  assert.ok(task.taskId.startsWith("sim_"));
  assert.strictEqual(task.isSimulated, true);
  const done = await waitForTask(task.taskId, { pollMs: 20 });
  assert.strictEqual(done.ready, true);
  assert.deepStrictEqual(done.pictures, { done: 4, total: 4 });
});

test("gateway-api executes Step 2 (setupPresentation) with pipeline and matrix routing", async () => {
  const res = await setupPresentation({
    presentationId: "pres_123",
    pipelineId: "pipgm1",
    matrixRoute: "both_projectors",
    unblankProjectors: true,
    cueSlide: 1,
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.pipelineId, "pipgm1");
  assert.strictEqual(res.matrixRoute, "both_projectors");
  assert.strictEqual(res.picMute, false);
  assert.strictEqual(res.currentSlide, 1);
});

test("gateway-api executes Step 3 (controlSlide next, prev, gotoPage)", async () => {
  const nextRes = await controlSlide({ pipelineId: "pipgm1", action: "next" });
  assert.strictEqual(nextRes.success, true);

  const prevRes = await controlSlide({ pipelineId: "pipgm1", action: "prev" });
  assert.strictEqual(prevRes.success, true);

  const jumpRes = await controlSlide({ pipelineId: "pipgm1", action: "gotoPage", page: 3 });
  assert.strictEqual(jumpRes.success, true);
  assert.strictEqual(jumpRes.currentPage, 3);
});

test("gateway-api executes Step 3 (toggleFtb)", async () => {
  const ftbOn = await toggleFtb({ pipelineId: "pipgm1", enabled: true });
  assert.strictEqual(ftbOn.success, true);
  assert.strictEqual(ftbOn.ftb, true);

  const ftbOff = await toggleFtb({ pipelineId: "pipgm1", enabled: false });
  assert.strictEqual(ftbOff.success, true);
  assert.strictEqual(ftbOff.ftb, false);
});

test("gateway-api executes Step 3 (setProjectorPicMute)", async () => {
  const muteOn = await setProjectorPicMute({ muted: true });
  assert.strictEqual(muteOn.success, true);
  assert.strictEqual(muteOn.muted, true);

  const muteOff = await setProjectorPicMute({ muted: false });
  assert.strictEqual(muteOff.success, true);
  assert.strictEqual(muteOff.muted, false);
});

test("gateway-api getGatewayStatus returns status object", async () => {
  const status = await getGatewayStatus("pipgm1");
  assert.strictEqual(status.online, true);
  assert.strictEqual(status.pipelineId, "pipgm1");
  assert.strictEqual(status.matrixRoute, "both_projectors");
  assert.strictEqual(status.ftb, false);
  assert.strictEqual(status.picMute, false);
});

test("gateway-api executes pushCanvaGraphic with Flying Key and auto-hide", async () => {
  const res = await pushCanvaGraphic({
    title: "Test Lower Third",
    imageUrl: "https://export.canva.dev/mock/page-1.png",
    movement: "fly-left",
    autoHideMs: 7000,
    slot: 8,
    keyer: "usk",
  });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.title, "Test Lower Third");
  assert.strictEqual(res.movement, "fly-left");
  assert.strictEqual(res.slot, 8);
  assert.strictEqual(res.keyer, "usk");
});

test("gateway-api executes setCanvaGraphicOffAir", async () => {
  const res = await setCanvaGraphicOffAir({ keyer: "usk", index: 1 });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.offAir, true);
  assert.strictEqual(res.keyer, "usk");
});

test("normalizeGatewayUrl accepts https (and http on localhost) and refuses the rest", async () => {
  const { normalizeGatewayUrl } = await import("../src/config.mjs");
  assert.strictEqual(normalizeGatewayUrl("https://gw.example.org/"), "https://gw.example.org");
  assert.strictEqual(normalizeGatewayUrl("http://localhost:3000"), "http://localhost:3000");
  assert.strictEqual(normalizeGatewayUrl("http://gw.example.org"), null);
  assert.strictEqual(normalizeGatewayUrl("https://user:pw@gw.example.org"), null);
  assert.strictEqual(normalizeGatewayUrl("javascript:alert(1)"), null);
  assert.strictEqual(normalizeGatewayUrl(""), null);
});

test("saved settings win over the build defaults and can be cleared", async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  try {
    const { CONFIG: cfg, saveRuntimeSettings, clearRuntimeSettings } = await import("../src/config.mjs");
    const before = cfg.gatewayUrl;
    saveRuntimeSettings({ gatewayUrl: "https://church.example.org/", gatewayApiKey: " k1 " });
    assert.strictEqual(cfg.gatewayUrl, "https://church.example.org");
    assert.strictEqual(cfg.gatewayApiKey, "k1");
    assert.throws(() => saveRuntimeSettings({ gatewayUrl: "http://plain.example.org", gatewayApiKey: "" }), /https/);
    clearRuntimeSettings();
    assert.strictEqual(cfg.gatewayUrl, before);
  } finally {
    delete globalThis.localStorage;
  }
});

test("parseUseAt accepts a date, a date with hour, a range and a list", () => {
  assert.equal(parseUseAt(""), null);
  assert.equal(parseUseAt("2026-11-08"), "2026-11-08");
  assert.equal(parseUseAt("2026-11-08T10"), "2026-11-08T10");
  assert.equal(parseUseAt("2026-11-08/2026-11-09"), "2026-11-08/2026-11-09");
  assert.deepEqual(parseUseAt("2026-11-08, 2026-11-15"), ["2026-11-08", "2026-11-15"]);
  assert.throws(() => parseUseAt("8.11.2026"), /not a service date/);
});

test("pushContent sends useAt, setupPresentation sends piOutput only when set", async () => {
  const bodies = [];
  setFetchImpl(async (url, init = {}) => {
    bodies.push({ path: new URL(url).pathname, body: JSON.parse(init.body) });
    return new Response(
      JSON.stringify({ taskId: "t", presentationId: "p", state: "queued", ready: false, success: true }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  });
  await pushContent({ title: "A", pages: [{ pageNumber: 1, url: "x" }], useAt: ["2026-11-08", "2026-11-15"] });
  await setupPresentation({ presentationId: "p", pipelineId: "pipgm1", matrixRoute: "none" });
  await setupPresentation({ presentationId: "p", pipelineId: "pipgm1", matrixRoute: "none", piOutput: "pi2" });
  assert.equal(bodies[0].path, "/api/v1/canva/push");
  assert.deepEqual(bodies[0].body.useAt, ["2026-11-08", "2026-11-15"]);
  assert.equal("piOutput" in bodies[1].body, false);
  assert.equal(bodies[2].body.piOutput, "pi2");
});
