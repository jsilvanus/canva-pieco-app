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
  assert.deepEqual(validatePublishSettings({ ...good, usage: {} }).errors, ["date"]);
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
  assert.equal(buildPushPayload({ ...good, targetId: "piprogram-vertical-projector" }, pages).orientation, "portrait");
  const range = { ...good, usage: { from: "2026-11-15", to: "2026-11-17" } };
  assert.equal(buildPushPayload(range, pages).useAt, "2026-11-15/2026-11-17");
});
