import test from "node:test";
import assert from "node:assert/strict";
import { listScreens, listViews, pushSignage, getSignagePush, waitForSignagePush, SignageError } from "../src/services/signage-api.mjs";

const BASE = "https://sissi.example.org/signage/";

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const errBody = (code, message = "service message") => ({ error: { code, message } });

/** Fake fetch from a queue of replies (a function or a response); records calls. */
function fake(...replies) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const r = replies.length > 1 ? replies.shift() : replies[0];
    const res = typeof r === "function" ? r(url, init) : r;
    if (res instanceof Error) throw res;
    return res;
  };
  fn.calls = calls;
  return fn;
}

const opts = (f, extra = {}) => ({ baseUrl: BASE, fetch: f, getToken: async () => "canva-token", ...extra });
const status = (state, extra = {}) => ({ pushId: "push_1", screenId: "lobby", state, progress: 0.5, pages: { done: 1, total: 2 }, error: null, playlistVersion: null, ...extra });

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; }, advance: (ms) => { t += ms; } };
}

const screen = { id: "lobby", name: "Lobby", orientation: "landscape", width: 1920, height: 1080, defaultImageSeconds: 10, maxVideoSeconds: null, entryCount: 7, playlistVersion: 12 };

test("listScreens: 200 returns screens, appends /api/v1 and sends the Canva token", async () => {
  const f = fake(json(200, { screens: [screen] }));
  assert.deepEqual(await listScreens(opts(f)), [screen]);
  assert.equal(f.calls[0].url, "https://sissi.example.org/signage/api/v1/screens");
  assert.equal(f.calls[0].init.headers.Authorization, "Bearer canva-token");
});

test("listViews: requests kind=view and returns only the view collection", async () => {
  const view = { ...screen, id: "aikuistyo", name: "Aikuistyö", kind: "view", rights: ["write", "operate"] };
  const f = fake(json(200, { screens: [view] }));
  assert.deepEqual(await listViews(opts(f)), [view]);
  assert.equal(f.calls[0].url, "https://sissi.example.org/signage/api/v1/screens?kind=view");
});

test("push key is used only when there is no Canva token", async () => {
  const f = fake(json(200, { screens: [] }));
  await listScreens(opts(f, { getToken: async () => null, pushKey: "key1" }));
  assert.equal(f.calls[0].init.headers.Authorization, "Bearer key1");
});

test("listScreens without a base URL and outside dev mock throws NOT_CONFIGURED", async () => {
  await assert.rejects(listScreens({ mock: false }), (e) => e.code === "NOT_CONFIGURED");
});

test("dev mock: screens and a 3 s push, outside Canva", async () => {
  const c = clock();
  const screens = await listScreens({ mock: true });
  assert.ok(screens.length >= 1);
  const accepted = await pushSignage({ screenId: "lobby", title: "t", pages: [{ pageNumber: 1, url: "https://x" }] }, { mock: true, now: c.now });
  assert.equal(accepted.state, "queued");
  assert.equal((await getSignagePush(accepted.pushId, { now: c.now })).state, "queued");
  const done = await waitForSignagePush(accepted.pushId, { mock: true, now: c.now, sleep: c.sleep, pollMs: 1000 });
  assert.equal(done.state, "ready");
  assert.ok(c.now() >= 3000);
});

test("pushSignage: 202 body, image seconds sent, video seconds dropped", async () => {
  const accepted = { pushId: "push_1", taskId: "push_1", state: "queued", screenId: "lobby" };
  const f = fake(json(202, accepted));
  const res = await pushSignage(
    { screenId: "lobby", mode: "append", enabled: true, title: "Konsertti", pages: [{ pageNumber: 1, url: "https://a", kind: "image", seconds: 8 }, { pageNumber: 2, url: "https://b", kind: "video", seconds: 5 }, { pageNumber: 3, url: "https://c" }] },
    opts(f),
  );
  assert.deepEqual(res, accepted);
  assert.equal(f.calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(f.calls[0].init.body), {
    screenId: "lobby",
    mode: "append",
    enabled: true,
    title: "Konsertti",
    pages: [{ pageNumber: 1, url: "https://a", kind: "image", seconds: 8 }, { pageNumber: 2, url: "https://b", kind: "video" }, { pageNumber: 3, url: "https://c" }],
  });
});

const errorCases = [
  [401, "UNAUTHORIZED", "Sign in to Canva again"],
  [403, "TEAM_NOT_ALLOWED", "Your Canva team is not allowed to publish to signage"],
  [503, "AUTH_NOT_CONFIGURED", "Signage is not set up yet"],
  [429, "BUSY", "Signage is busy, try again in a moment"],
  [429, "RATE_LIMITED", null],
  [409, "SCREEN_EXISTS", null],
];
for (const [httpStatus, code, text] of errorCases) {
  test(`push ${httpStatus} ${code} maps to a readable error`, async () => {
    const f = fake(json(httpStatus, errBody(code)));
    await assert.rejects(pushSignage({ screenId: "lobby", title: "t", pages: [{ pageNumber: 1, url: "https://a" }] }, opts(f)), (e) => {
      assert.ok(e instanceof SignageError);
      assert.equal(e.code, code);
      assert.equal(e.status, httpStatus);
      if (text) assert.equal(e.userMessage, text);
      assert.ok(e.userMessage.length > 0);
      return true;
    });
  });
}

test("404 SCREEN_NOT_FOUND asks for a screen refresh", async () => {
  const f = fake(json(404, errBody("SCREEN_NOT_FOUND", "Unknown screen: lobby")));
  await assert.rejects(pushSignage({ screenId: "lobby", title: "t", pages: [{ pageNumber: 1, url: "https://a" }] }, opts(f)), (e) => e.code === "SCREEN_NOT_FOUND" && e.refreshScreens === true && e.status === 404);
});

test("422 codes show the service's message", async () => {
  for (const code of ["INVALID_MODE", "INVALID_TITLE", "INVALID_PAGES", "INVALID_KIND", "INVALID_SECONDS", "INVALID_SCREEN", "PAGE_URL_NOT_ALLOWED", "TOO_MANY_PAGES"]) {
    const f = fake(json(422, errBody(code, `Detail for ${code}`)));
    await assert.rejects(pushSignage({ screenId: "lobby", title: "t", pages: [{ pageNumber: 1, url: "https://a" }] }, opts(f)), (e) => e.code === code && e.userMessage === `Detail for ${code}` && e.status === 422);
  }
});

test("error without a JSON body falls back on the status", async () => {
  const f = fake({ ok: false, status: 503, json: async () => { throw new Error("html"); } });
  await assert.rejects(listScreens(opts(f)), (e) => e.code === "AUTH_NOT_CONFIGURED" && e.status === 503);
  const g = fake({ ok: false, status: 502, json: async () => { throw new Error("html"); } });
  await assert.rejects(listScreens(opts(g)), (e) => e.code === "UNKNOWN" && e.status === 502 && /502/.test(e.userMessage));
});

test("network failure becomes NETWORK with status 0", async () => {
  const f = fake(new TypeError("fetch failed"));
  await assert.rejects(listScreens(opts(f)), (e) => e instanceof SignageError && e.code === "NETWORK" && e.status === 0);
});

test("request timeout becomes TIMEOUT", async () => {
  const f = fake((url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))));
  await assert.rejects(listScreens(opts(f, { timeoutMs: 5 })), (e) => e.code === "TIMEOUT" && e.status === 504);
});

test("waitForSignagePush: polls to ready and reports progress", async () => {
  const c = clock();
  const f = fake(json(200, status("queued", { progress: 0 })), json(200, status("downloading")), json(200, status("ready", { progress: 1, pages: { done: 2, total: 2 }, playlistVersion: 13 })));
  const seen = [];
  const done = await waitForSignagePush("push_1", opts(f, { now: c.now, sleep: c.sleep, onProgress: (p) => seen.push(p) }));
  assert.equal(done.playlistVersion, 13);
  assert.deepEqual(seen.map((p) => p.state), ["queued", "downloading", "ready"]);
  assert.equal(seen[1].done, 1);
  assert.equal(seen[1].total, 2);
  assert.equal(f.calls.length, 3);
  assert.equal(f.calls[0].url, "https://sissi.example.org/signage/api/v1/push/push_1");
  assert.equal(c.now(), 2000); // 1 s between polls
});

test("waitForSignagePush: failed rejects with the post-202 code", async () => {
  const cases = { DOWNLOAD_FAILED: "could not download", TOO_LARGE: "too large", UNSUPPORTED_TYPE: "type", KIND_MISMATCH: "kind", VIDEO_TOO_LONG: "longer", INTERRUPTED: "interrupted" };
  for (const [code, word] of Object.entries(cases)) {
    const c = clock();
    const f = fake(json(200, status("downloading")), json(200, status("failed", { error: { code, message: "Page 2 failed" } })));
    await assert.rejects(waitForSignagePush("push_1", opts(f, { now: c.now, sleep: c.sleep })), (e) => {
      assert.equal(e.code, code);
      assert.ok(e.userMessage.toLowerCase().includes(word), `${code}: ${e.userMessage}`);
      if (code !== "INTERRUPTED") assert.match(e.message, /Page 2 failed/);
      return true;
    });
  }
  const c = clock();
  const f = fake(json(200, status("failed", { error: { code: "INTERRUPTED", message: "x" } })));
  await assert.rejects(waitForSignagePush("push_1", opts(f, { now: c.now, sleep: c.sleep })), (e) => e.userMessage === "The publish was interrupted, try again");
});

test("waitForSignagePush: tolerates 3 failed polls in a row, the 4th fails", async () => {
  const c = clock();
  const bad = json(503, errBody("AUTH_NOT_CONFIGURED"));
  const ok = (state) => json(200, status(state));
  const f1 = fake(bad, new TypeError("net"), bad, ok("ready"));
  assert.equal((await waitForSignagePush("push_1", opts(f1, { now: c.now, sleep: c.sleep }))).state, "ready");

  const f2 = fake(bad, bad, bad, bad, ok("ready"));
  await assert.rejects(waitForSignagePush("push_1", opts(f2, { now: c.now, sleep: c.sleep })), (e) => e.status === 503);
  assert.equal(f2.calls.length, 4);

  // a good poll in between resets the count
  const f3 = fake(bad, bad, ok("downloading"), bad, bad, bad, ok("ready"));
  assert.equal((await waitForSignagePush("push_1", opts(f3, { now: c.now, sleep: c.sleep }))).state, "ready");
});

test("waitForSignagePush: a 404 on a poll ends at once", async () => {
  const c = clock();
  const f = fake(json(404, errBody("PUSH_NOT_FOUND")));
  await assert.rejects(waitForSignagePush("push_1", opts(f, { now: c.now, sleep: c.sleep })), (e) => e.code === "PUSH_NOT_FOUND");
  assert.equal(f.calls.length, 1);
});

test("waitForSignagePush: times out after 10 minutes", async () => {
  const c = clock();
  const f = fake(json(200, status("downloading")));
  await assert.rejects(waitForSignagePush("push_1", opts(f, { now: c.now, sleep: c.sleep })), (e) => e.code === "TIMEOUT" && e.status === 504);
  assert.ok(c.now() >= 10 * 60_000);
  assert.ok(f.calls.length >= 600);
});
