import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  hasRight,
  loadAccount,
  getTunnusToken,
  signIn,
  signOut,
  setOauthClient,
  resetOauthClient,
  SIGN_IN_SCOPES,
} from "../src/services/auth.mjs";

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

function setSignIn(on) {
  if (on === undefined) delete process.env.VITE_TUNNUS_SIGN_IN;
  else process.env.VITE_TUNNUS_SIGN_IN = on ? "1" : "0";
}

afterEach(() => {
  setSignIn(undefined);
  resetOauthClient();
});

test("hasRight: explicit rights, admin includes the module's levels, write does not give operate", () => {
  assert.equal(hasRight(["canva:write"], "canva:write"), true);
  assert.equal(hasRight(["canva:write"], "canva:operate"), false);
  assert.equal(hasRight(["canva:admin"], "canva:operate"), true);
  assert.equal(hasRight(["*:operate"], "canva:operate"), true);
  assert.equal(hasRight(["*:admin"], "canva:write"), true);
  assert.equal(hasRight(["piprogram:write"], "canva:write"), false);
  assert.equal(hasRight(undefined, "canva:write"), false);
  assert.equal(hasRight(["canva:write"], "nonsense"), false);
});

test("loadAccount: sign-in off gates nothing and makes no call", async () => {
  setSignIn(false);
  const account = await loadAccount({ fetch: async () => assert.fail("no call expected") });
  assert.deepEqual({ state: account.state, w: account.canWrite, o: account.canOperate }, { state: "off", w: true, o: true });
});

test("CONFIG.tunnusSignIn defaults to true when VITE_TUNNUS_SIGN_IN is unset", async () => {
  setSignIn(undefined);
  const { CONFIG } = await import("../src/config.mjs");
  assert.equal(CONFIG.tunnusSignIn, true);
});

test("loadAccount: signed out keeps the app usable and offers sign-in", async () => {
  setSignIn(true);
  const account = await loadAccount({ getToken: async () => null, fetch: async () => assert.fail("no call expected") });
  assert.equal(account.state, "signed-out");
  assert.equal(account.canWrite && account.canOperate, true);
});

test("loadAccount: rights come from the gateway session and gate write and operate separately", async () => {
  setSignIn(true);
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return json(200, { name: "Test Person", rights: ["canva:write"] });
  };
  const account = await loadAccount({ baseUrl: "https://gw.example.org/canva/", getToken: async () => "tunnus-token", fetch });
  assert.equal(calls[0].url, "https://gw.example.org/canva/api/v1/canva/session");
  assert.equal(calls[0].init.headers.Authorization, "Bearer tunnus-token");
  assert.deepEqual({ s: account.state, name: account.name, w: account.canWrite, o: account.canOperate }, { s: "signed-in", name: "Test Person", w: true, o: false });
});

test("loadAccount: operate right alone does not give write", async () => {
  setSignIn(true);
  const account = await loadAccount({ getToken: async () => "t", baseUrl: "https://gw.example.org", fetch: async () => json(200, { name: "", rights: ["canva:operate"] }) });
  assert.deepEqual({ w: account.canWrite, o: account.canOperate }, { w: false, o: true });
});

test("loadAccount: 403 or no rights means no access, an old gateway or an error gates nothing", async () => {
  setSignIn(true);
  const base = { getToken: async () => "t", baseUrl: "https://gw.example.org" };
  const refused = await loadAccount({ ...base, fetch: async () => json(403, {}) });
  assert.deepEqual({ s: refused.state, w: refused.canWrite, o: refused.canOperate }, { s: "no-access", w: false, o: false });
  const empty = await loadAccount({ ...base, fetch: async () => json(200, { name: "X", rights: [] }) });
  assert.equal(empty.state, "no-access");
  const old = await loadAccount({ ...base, fetch: async () => json(404, {}) });
  assert.deepEqual({ s: old.state, w: old.canWrite, o: old.canOperate }, { s: "unknown", w: true, o: true });
  const down = await loadAccount({ ...base, fetch: async () => { throw new Error("offline"); } });
  assert.equal(down.state, "unknown");
});

test("getTunnusToken: null while sign-in is off; the token (and forceRefresh) when on; never throws", async () => {
  setSignIn(false);
  assert.equal(await getTunnusToken(), null);
  setSignIn(true);
  const seen = [];
  setOauthClient({ getAccessToken: async (req) => { seen.push(req); return { token: "abc", scope: new Set() }; } });
  assert.equal(await getTunnusToken(), "abc");
  assert.equal(await getTunnusToken({ forceRefresh: true }), "abc");
  assert.deepEqual(seen, [undefined, { forceRefresh: true }]);
  setOauthClient({ getAccessToken: async () => null });
  assert.equal(await getTunnusToken(), null);
  setOauthClient({ getAccessToken: async () => { throw new Error("boom"); } });
  assert.equal(await getTunnusToken(), null);
});

test("signIn asks for the Tunnus scopes with prompt=consent and reports the outcome; signOut deauthorizes", async () => {
  let request = null;
  let deauthorized = false;
  setOauthClient({
    requestAuthorization: async (req) => { request = req; return { status: "completed", scope: req.scope }; },
    deauthorize: async () => { deauthorized = true; },
  });
  assert.equal(await signIn(), true);
  assert.deepEqual([...request.scope].sort(), [...SIGN_IN_SCOPES].sort());
  assert.deepEqual(request.queryParams, { prompt: "consent" });
  setOauthClient({ requestAuthorization: async () => ({ status: "aborted" }) });
  assert.equal(await signIn(), false);
  setOauthClient({ deauthorize: async () => { deauthorized = true; } });
  await signOut();
  assert.equal(deauthorized, true);
});
