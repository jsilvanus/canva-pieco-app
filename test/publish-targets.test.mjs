import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TARGETS,
  targetById,
  validatePublishSettings,
  buildPushPayload,
  decodePublishRef,
  encodePublishRef,
} from "../src/intents/publish-targets.mjs";

const good = { targetId: "piprogram", name: "Sunnuntai 15.11.", usage: { from: "2026-11-15" } };

test("targets: PiProgram is unified, ATEM is PiGraphics, Sissi targets are separate, Saarnavideo is later", () => {
  assert.equal(targetById("piprogram").orientation, "landscape");
  assert.equal(targetById("piprogram-atem").id, "piprogram");
  assert.equal(targetById("piprogram-vertical-projector").id, "piprogram");
  const graphics = targetById("pigraphics-stream");
  assert.equal(graphics.orientation, "landscape");
  assert.equal([graphics.width, graphics.height].join("x"), "1920x1080");
  assert.equal(graphics.transparent, true);
  assert.equal(targetById("signage").kind, "signage");
  assert.equal(targetById("signage-view").kind, "signage-view");
  assert.equal(targetById("saarnavideo").enabled, false);
  assert.equal(TARGETS.length, 5);
});

test("views: publish metadata is copied onto every page and remains disabled by default", () => {
  const settings = {
    targetId: "signage-view",
    name: "Aikuistyö",
    signage: { screenId: "aikuistyo", title: "Tapahtumat", text: "Tule mukaan", link: "https://example.org/events" },
  };
  assert.deepEqual(validatePublishSettings(settings, url), { validityState: "valid", errors: [] });
  const payload = buildSignagePushPayload(settings, [
    { url: "https://cdn.example.org/one.png", pageNumber: 1 },
    { url: "https://cdn.example.org/two.png", pageNumber: 2 },
  ]);
  assert.equal(payload.enabled, false);
  assert.equal(payload.pages[0].alt, "Aikuistyö");
  assert.equal(payload.pages[0].title, "Tapahtumat");
  assert.equal(payload.pages[1].text, "Tule mukaan");
  assert.equal(payload.pages[1].link, "https://example.org/events");
});

test("views: links must be HTTPS and saved PiProgram ids migrate", () => {
  const invalid = { targetId: "signage-view", name: "x", signage: { screenId: "aikuistyo", link: "http://example.org" } };
  assert.deepEqual(validatePublishSettings(invalid, url).errors, ["link"]);
  assert.equal(JSON.parse(encodePublishRef({ targetId: "piprogram-atem" })).targetId, "piprogram-atem");
  assert.equal(decodePublishRef(JSON.stringify({ targetId: "piprogram-atem" })).targetId, "piprogram");
});
