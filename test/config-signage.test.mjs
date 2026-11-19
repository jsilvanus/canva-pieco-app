import { test } from "node:test";
import assert from "node:assert/strict";

function withStore(fn) {
  return async () => {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    try {
      await fn(store);
    } finally {
      delete globalThis.localStorage;
    }
  };
}

test("signageUrl is empty by default and keeps a path prefix once saved", withStore(async () => {
  const { CONFIG, saveRuntimeSettings, clearRuntimeSettings } = await import("../src/config.mjs");
  const before = CONFIG.signageUrl;
  saveRuntimeSettings({ gatewayUrl: "https://g.example.org", gatewayApiKey: "", signageUrl: " https://host.example.org/signage/ ", signagePushKey: " pk " });
  assert.equal(CONFIG.signageUrl, "https://host.example.org/signage");
  assert.equal(CONFIG.signagePushKey, "pk");
  clearRuntimeSettings();
  assert.equal(CONFIG.signageUrl, before);
}));

test("signage address must be https (http only on localhost)", withStore(async () => {
  const { CONFIG, saveRuntimeSettings, normalizeGatewayUrl } = await import("../src/config.mjs");
  assert.throws(() => saveRuntimeSettings({ gatewayUrl: "https://g.example.org", gatewayApiKey: "", signageUrl: "http://plain.example.org" }), /signage address/);
  assert.equal(normalizeGatewayUrl("http://localhost:8080/signage/"), "http://localhost:8080/signage");
  assert.equal(normalizeGatewayUrl("https://u:p@host.example.org"), null);
  saveRuntimeSettings({ gatewayUrl: "https://g.example.org", gatewayApiKey: "", signageUrl: "https://a.example.org/s" });
  // undefined keeps the stored value, an empty string removes it
  saveRuntimeSettings({ gatewayUrl: "https://g.example.org", gatewayApiKey: "" });
  assert.equal(CONFIG.signageUrl, "https://a.example.org/s");
  saveRuntimeSettings({ gatewayUrl: "https://g.example.org", gatewayApiKey: "", signageUrl: "" });
  assert.equal(CONFIG.signageUrl, "");
}));
