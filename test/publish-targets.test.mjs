import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TARGETS,
  targetById,
  validatePublishSettings,
  buildPushPayload,
} from "../src/intents/publish-targets.mjs";

const good = { targetId: "piprogram-atem", name: "Sunnuntai 15.11.", usage: { from: "2026-11-15" } };

test("targets: PiGraphics is landscape 1080p only; vertical is the Epson 10:16 (1200x1920); Saarnavideo is disabled", () => {
  const graphics = targetById("pigraphics-stream");
  assert.equal(graphics.orientation, "landscape");
  assert.equal([graphics.width, graphics.height].join("x"), "1920x1080");
  const vertical = targetById("piprogram-vertical-projector");
  assert.equal([vertical.width, vertical.height].join("x"), "1200x1920");
  assert.equal(vertical.width / vertical.height, 10 / 16);
  assert.equal(targetById("saarnavideo").enabled, false);
  assert.ok(TARGETS.length >= 4);
});

test("settings: a name and one date are enough", () => {
  assert.deepEqual(validatePublishSettings(good), { validityState: "valid", errors: [] });
});

test("settings: a range needs an ordered pair of dates", () => {
  const range = { ...good, usage: { from: "2026-11-15", to: "2026-11-17" } };
  assert.equal(validatePublishSettings(range).validityState, "valid");
  const backwards = { ...good, usage: { from: "2026-11-17", to: "2026-11-15" } };
  assert.deepEqual(validatePublishSettings(backwards).errors, ["date"]);
});

test("settings: missing name, missing date, unknown or disabled target are refused", () => {
  assert.deepEqual(validatePublishSettings({ ...good, name: "  " }).errors, ["name"]);
  assert.deepEqual(validatePublishSettings({ ...good, usage: {} }).errors, ["permanent"]);
  assert.deepEqual(validatePublishSettings({ ...good, usage: {}, permanent: true }), { validityState: "valid", errors: [] });
  assert.deepEqual(validatePublishSettings({ ...good, usage: { to: "2026-11-15" } }).errors, ["date"]);
  assert.deepEqual(validatePublishSettings({ ...good, targetId: "nope" }).errors, ["target"]);
  assert.deepEqual(validatePublishSettings({ ...good, targetId: "saarnavideo" }).errors, ["target_disabled"]);
  assert.equal(validatePublishSettings({ ...good, name: "" }).validityState, "invalid_missing_required_fields");
});

test("push payload: single date becomes useAt, range becomes start/end, target is kept", () => {
  const pages = [{ url: "u", pageNumber: 1, name: "Page 1" }];
  assert.deepEqual(buildPushPayload(good, pages), {
    title: "Sunnuntai 15.11.",
    target: "piprogram-atem",
    orientation: "landscape",
    useAt: "2026-11-15",
    pages,
  });
  assert.equal("useAt" in buildPushPayload({ ...good, usage: {}, permanent: true }, pages), false);
  assert.equal(buildPushPayload({ ...good, targetId: "piprogram-vertical-projector" }, pages).orientation, "portrait");
  const range = { ...good, usage: { from: "2026-11-15", to: "2026-11-17" } };
  assert.equal(buildPushPayload(range, pages).useAt, "2026-11-15/2026-11-17");
});

// ---- signage ----
import {
  getTargets,
  signageFallbackSize,
  buildSignagePushPayload,
  encodeSignageSettings,
  parseSignageSettings,
} from "../src/intents/publish-targets.mjs";

const sig = { targetId: "signage", name: "Viikko 47", signage: { screenId: "s1" } };
const url = { signageUrl: "https://h/signage" };

test("signage: disabled without signageUrl, enabled with it; other targets unchanged", () => {
  assert.equal(targetById("signage").enabled, false);
  assert.equal(targetById("signage", url).enabled, true);
  assert.equal(targetById("signage", url).dynamicSize, true);
  assert.ok(validatePublishSettings(sig).errors.includes("target_disabled"));
  assert.equal(getTargets(url).find((t) => t.id === "signage").enabled, true);
  assert.equal(getTargets().filter((t) => t.enabled).length, 3);
  assert.equal(targetById("piprogram-atem").transparent, true);
  assert.equal(targetById("signage").transparent, undefined);
  assert.deepEqual(signageFallbackSize("landscape"), { width: 1920, height: 1080 });
  assert.deepEqual(signageFallbackSize("portrait"), { width: 1080, height: 1920 });
});

test("signage: validation needs no dates or permanent", () => {
  assert.deepEqual(validatePublishSettings(sig, url), { validityState: "valid", errors: [] });
});

test("signage: validation rules", () => {
  const v = (patch, name = "Viikko 47") =>
    validatePublishSettings({ ...sig, name, signage: { ...sig.signage, ...patch } }, url).errors;
  assert.deepEqual(v({ screenId: "" }), ["screenId"]);
  // Old publishRefs with mode/confirmReplace are not an error; they are just ignored.
  assert.deepEqual(v({ mode: "replace" }), []);
  assert.deepEqual(v({ enableNow: true }), []);
  assert.deepEqual(v({ secondsAll: 0 }), ["seconds"]);
  assert.deepEqual(v({ secondsAll: 3601 }), ["seconds"]);
  assert.deepEqual(v({ secondsAll: 1.5 }), ["seconds"]);
  assert.deepEqual(v({ secondsByPage: { 1: 5, 2: 3600 } }), []);
  assert.deepEqual(v({ secondsByPage: { 1: 5, 2: "7" } }), ["seconds"]);
  assert.deepEqual(v({}, ""), ["name"]);
  assert.deepEqual(v({}, "x".repeat(201)), ["name"]);
  assert.deepEqual(v({}, "x".repeat(200)), []);
});

test("signage: push payload seconds and kind rules", () => {
  const s = { ...sig, signage: { screenId: "s1", mode: "replace", enableNow: true, secondsAll: 10, secondsByPage: { 2: 20 } } };
  const p = buildSignagePushPayload(s, [
    { url: "https://c/a.png?x=1" },
    { url: "https://c/b.jpeg" },
    { url: "https://c/v.mp4", pageNumber: 3 },
    { url: "https://c/blob", kind: "video" },
    { url: "https://c/unknown" },
  ]);
  assert.deepEqual(p, {
    screenId: "s1",
    mode: "append",
    enabled: true,
    title: "Viikko 47",
    pages: [
      { pageNumber: 1, kind: "image", url: "https://c/a.png?x=1", seconds: 10 },
      { pageNumber: 2, kind: "image", url: "https://c/b.jpeg", seconds: 20 },
      { pageNumber: 3, kind: "video", url: "https://c/v.mp4" },
      { pageNumber: 4, kind: "video", url: "https://c/blob" },
      { pageNumber: 5, url: "https://c/unknown", seconds: 10 },
    ],
  });
  const none = buildSignagePushPayload(sig, [{ url: "https://c/a.png" }]);
  assert.equal("seconds" in none.pages[0], false);
  // Default: added disabled (content publishing), never a replace.
  assert.equal(none.enabled, false);
  assert.equal(none.mode, "append");
});

test("signage: settings round trip", () => {
  const s = { screenId: "s1", secondsAll: 8, secondsByPage: { 1: 5 }, enableNow: true };
  assert.deepEqual(parseSignageSettings(encodeSignageSettings(s)), s);
  assert.deepEqual(parseSignageSettings("nope"), { screenId: "", secondsByPage: {}, enableNow: false });
  // An old publishRef that asked for replace does not put anything live.
  assert.equal(parseSignageSettings({ screenId: "s1", mode: "replace", confirmReplace: true }).enableNow, false);
});
