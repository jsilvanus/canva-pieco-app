import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSignageWarnings,
  findScreenById,
  formatDurationSeconds,
  formatScreenOptionLabel,
  isScreenNotFoundPayload,
  mergeSignageSettings,
  publishSignageContent,
  screenListFailed,
  screenListInitialState,
  screenListLoaded,
  screenTargetDimensions,
  updatePageSeconds,
} from "../src/intents/content_publisher/signage-publisher.mjs";
import { SignageError } from "../src/services/signage-api.mjs";

const LOBBY = {
  id: "lobby",
  name: "Lobby",
  orientation: "landscape",
  width: 1920,
  height: 1080,
  defaultImageSeconds: 10,
  maxVideoSeconds: null,
  entryCount: 2,
  playlistVersion: 1,
};

const HALL_PORTRAIT_NO_SIZE = {
  id: "hall",
  name: "Hall",
  orientation: "vertical",
  width: null,
  height: null,
  defaultImageSeconds: 8,
  maxVideoSeconds: 30,
  entryCount: 0,
  playlistVersion: 1,
};

test("screenTargetDimensions uses screen size or orientation fallback", () => {
  assert.deepEqual(screenTargetDimensions(LOBBY), { orientation: "landscape", width: 1920, height: 1080 });
  assert.deepEqual(screenTargetDimensions(HALL_PORTRAIT_NO_SIZE), { orientation: "vertical", width: 1080, height: 1920 });
  assert.equal(formatScreenOptionLabel(HALL_PORTRAIT_NO_SIZE), "Hall (vertical, 1080 × 1920)");
  assert.equal(findScreenById([LOBBY, HALL_PORTRAIT_NO_SIZE], "hall")?.name, "Hall");
});

test("screenList state transitions and SCREEN_NOT_FOUND detection", () => {
  assert.equal(screenListInitialState().status, "loading");
  const ready = screenListLoaded([LOBBY]);
  assert.equal(ready.status, "ready");
  assert.equal(ready.screens.length, 1);

  const err404 = new SignageError("SCREEN_NOT_FOUND", 404, "This screen no longer exists. The screen list was refreshed, choose a screen again");
  const failed = screenListFailed(err404);
  assert.equal(failed.status, "error");
  assert.equal(failed.refreshRequired, true);
  assert.equal(isScreenNotFoundPayload(err404.message), true);
  assert.equal(isScreenNotFoundPayload("Other error"), false);
});

test("mergeSignageSettings and updatePageSeconds normalize and clear fields", () => {
  let settings = { targetId: "signage", name: "Sunday" };
  settings = mergeSignageSettings(settings, { screenId: "lobby", enableNow: true, secondsAll: 12 });
  assert.deepEqual(settings.signage, {
    screenId: "lobby",
    secondsAll: 12,
    secondsByPage: {},
    enableNow: true,
  });

  const byPage = updatePageSeconds(settings.signage.secondsByPage, 2, 20);
  settings = mergeSignageSettings(settings, { secondsByPage: byPage });
  assert.deepEqual(settings.signage.secondsByPage, { "2": 20 });

  // Clearing secondsAll removes it; enableNow stays until switched off.
  settings = mergeSignageSettings(settings, { secondsAll: undefined });
  assert.equal(settings.signage.enableNow, true);
  assert.equal("secondsAll" in settings.signage, false);
});

test("computeSignageWarnings checks screen size/fallback and maxVideoSeconds", () => {
  const previews = [
    { kind: "image", widthPx: 1920, heightPx: 1080 },
    { kind: "video", widthPx: 1920, heightPx: 1080, durationMs: 45_000 },
  ];

  // Against portrait fallback (1080x1920) with maxVideoSeconds 30
  const warnings = computeSignageWarnings(previews, HALL_PORTRAIT_NO_SIZE);
  assert.deepEqual(warnings.sizeMismatch, { widthPx: 1920, heightPx: 1080, targetWidth: 1080, targetHeight: 1920 });
  assert.deepEqual(warnings.videoTooLongPages, [2]);

  // Against landscape screen with null maxVideoSeconds
  const ok = computeSignageWarnings(previews, LOBBY);
  assert.equal(ok.sizeMismatch, null);
  assert.deepEqual(ok.videoTooLongPages, []);

  assert.equal(formatDurationSeconds(45_200), 45);
  assert.equal(formatDurationSeconds(undefined), null);
});

test("publishSignageContent validates, builds payload, reports progress, and returns completed", async () => {
  const pushed = [];
  const progressLabels = [];

  const publishRef = JSON.stringify({
    name: "Sunday service",
    signage: { screenId: "lobby", mode: "append", secondsAll: 10, secondsByPage: { "1": 15 } },
  });

  const res = await publishSignageContent(
    {
      outputType: { id: "signage" },
      publishRef,
      outputMedia: [
        {
          mediaSlotId: "slides",
          files: [
            { format: "png", url: "https://cdn.example/1.png" },
            { format: "mp4", url: "https://cdn.example/2.mp4" },
          ],
        },
      ],
    },
    {
      signageUrl: "https://sissi.example/signage",
      pushSignage: async (payload) => {
        pushed.push(payload);
        return { pushId: "push_1", taskId: "push_1", state: "queued", screenId: "lobby" };
      },
      waitForSignagePush: async (pushId, { onProgress }) => {
        assert.equal(pushId, "push_1");
        onProgress({
          state: "downloading",
          progress: 0.4,
          done: 1,
          total: 5,
          label: "Downloading 2/5",
          status: { pushId, screenId: "lobby", state: "downloading", progress: 0.4, pages: { done: 1, total: 5 }, error: null, playlistVersion: null },
        });
        return { pushId, screenId: "lobby", state: "ready", progress: 1, error: null, playlistVersion: 2 };
      },
      onProgress: (p) => progressLabels.push(p.label),
    },
  );

  assert.deepEqual(res, { status: "completed", externalId: "push_1" });
  assert.deepEqual(progressLabels, ["Downloading 2/5"]);
  assert.deepEqual(pushed, [
    {
      screenId: "lobby",
      mode: "append",
      enabled: false,
      title: "Sunday service",
      pages: [
        { pageNumber: 1, kind: "image", url: "https://cdn.example/1.png", seconds: 15 },
        { pageNumber: 2, kind: "video", url: "https://cdn.example/2.mp4" },
      ],
    },
  ]);
});

test("publishSignageContent returns app_error with SignageError message in appDefinedPayload", async () => {
  const publishRef = JSON.stringify({
    name: "Sunday service",
    signage: { screenId: "lobby", mode: "append" },
  });

  const res = await publishSignageContent(
    {
      outputType: { id: "signage" },
      publishRef,
      outputMedia: [{ mediaSlotId: "slides", files: [{ format: "mp4", url: "https://cdn.example/v.mp4" }] }],
    },
    {
      signageUrl: "https://sissi.example/signage",
      pushSignage: async () => ({ pushId: "push_2", taskId: "push_2", state: "queued", screenId: "lobby" }),
      waitForSignagePush: async () => {
        throw new SignageError("VIDEO_TOO_LONG", 500, "The video is longer than this screen allows", { serviceMessage: "45s > 30s" });
      },
    },
  );

  assert.equal(res.status, "app_error");
  assert.equal(res.appDefinedPayload, "The video is longer than this screen allows: 45s > 30s");
});
