const le = ':root{--bg-primary: #0f172a;--bg-secondary: #1e293b;--bg-card: #334155;--bg-active: #2563eb;--text-primary: #f8fafc;--text-muted: #94a3b8;--text-dim: #64748b;--border-color: #334155;--border-highlight: #475569;--accent-blue: #3b82f6;--accent-cyan: #06b6d4;--accent-green: #10b981;--accent-amber: #f59e0b;--accent-red: #ef4444;--radius-sm: 6px;--radius-md: 10px;--radius-lg: 14px;--font-main: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif}*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font-main);background-color:var(--bg-primary);color:var(--text-primary);font-size:13px;line-height:1.4;user-select:none;-webkit-font-smoothing:antialiased;padding:12px;min-height:100vh}#app{display:flex;flex-direction:column;gap:12px;max-width:420px;margin:0 auto}.app-header{display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--border-color);padding-bottom:10px}.header-top{display:flex;justify-content:space-between;align-items:center}.brand-title{font-size:14px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px}.church-badge{background:linear-gradient(135deg,var(--accent-blue),var(--accent-cyan));color:#fff;padding:2px 7px;border-radius:var(--radius-sm);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}.status-pill{display:flex;align-items:center;gap:5px;font-size:11px;padding:2px 8px;border-radius:999px;background-color:var(--bg-secondary);color:var(--text-muted)}.status-dot{width:7px;height:7px;border-radius:50%;background-color:var(--text-dim)}.status-dot.online{background-color:var(--accent-green);box-shadow:0 0 6px var(--accent-green)}.status-dot.simulated{background-color:var(--accent-amber)}.status-dot.offline{background-color:var(--accent-red)}.target-info{font-size:11px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mode-switcher{display:flex;background-color:var(--bg-secondary);border-radius:var(--radius-sm);padding:3px;gap:4px}.mode-btn{flex:1;background:transparent;border:none;color:var(--text-muted);padding:6px 10px;font-size:11px;font-weight:600;border-radius:var(--radius-sm);cursor:pointer;transition:all .15s ease;display:flex;align-items:center;justify-content:center;gap:5px}.mode-btn.active{background-color:var(--bg-card);color:var(--text-primary);box-shadow:0 1px 3px #0000004d}.mode-btn:hover:not(.active){color:var(--text-primary)}.step-nav{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;background-color:var(--bg-secondary);padding:3px;border-radius:var(--radius-md)}.step-tab{background:transparent;border:none;color:var(--text-muted);font-size:11px;font-weight:600;padding:7px 4px;border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all .2s ease}.step-tab:hover:not(:disabled){color:var(--text-primary);background-color:var(--bg-card)}.step-tab.active{background-color:var(--bg-active);color:#fff}.step-tab:disabled{opacity:.4;cursor:not-allowed}.view-card{background-color:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:14px;display:flex;flex-direction:column;gap:12px}.card-title{font-size:13px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;justify-content:space-between}.card-subtitle{font-size:12px;color:var(--text-muted);line-height:1.4}.btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;font-weight:600;font-size:13px;padding:10px 14px;border-radius:var(--radius-md);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .1s ease,filter .2s ease;box-shadow:0 2px 8px #2563eb4d}.btn-primary:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}.btn-primary:active:not(:disabled){transform:translateY(0)}.btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}.btn-secondary{background-color:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-highlight);font-weight:600;font-size:12px;padding:8px 12px;border-radius:var(--radius-md);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s ease}.btn-secondary:hover:not(:disabled){background-color:var(--border-highlight)}.btn-secondary:disabled{opacity:.4;cursor:not-allowed}.export-meta{background-color:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:10px;display:flex;flex-direction:column;gap:6px}.meta-row{display:flex;justify-content:space-between;font-size:11px}.meta-label{color:var(--text-dim)}.meta-value{color:var(--text-primary);font-weight:600}.preview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;max-height:180px;overflow-y:auto;padding:4px;background-color:var(--bg-primary);border-radius:var(--radius-md)}.preview-item{position:relative;aspect-ratio:16 / 9;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border-color);background-color:#000}.preview-item img{width:100%;height:100%;object-fit:cover}.preview-badge{position:absolute;bottom:2px;right:2px;background:#000000bf;color:#fff;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px}.form-group{display:flex;flex-direction:column;gap:6px}.form-label{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}.radio-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}.radio-tile{background-color:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:2px;transition:all .2s ease}.radio-tile:hover{border-color:var(--accent-blue)}.radio-tile.selected{border-color:var(--accent-blue);background-color:#2563eb26}.tile-title{font-size:12px;font-weight:700;color:var(--text-primary)}.tile-desc{font-size:10px;color:var(--text-dim)}.select-input{background-color:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:8px 10px;font-size:12px;outline:none;width:100%;cursor:pointer}.select-input:focus{border-color:var(--accent-blue)}.checkbox-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer;padding:6px 0}.checkbox-row input{margin-top:2px;accent-color:var(--accent-blue);cursor:pointer}.checkbox-label{font-size:12px;color:var(--text-primary);font-weight:500}.checkbox-hint{font-size:10px;color:var(--text-dim)}.live-banner{background:linear-gradient(135deg,#ef444433,#2563eb33);border:1px solid var(--accent-red);border-radius:var(--radius-md);padding:8px 12px;display:flex;align-items:center;justify-content:space-between}.live-pill{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--accent-red);letter-spacing:.5px}.live-pulse{width:8px;height:8px;border-radius:50%;background-color:var(--accent-red);animation:pulse 1.5s infinite}@keyframes pulse{0%{transform:scale(.9);opacity:.8}50%{transform:scale(1.3);opacity:1}to{transform:scale(.9);opacity:.8}}.live-routing-badge{font-size:11px;font-weight:600;color:var(--text-muted)}.slide-display-box{background-color:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:16px;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;overflow:hidden}.slide-number-big{font-size:32px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums}.slide-count-label{font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px}.slide-title-preview{font-size:13px;color:var(--accent-cyan);font-weight:600;text-align:center;max-width:90%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nav-buttons-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.btn-nav{height:60px;font-size:15px;font-weight:800;border-radius:var(--radius-lg);border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all .15s ease}.btn-nav-prev{background-color:var(--bg-card);color:var(--text-primary);border:1px solid var(--border-highlight)}.btn-nav-prev:hover:not(:disabled){background-color:var(--border-highlight)}.btn-nav-next{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 12px #10b98159}.btn-nav-next:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-2px)}.btn-nav:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none}.nav-key-hint{font-size:9px;opacity:.7;font-weight:500}.thumbnails-strip{display:flex;gap:6px;overflow-x:auto;padding:6px 2px;scrollbar-width:thin}.thumb-card{flex:0 0 64px;aspect-ratio:16 / 9;background-color:var(--bg-primary);border:2px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;position:relative;overflow:hidden;transition:all .15s ease}.thumb-card:hover{border-color:var(--text-muted)}.thumb-card.active{border-color:var(--accent-blue);box-shadow:0 0 8px #2563ebb3}.thumb-card img{width:100%;height:100%;object-fit:cover}.thumb-number{position:absolute;top:1px;left:2px;background:#000000bf;color:#fff;font-size:9px;font-weight:800;padding:0 3px;border-radius:2px}.quick-controls-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.btn-toggle-active{border:1px solid var(--border-color);font-weight:700;font-size:11px;padding:10px 8px;border-radius:var(--radius-md);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:all .2s ease}.btn-toggle-ftb{background-color:var(--bg-card);color:var(--text-primary)}.btn-toggle-ftb.active{background-color:var(--accent-amber);color:#000;border-color:var(--accent-amber);box-shadow:0 0 10px #f59e0b99}.btn-toggle-picmute{background-color:var(--bg-card);color:var(--text-primary)}.btn-toggle-picmute.active{background-color:var(--accent-red);color:#fff;border-color:var(--accent-red);box-shadow:0 0 10px #ef444499}.footer-actions{display:flex;justify-content:space-between;align-items:center;margin-top:4px}.link-btn{background:transparent;border:none;color:var(--accent-blue);font-size:11px;cursor:pointer;text-decoration:underline;padding:2px}.link-btn:hover{color:var(--accent-cyan)}.toast-bar{background-color:var(--bg-card);border:1px solid var(--border-highlight);border-radius:var(--radius-md);padding:8px 12px;font-size:11px;display:flex;align-items:center;gap:8px;transition:all .3s ease}.toast-bar.error{background-color:#ef444433;border-color:var(--accent-red);color:#fca5a5}.toast-bar.success{background-color:#10b98133;border-color:var(--accent-green);color:#6ee7b7}.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}.progress-container{display:flex;flex-direction:column;gap:6px;background-color:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:10px 12px;margin:10px 0}.progress-header{display:flex;justify-content:space-between;align-items:center;font-size:11px}.progress-label{color:var(--text-muted);font-weight:500}.progress-percent{color:var(--accent-cyan);font-weight:700;font-family:monospace}.progress-track{width:100%;height:6px;background-color:var(--bg-card);border-radius:999px;overflow:hidden}.progress-fill{height:100%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-cyan));border-radius:999px;transition:width .25s ease-out}.graphics-deck{display:flex;flex-direction:column;gap:12px}.graphic-cued-box{background-color:var(--bg-secondary);border:2px solid var(--border-color);border-radius:var(--radius-md);padding:14px;display:flex;flex-direction:column;align-items:center;gap:8px;transition:border-color .2s ease,box-shadow .2s ease;position:relative}.graphic-cued-box.on-air{border-color:var(--accent-red);box-shadow:0 0 16px #ef444459}.on-air-tag{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}.on-air-tag.live{background-color:var(--accent-red);color:#fff;animation:pulseRed 1.8s infinite}.on-air-tag.cued{background-color:var(--bg-card);color:var(--text-muted)}@keyframes pulseRed{0%,to{box-shadow:0 0 6px #ef444466}50%{box-shadow:0 0 14px #ef4444e6}}.graphic-preview-wrap{background:repeating-conic-gradient(#1e293b 0% 25%,#0f172a 0% 50%) 50% / 16px 16px;border-radius:var(--radius-sm);padding:10px;width:100%;display:flex;justify-content:center;align-items:center;min-height:100px}.graphic-preview-img{max-height:100px;max-width:100%;border-radius:4px;box-shadow:0 4px 12px #00000080}.graphic-title-label{font-size:13px;font-weight:600;color:var(--text-primary);text-align:center}.graphic-hotkey-bar{display:flex;justify-content:center;gap:10px;font-size:10px;color:var(--text-dim);margin-top:-2px}.link-btn{background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;margin-left:8px;font:inherit}.settings-form{display:grid;gap:8px;margin:8px 0;padding:10px;border:1px solid rgba(255,255,255,.2);border-radius:8px}.settings-form label{display:grid;gap:4px;font-size:12px}.settings-form input{padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:inherit}.settings-actions{display:flex;flex-wrap:wrap;gap:6px}.settings-error{color:#fca5a5;font-size:12px}', W = { DEV: !1, VITE_GATEWAY_API_KEY: "", VITE_GATEWAY_URL: "https://kehitys.riihimaenseurakunta.fi/canva" }, A = typeof import.meta < "u" && W ? W : null, E = A || (typeof process < "u" ? process.env : {}), T = "canva-pieco-app.settings";
function X() {
  try {
    const t = globalThis.localStorage?.getItem(T), a = t ? JSON.parse(t) : {};
    return a && typeof a == "object" ? a : {};
  } catch {
    return {};
  }
}
function te(t) {
  const a = String(t ?? "").trim().replace(/\/+$/, "");
  if (!a) return null;
  try {
    const n = new URL(a), i = n.hostname === "localhost" || n.hostname === "127.0.0.1";
    return n.protocol !== "https:" && !(n.protocol === "http:" && i) || n.username || n.password ? null : `${n.origin}${n.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}
function ce({ gatewayUrl: t, gatewayApiKey: a }) {
  const n = te(t);
  if (!n) throw new Error("The gateway address must be an https address, for example https://gateway.example.org");
  try {
    globalThis.localStorage?.setItem(T, JSON.stringify({ gatewayUrl: n, gatewayApiKey: String(a ?? "").trim() }));
  } catch {
    throw new Error("This browser would not keep the settings (storage is blocked).");
  }
}
function de() {
  try {
    globalThis.localStorage?.removeItem(T);
  } catch {
  }
}
const g = Object.freeze({
  appName: E.VITE_APP_NAME || "Church Slide Bridge",
  get gatewayUrl() {
    return te(X().gatewayUrl) || (E.VITE_GATEWAY_URL || "https://gateway.local:8443").replace(/\/+$/, "");
  },
  get gatewayApiKey() {
    const t = X();
    return typeof t.gatewayApiKey == "string" && t.gatewayUrl ? t.gatewayApiKey : E.VITE_GATEWAY_API_KEY || "";
  },
  // Vite sets DEV only for `vite` (the dev server); a production build has it false. Under plain
  // Node (tests) there is no Vite env and NODE_ENV decides.
  isDev: A ? !!A.DEV : E.NODE_ENV !== "production"
});
function B() {
  try {
    return typeof window < "u" && typeof window.parent < "u" && window.self !== window.top;
  } catch {
    return !0;
  }
}
function pe() {
  const t = [
    { name: "Slide 1 - Welcome", color: "#1e3a8a", text: "Welcome to Church" },
    { name: "Slide 2 - Song 1", color: "#1e293b", text: "Amazing Grace" },
    { name: "Slide 3 - Sermon", color: "#0f172a", text: "Today's Scripture: John 3:16" },
    { name: "Slide 4 - Blessing", color: "#312e81", text: "Peace Be With You" }
  ];
  return {
    status: "completed",
    title: "Sunday Service Presentation (Mock)",
    exportBlobs: t.map((n, i) => {
      let s = `https://export.canva.dev/mock/page-${i + 1}.png`;
      if (typeof Blob < "u" && typeof URL < "u" && typeof URL.createObjectURL == "function") {
        const l = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="${n.color}"/>
        <text x="960" y="500" font-family="sans-serif" font-size="72" fill="#ffffff" text-anchor="middle" font-weight="bold">${n.text}</text>
        <text x="960" y="600" font-family="sans-serif" font-size="36" fill="#94a3b8" text-anchor="middle">Slide ${i + 1} of ${t.length}</text>
      </svg>`, d = new Blob([l], { type: "image/svg+xml" });
        s = URL.createObjectURL(d);
      }
      return { url: s, pageNumber: i + 1, name: n.name };
    })
  };
}
async function ae() {
  if (!B())
    return pe();
  try {
    const { requestExport: t } = await Promise.resolve().then(() => wt), a = await t({
      acceptedFileTypes: [
        {
          type: "png",
          zipped: "never"
        }
      ]
    });
    if (a.status === "aborted")
      return { status: "aborted", title: "", exportBlobs: [] };
    const n = (a.exportBlobs || []).map((i, s) => ({
      url: i.url,
      pageNumber: s + 1,
      name: `Page ${s + 1}`
    }));
    return {
      status: "completed",
      title: a.title || "Canva Presentation",
      exportBlobs: n
    };
  } catch (t) {
    if (t && (t.name === "AbortError" || t.message?.toLowerCase().includes("cancel")))
      return { status: "aborted", title: "", exportBlobs: [] };
    throw console.error("[canva-pieco-app] Canva requestExport error:", t), t;
  }
}
class x extends Error {
  constructor(a, n, i = null) {
    super(a), this.name = "GatewayError", this.status = n, this.details = i;
  }
}
let ue = null;
async function ge() {
  try {
    const { auth: t } = await Promise.resolve().then(() => Pt), a = await t.getCanvaUserToken();
    return typeof a == "string" && a ? a : null;
  } catch {
    return null;
  }
}
async function ve() {
  const t = {
    "Content-Type": "application/json",
    Accept: "application/json"
  }, a = await ge();
  return a ? t.Authorization = `Bearer ${a}` : g.gatewayApiKey && (t.Authorization = `Bearer ${g.gatewayApiKey}`, t["X-Api-Key"] = g.gatewayApiKey), t;
}
async function h(t, a = {}) {
  const n = `${g.gatewayUrl}${t}`, i = new AbortController(), s = setTimeout(() => i.abort(), a.timeoutMs || 1e4);
  try {
    const d = await (ue || fetch)(n, {
      ...a,
      headers: {
        ...await ve(),
        ...a.headers || {}
      },
      signal: i.signal
    });
    if (clearTimeout(s), !d.ok) {
      let o = null;
      try {
        o = await d.json();
      } catch {
      }
      const S = (o?.error && typeof o.error == "object" ? o.error.message : null) || o?.message || (typeof o?.error == "string" ? o.error : null) || `HTTP ${d.status} from Gateway`;
      throw new x(S, d.status, o);
    }
    return await d.json();
  } catch (l) {
    throw clearTimeout(s), l.name === "AbortError" ? new x(`Request to Gateway timed out (${n})`, 504) : l instanceof x ? l : new x(`Failed to connect to Pi Gateway at ${g.gatewayUrl}: ${l.message}`, 0);
  }
}
const p = {
  currentPresentation: null,
  pipelineId: "pipgm1",
  matrixRoute: "both_projectors",
  currentSlide: 1,
  totalSlides: 1,
  ftb: !1,
  picMute: !1,
  tasks: /* @__PURE__ */ new Map()
}, fe = /^\d{4}-\d{2}-\d{2}(T\d{2})?$/;
function me(t) {
  const a = String(t ?? "").split(",").map((n) => n.trim()).filter(Boolean);
  if (a.length === 0) return null;
  for (const n of a) {
    const i = n.split("/");
    if (i.length > 2 || !i.every((s) => fe.test(s)))
      throw new Error(`"${n}" is not a service date. Use 2026-11-08, 2026-11-08T10 or a range 2026-11-08/2026-11-09.`);
  }
  return a.length === 1 ? a[0] : a;
}
async function be({ title: t, pages: a, useAt: n = null }) {
  try {
    return await h("/api/v1/canva/push", {
      method: "POST",
      body: JSON.stringify({
        title: t,
        pages: a.map((i) => ({
          pageNumber: i.pageNumber,
          url: i.url,
          name: i.name
        })),
        ...n ? { useAt: n } : {}
      })
    });
  } catch (i) {
    if (g.isDev && !(i instanceof x && i.status >= 400 && i.status < 500)) {
      console.warn("[canva-pieco-app] Gateway unreachable in dev mode - using local simulation:", i.message);
      const s = `pres_${Date.now()}`;
      p.currentPresentation = {
        presentationId: s,
        title: t,
        pages: a,
        pageCount: a.length
      }, p.totalSlides = a.length, p.currentSlide = 1;
      const l = `sim_${s}`;
      return p.tasks.set(l, { startedAt: Date.now(), presentationId: s, title: t, pageCount: a.length }), ne(l);
    }
    throw i;
  }
}
const he = 3e3;
function ne(t) {
  const a = p.tasks.get(t), n = Math.min(1, (Date.now() - a.startedAt) / he), i = a.pageCount, s = Math.min(i, Math.floor(n / 0.3 * i)), l = n >= 1, d = l ? "ready" : n < 0.3 ? "downloading" : n < 0.5 ? "unpacking" : "preparing", o = i * 2, v = n < 0.5 ? 0 : Math.min(o, Math.floor((n - 0.5) / 0.5 * o));
  return {
    taskId: t,
    presentationId: a.presentationId,
    title: a.title,
    state: d,
    progress: n,
    pageCount: i,
    downloaded: { done: n >= 0.3 ? i : s, total: i },
    pictures: { done: l ? o : v, total: n < 0.5 ? 0 : o },
    saved: n >= 0.5,
    ready: l,
    error: null,
    isSimulated: !0
  };
}
async function xe(t) {
  return p.tasks.has(t) ? ne(t) : h(`/api/v1/canva/tasks/${encodeURIComponent(t)}`, { timeoutMs: 5e3 });
}
async function ye(t, { onUpdate: a, pollMs: n = 700, timeoutMs: i = 15 * 6e4, sleep: s = (l) => new Promise((d) => setTimeout(d, l)) } = {}) {
  const l = Date.now() + i;
  let d = 0;
  for (; ; ) {
    let o;
    try {
      o = await xe(t), d = 0;
    } catch (v) {
      if (v instanceof x && v.status === 404 || ++d >= 5) throw v;
      await s(n);
      continue;
    }
    if (a && a(o), o.state === "failed") throw new x(o.error || "Preparing the slides failed", 500, o);
    if (o.state === "ready" && o.ready !== !1) return o;
    if (Date.now() > l) throw new x("Preparing the slides took too long", 504, o);
    await s(n);
  }
}
async function we({ presentationId: t, pipelineId: a, matrixRoute: n, unblankProjectors: i, cueSlide: s = 1, piOutput: l = null }) {
  try {
    return await h("/api/v1/canva/setup", {
      method: "POST",
      body: JSON.stringify({
        presentationId: t,
        pipelineId: a,
        matrixRoute: n,
        unblankProjectors: i,
        cueSlide: s,
        ...l ? { piOutput: l } : {}
      })
    });
  } catch (d) {
    if (g.isDev)
      return console.warn("[canva-pieco-app] Gateway unreachable in dev mode - simulating setup:", d.message), p.pipelineId = a, p.matrixRoute = n, p.currentSlide = s, i && (p.picMute = !1), {
        success: !0,
        pipelineId: a,
        matrixRoute: n,
        picMute: p.picMute,
        currentSlide: s,
        isSimulated: !0
      };
    throw d;
  }
}
async function ke({ pipelineId: t, action: a, page: n }) {
  try {
    return await h("/api/v1/canva/control", {
      method: "POST",
      body: JSON.stringify({
        pipelineId: t,
        action: a,
        page: n
      })
    });
  } catch (i) {
    if (g.isDev)
      return console.warn("[canva-pieco-app] Simulating slide control:", a, n), a === "next" ? p.currentSlide = Math.min(p.totalSlides, p.currentSlide + 1) : a === "prev" ? p.currentSlide = Math.max(1, p.currentSlide - 1) : a === "gotoPage" && typeof n == "number" && (p.currentSlide = Math.max(1, Math.min(p.totalSlides, n))), {
        success: !0,
        currentPage: p.currentSlide,
        isSimulated: !0
      };
    throw i;
  }
}
async function Se({ pipelineId: t, enabled: a }) {
  try {
    return await h("/api/v1/canva/control", {
      method: "POST",
      body: JSON.stringify({
        pipelineId: t,
        action: "ftb",
        enabled: a
      })
    });
  } catch (n) {
    if (g.isDev)
      return p.ftb = a, { success: !0, ftb: a, isSimulated: !0 };
    throw n;
  }
}
async function Ee({ muted: t, pipelineId: a }) {
  try {
    return await h("/api/v1/canva/control", {
      method: "POST",
      body: JSON.stringify({
        pipelineId: a,
        action: "picMute",
        muted: t
      })
    });
  } catch (n) {
    if (g.isDev)
      return p.picMute = t, { success: !0, muted: t, isSimulated: !0 };
    throw n;
  }
}
async function $e({
  title: t,
  image: a,
  imageUrl: n,
  movement: i = "fly-left",
  autoHideMs: s = 7e3,
  keyer: l = "usk",
  slot: d = 7
}) {
  try {
    return await h("/api/v1/graphics/canva/push", {
      method: "POST",
      body: JSON.stringify({
        title: t,
        image: a,
        imageUrl: n,
        movement: i,
        autoHideMs: s,
        keyer: l,
        slot: d
      })
    });
  } catch (o) {
    if (g.isDev)
      return console.warn("[canva-pieco-app] Gateway unreachable in dev mode - simulating graphics push:", o.message), {
        ok: !0,
        isSimulated: !0,
        title: t || "Canva Graphic",
        slot: d,
        mediaPlayer: 1,
        movement: i,
        keyer: l,
        autoHideMs: s
      };
    throw o;
  }
}
async function Pe({ keyer: t = "usk", index: a = 1 } = {}) {
  try {
    return await h("/api/v1/graphics/canva/off-air", {
      method: "POST",
      body: JSON.stringify({ keyer: t, index: a })
    });
  } catch (n) {
    if (g.isDev)
      return console.warn("[canva-pieco-app] Simulating graphic off-air:", n.message), { ok: !0, isSimulated: !0, offAir: !0, keyer: t, index: a };
    throw n;
  }
}
async function Ie(t = "pipgm1") {
  try {
    return await h(`/api/v1/canva/status?pipelineId=${t}`, { timeoutMs: 3e3 });
  } catch (a) {
    if (g.isDev)
      return {
        online: !1,
        isSimulated: !0,
        pipelineId: p.pipelineId,
        matrixRoute: p.matrixRoute,
        currentSlide: p.currentSlide,
        totalSlides: p.totalSlides,
        ftb: p.ftb,
        picMute: p.picMute
      };
    throw a;
  }
}
function Me(t) {
  const a = 30 + Math.round(Math.max(0, Math.min(1, t.progress ?? 0)) * 69), n = t.downloaded || { done: 0, total: t.pageCount || 0 }, i = t.pictures || { done: 0, total: 0 }, s = t.state === "ready" ? "Ready to present" : t.state === "downloading" || t.state === "queued" ? `Fetching slides from Canva ${n.done}/${n.total}` : t.state === "unpacking" ? "Unpacking slides in Pi Program..." : i.total > 0 ? `Making thumbnails ${i.done}/${i.total}` : "Preparing slides...";
  return { percent: t.state === "ready" ? 100 : a, label: s };
}
const e = {
  appMode: "slides",
  // "slides" | "graphics"
  currentStep: 1,
  // 1: Push, 2: Setup, 3: Live Control
  isExporting: !1,
  isPushing: !1,
  isSettingUp: !1,
  isControlling: !1,
  gatewayStatus: "checking",
  // online | simulated | offline | checking
  settingsOpen: !1,
  settingsError: "",
  // Broadcast Graphics (ATEM Flying Key & Live Driving)
  graphics: {
    isPushing: !1,
    movement: "fly-left",
    // fly-left | fly-right | fly-bottom | fly-top | zoom | dissolve | cut
    autoHideMs: 7e3,
    slot: 7,
    mediaPlayer: 1,
    keyer: "usk",
    onAir: !1,
    pages: [],
    cuedIndex: 1,
    onAirIndex: null,
    autoHideRemainingSeconds: null
  },
  // Export & Staging Progress
  progress: {
    visible: !1,
    percent: 0,
    label: ""
  },
  // Staged presentation from Step 1
  staged: {
    presentationId: null,
    title: "",
    pageCount: 0,
    pages: []
  },
  // Service date for the staged content (sent as useAt on push), empty = none
  serviceDate: "",
  // Presentation setup configuration for Step 2
  setup: {
    piOutput: "",
    // "" = gateway default, "pi1" | "pi2"
    pipelineId: "pipgm1",
    matrixRoute: "both_projectors",
    unblankProjectors: !0,
    cueSlide: 1
  },
  // Live presentation controls for Step 3
  live: {
    pipelineId: "pipgm1",
    matrixRoute: "both_projectors",
    currentSlide: 1,
    totalSlides: 1,
    ftb: !1,
    picMute: !1,
    pages: []
  },
  toast: null
};
let M = null;
function u(t, a = "info", n = 4e3) {
  M && clearTimeout(M), e.toast = { message: t, type: a }, r(), M = setTimeout(() => {
    e.toast = null, r();
  }, n);
}
function y(t, a) {
  e.progress.visible = !0, e.progress.percent = Math.min(100, Math.max(0, Math.round(t))), e.progress.label = a || "Processing...", r();
}
function Z(t) {
  const { percent: a, label: n } = Me(t);
  y(a, n);
}
function m() {
  e.progress.visible = !1, e.progress.percent = 0, e.progress.label = "", r();
}
function Ae() {
  return e.progress.visible ? `
    <div class="progress-container">
      <div class="progress-header">
        <span class="progress-label">${e.progress.label}</span>
        <span class="progress-percent">${e.progress.percent}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${e.progress.percent}%;"></div>
      </div>
    </div>
  ` : "";
}
async function Q() {
  if (e.isExporting || e.isPushing) return;
  let t = null;
  try {
    t = me(e.serviceDate);
  } catch (a) {
    u(a.message, "error");
    return;
  }
  try {
    e.isExporting = !0, y(15, "Exporting slides from Canva..."), r();
    const a = await ae();
    if (e.isExporting = !1, a.status === "aborted") {
      m(), u("Export was cancelled.", "info"), r();
      return;
    }
    if (!a.exportBlobs || a.exportBlobs.length === 0) {
      m(), u("No pages were exported from Canva.", "error"), r();
      return;
    }
    e.isPushing = !0, y(30, `Sending ${a.exportBlobs.length} slides to the church...`), r();
    const n = await be({
      title: a.title || "Canva Slides",
      pages: a.exportBlobs,
      useAt: t
    });
    Z(n);
    const i = await ye(n.taskId, { onUpdate: Z });
    e.isPushing = !1, e.staged = {
      presentationId: i.presentationId || n.presentationId,
      title: a.title || "Canva Presentation",
      pageCount: a.exportBlobs.length,
      pages: a.exportBlobs
    }, e.currentStep = 2, m(), u(`Pushed ${a.exportBlobs.length} slides to church storage!`, "success"), r();
  } catch (a) {
    m(), e.isExporting = !1, e.isPushing = !1, console.error("[canva-pieco-app] Push failed:", a), u(a.message || "Failed to push slides.", "error"), r();
  }
}
async function Te() {
  if (!e.isSettingUp)
    try {
      e.isSettingUp = !0, r();
      const t = await we({
        presentationId: e.staged.presentationId,
        pipelineId: e.setup.pipelineId,
        matrixRoute: e.setup.matrixRoute,
        unblankProjectors: e.setup.unblankProjectors,
        cueSlide: e.setup.cueSlide,
        piOutput: e.setup.piOutput || null
      });
      e.isSettingUp = !1, e.live = {
        pipelineId: e.setup.pipelineId,
        matrixRoute: e.setup.matrixRoute,
        currentSlide: e.setup.cueSlide || 1,
        totalSlides: e.staged.pageCount || 1,
        ftb: !1,
        picMute: t.picMute ?? !1,
        pages: e.staged.pages
      }, e.currentStep = 3, u("Presentation armed & routed live to displays!", "success"), r();
    } catch (t) {
      e.isSettingUp = !1, console.error("[canva-pieco-app] Setup failed:", t), u(t.message || "Failed to configure presentation pipeline.", "error"), r();
    }
}
async function w(t, a = null) {
  if (e.isControlling) return;
  let n = e.live.currentSlide;
  if (t === "next") {
    if (e.live.currentSlide >= e.live.totalSlides) return;
    n = e.live.currentSlide + 1;
  } else if (t === "prev") {
    if (e.live.currentSlide <= 1) return;
    n = e.live.currentSlide - 1;
  } else t === "gotoPage" && a && (n = Math.max(1, Math.min(e.live.totalSlides, a)));
  e.live.currentSlide = n, r();
  try {
    e.isControlling = !0;
    const i = await ke({
      pipelineId: e.live.pipelineId,
      action: t,
      page: t === "gotoPage" ? n : void 0
    });
    e.isControlling = !1, i && typeof i.currentPage == "number" && (e.live.currentSlide = i.currentPage), r();
  } catch (i) {
    e.isControlling = !1, console.error("[canva-pieco-app] Slide control failed:", i), u(i.message || "Failed to change slide.", "error"), r();
  }
}
async function ie() {
  const t = !e.live.ftb;
  e.live.ftb = t, r();
  try {
    await Se({
      pipelineId: e.live.pipelineId,
      enabled: t
    }), u(t ? "Fade to Black (FTB) ACTIVE" : "Fade to Black OFF", t ? "info" : "success", 2e3);
  } catch (a) {
    e.live.ftb = !t, console.error("[canva-pieco-app] FTB failed:", a), u(a.message || "Failed to toggle FTB.", "error");
  }
  r();
}
async function re() {
  const t = !e.live.picMute;
  e.live.picMute = t, r();
  try {
    await Ee({ muted: t, pipelineId: e.live.pipelineId }), u(t ? "Projector Pic Mute ON (Beams Blanked)" : "Projector Pic Mute OFF (Beams Live)", t ? "info" : "success", 2500);
  } catch (a) {
    e.live.picMute = !t, console.error("[canva-pieco-app] Pic Mute failed:", a), u(a.message || "Failed to toggle projector mute.", "error");
  }
  r();
}
window.addEventListener("keydown", (t) => {
  if (!(t.target && ["INPUT", "SELECT", "TEXTAREA"].includes(t.target.tagName))) {
    if (e.appMode === "graphics") {
      t.key === " " || t.key === "Enter" ? (t.preventDefault(), e.graphics.onAir ? $() : se()) : t.key === "Escape" ? (t.preventDefault(), $()) : t.key === "ArrowDown" || t.key === "ArrowRight" ? (t.preventDefault(), P("next")) : (t.key === "ArrowUp" || t.key === "ArrowLeft") && (t.preventDefault(), P("prev"));
      return;
    }
    e.currentStep === 3 && (t.key === "ArrowRight" || t.key === "PageDown" || t.key === " " ? (t.preventDefault(), w("next")) : t.key === "ArrowLeft" || t.key === "PageUp" ? (t.preventDefault(), w("prev")) : t.key === "b" || t.key === "B" ? (t.preventDefault(), ie()) : (t.key === "m" || t.key === "M") && (t.preventDefault(), re()));
  }
});
let b = null;
async function ee() {
  if (!e.graphics.isPushing)
    try {
      e.graphics.isPushing = !0, y(20, "Exporting transparent graphics deck from Canva..."), r();
      const t = await ae();
      if (t.status === "aborted") {
        m(), e.graphics.isPushing = !1, u("Graphic export was cancelled.", "info"), r();
        return;
      }
      if (!t.exportBlobs || t.exportBlobs.length === 0) {
        m(), e.graphics.isPushing = !1, u("No pages were exported from Canva.", "error"), r();
        return;
      }
      y(70, `Staged ${t.exportBlobs.length} graphics for ATEM live driving...`), e.graphics.pages = t.exportBlobs, e.graphics.cuedIndex = 1, y(100, "Graphics deck ready for on-air driving!"), setTimeout(() => {
        m(), e.graphics.isPushing = !1, u(`Loaded ${t.exportBlobs.length} graphics into live driving deck!`, "success"), r();
      }, 200);
    } catch (t) {
      m(), e.graphics.isPushing = !1, u(`Failed to export graphics: ${t.message}`, "error"), r();
    }
}
async function se(t) {
  const a = e.graphics.cuedIndex, n = e.graphics.pages && e.graphics.pages[a - 1];
  if (!n) {
    u("No graphic selected to fly.", "error");
    return;
  }
  e.graphics.cuedIndex = a, e.graphics.isPushing = !0, y(50, `Flown to ATEM: ${n.name || `Graphic ${a}`}...`), r();
  try {
    const i = n.name || `Graphic ${a}`;
    if (await $e({
      title: i,
      imageUrl: n.url,
      movement: e.graphics.movement,
      autoHideMs: e.graphics.autoHideMs,
      slot: e.graphics.slot,
      mediaPlayer: e.graphics.mediaPlayer,
      keyer: e.graphics.keyer
    }), e.graphics.isPushing = !1, e.graphics.onAir = !0, e.graphics.onAirIndex = a, m(), u(`ON AIR: ${i} (${e.graphics.movement})`, "success"), b && (clearInterval(b), b = null), e.graphics.autoHideMs > 0) {
      let s = Math.round(e.graphics.autoHideMs / 1e3);
      e.graphics.autoHideRemainingSeconds = s, r(), b = setInterval(() => {
        s -= 1, e.graphics.autoHideRemainingSeconds = s, s <= 0 && (clearInterval(b), b = null, e.graphics.onAir = !1, e.graphics.onAirIndex = null, e.graphics.autoHideRemainingSeconds = null), r();
      }, 1e3);
    } else
      e.graphics.autoHideRemainingSeconds = null, r();
  } catch (i) {
    m(), e.graphics.isPushing = !1, u(`Failed to fly graphic: ${i.message}`, "error"), r();
  }
}
async function $() {
  b && (clearInterval(b), b = null);
  try {
    await Pe({ keyer: e.graphics.keyer, index: 1 }), e.graphics.onAir = !1, e.graphics.onAirIndex = null, e.graphics.autoHideRemainingSeconds = null, u("Graphic taken off air.", "info"), r();
  } catch (t) {
    u(`Failed to take off air: ${t.message}`, "error");
  }
}
function P(t) {
  if (!e.graphics.pages || e.graphics.pages.length === 0) return;
  const a = e.graphics.pages.length;
  t === "next" ? e.graphics.cuedIndex = e.graphics.cuedIndex >= a ? 1 : e.graphics.cuedIndex + 1 : t === "prev" && (e.graphics.cuedIndex = e.graphics.cuedIndex <= 1 ? a : e.graphics.cuedIndex - 1), r();
}
async function I() {
  if (!e.settingsOpen) {
    try {
      const t = await Ie(e.live.pipelineId);
      e.gatewayStatus = t.isSimulated ? "simulated" : "online";
    } catch {
      e.gatewayStatus = "offline";
    }
    r();
  }
}
setInterval(I, 15e3);
I();
function k(t) {
  return String(t ?? "").replace(/[&<>"']/g, (a) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[a]);
}
function Be() {
  return e.settingsOpen ? `
    <form class="settings-form" id="settings-form">
      <label>Gateway address (https)
        <input type="url" id="settings-url" value="${k(g.gatewayUrl)}" required autocomplete="off" />
      </label>
      <label>Access key
        <input type="password" id="settings-key" value="${k(g.gatewayApiKey)}" autocomplete="off" />
      </label>
      ${e.settingsError ? `<div class="settings-error">${k(e.settingsError)}</div>` : ""}
      <div class="settings-actions">
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn btn-secondary" id="settings-reset">Use built-in defaults</button>
        <button type="button" class="btn btn-secondary" id="settings-close">Close</button>
      </div>
    </form>
  ` : "";
}
function Ce() {
  const t = e.gatewayStatus === "online" ? "online" : e.gatewayStatus === "simulated" ? "simulated" : "offline", a = e.gatewayStatus === "online" ? "Gateway Connected" : e.gatewayStatus === "simulated" ? "Simulated Dev" : "Gateway Offline";
  return `
    <header class="app-header">
      <div class="header-top">
        <div class="brand-title">
          <span class="church-badge">Church</span>
          <span>${g.appName}</span>
        </div>
        <div class="status-pill" title="Gateway: ${k(g.gatewayUrl)}">
          <span class="status-dot ${t}"></span>
          <span>${a}</span>
        </div>
      </div>
      <div class="target-info">
        Target: <strong>${k(g.gatewayUrl)}</strong>
        <button type="button" class="link-btn" id="btn-settings">Settings</button>
      </div>
      ${Be()}
      <div class="mode-switcher" style="margin-top: 4px;">
        <button class="mode-btn ${e.appMode === "slides" ? "active" : ""}" data-mode="slides">
          📽 Slide Presentation
        </button>
        <button class="mode-btn ${e.appMode === "graphics" ? "active" : ""}" data-mode="graphics">
          🎬 ATEM Graphic (Fly Key)
        </button>
      </div>
    </header>
  `;
}
function _e() {
  const t = e.graphics.isPushing, a = e.graphics.onAir, n = e.graphics.pages || [], i = n.length, s = Math.max(1, Math.min(i || 1, e.graphics.cuedIndex || 1)), l = n[s - 1];
  if (i === 0)
    return `
      <section class="view-card">
        <div class="card-title">
          <span>🎬 Stream Graphics (Fly Key)</span>
          <span class="status-pill offline" style="font-weight: 700;">● OFF AIR</span>
        </div>
        <div class="card-subtitle">
          Export transparent overlays, scripture straps, lower-thirds, or song titles from Canva and drive them live to ATEM Media Player with smooth DVE Flying Key motion.
        </div>

        <button class="btn-primary" id="btn-export-graphics" style="width: 100%; margin: 14px 0 8px;" ${t ? "disabled" : ""}>
          ${t ? '<span class="spinner"></span> Loading Deck from Canva...' : "📥 Load Graphics Deck from Canva"}
        </button>

        <!-- Movement Selection -->
        <div class="form-group" style="margin-top: 10px;">
          <label class="form-label">Default Movement (ATEM Flying Key)</label>
          <select class="select-input" id="select-graphic-movement">
            <option value="fly-left" ${e.graphics.movement === "fly-left" ? "selected" : ""}>🚀 Fly in from Left (Smooth Slide)</option>
            <option value="fly-right" ${e.graphics.movement === "fly-right" ? "selected" : ""}>🚀 Fly in from Right</option>
            <option value="fly-bottom" ${e.graphics.movement === "fly-bottom" ? "selected" : ""}>⬆ Fly in from Bottom (Pop-Up)</option>
            <option value="fly-top" ${e.graphics.movement === "fly-top" ? "selected" : ""}>⬇ Fly in from Top (Drop-Down)</option>
            <option value="zoom" ${e.graphics.movement === "zoom" ? "selected" : ""}>🔍 Zoom / Grow from Center</option>
            <option value="dissolve" ${e.graphics.movement === "dissolve" ? "selected" : ""}>✨ Dissolve / Mix Fade</option>
            <option value="cut" ${e.graphics.movement === "cut" ? "selected" : ""}>⚡ Cut (Instant)</option>
          </select>
        </div>

        <!-- Auto-Hide Duration -->
        <div class="form-group">
          <label class="form-label">On-Air Duration (Auto-Hide)</label>
          <select class="select-input" id="select-graphic-autohide">
            <option value="0" ${e.graphics.autoHideMs === 0 ? "selected" : ""}>Manual (Hold until dismissed)</option>
            <option value="5000" ${e.graphics.autoHideMs === 5e3 ? "selected" : ""}>5 seconds</option>
            <option value="7000" ${e.graphics.autoHideMs === 7e3 ? "selected" : ""}>7 seconds (Standard Lower Third)</option>
            <option value="10000" ${e.graphics.autoHideMs === 1e4 ? "selected" : ""}>10 seconds</option>
            <option value="15000" ${e.graphics.autoHideMs === 15e3 ? "selected" : ""}>15 seconds</option>
          </select>
        </div>

        ${B() ? "" : `<div style="font-size: 11px; color: var(--accent-amber); text-align: center; margin-top: 8px;">
                Running in Dev Mock Mode: loads simulated graphics deck.
              </div>`}
      </section>
    `;
  const d = a && e.graphics.onAirIndex === s;
  return `
    <section class="view-card">
      <div class="card-title">
        <span>🎬 Stream Graphics Deck</span>
        <span class="status-pill ${a ? "online" : "offline"}" style="font-weight: 700;">
          ${a ? `● ON AIR ${e.graphics.autoHideRemainingSeconds ? `(${e.graphics.autoHideRemainingSeconds}s)` : ""}` : "● OFF AIR"}
        </span>
      </div>

      <!-- Live Driving Cued Graphic Box -->
      <div class="graphics-deck">
        <div class="graphic-cued-box ${d ? "on-air" : ""}">
          <div class="on-air-tag ${d ? "live" : "cued"}">
            ${d ? "● LIVE ON AIR" : "CUED"}
          </div>
          <div class="graphic-preview-wrap">
            <img class="graphic-preview-img" src="${l ? l.url : ""}" alt="${l ? l.name : "Graphic"}" />
          </div>
          <div class="graphic-title-label">
            ${l ? l.name || `Graphic ${s}` : `Graphic ${s}`}
          </div>
          <div class="graphic-hotkey-bar">
            <span>[Space / Enter] Fly</span>
            <span>•</span>
            <span>[Esc] Off Air</span>
            <span>•</span>
            <span>[↑ / ↓] Cue</span>
          </div>
        </div>

        <!-- Big Navigation & Fly Controls -->
        <div class="nav-buttons-row">
          <button class="btn-nav btn-nav-prev" id="btn-prev-graphic">
            <span>◀ PREV</span>
            <span class="nav-key-hint">[Up / Left]</span>
          </button>
          <button class="btn-nav btn-nav-next" id="btn-next-graphic">
            <span>NEXT ▶</span>
            <span class="nav-key-hint">[Down / Right]</span>
          </button>
        </div>

        <!-- Fly Drive Button -->
        <button class="btn-primary" id="btn-fly-toggle" style="background-color: ${a ? "var(--accent-red)" : "var(--accent-blue)"}; width: 100%; font-size: 14px; font-weight: 800; padding: 12px; letter-spacing: 0.5px;" ${t ? "disabled" : ""}>
          ${t ? '<span class="spinner"></span> Flying to ATEM...' : a ? "⏹ TAKE OFF AIR [Space / Esc]" : `🚀 FLY ON AIR (${e.graphics.movement.toUpperCase()}) [Space]`}
        </button>

        <!-- Graphic Thumbnails Drawer -->
        <div class="form-label" style="margin-top: 4px;">Jump / Cue Graphic (${s} of ${i})</div>
        <div class="thumbnails-strip">
          ${n.map(
    (o, v) => `
            <div class="thumb-card ${v + 1 === s ? "active" : ""}" data-cue-graphic="${v + 1}" title="${o.name || `Graphic ${v + 1}`}">
              <img src="${o.url}" alt="${o.name || `Graphic ${v + 1}`}" />
              <span class="thumb-number">${v + 1}</span>
            </div>
          `
  ).join("")}
        </div>

        <!-- Flying Key Motion & Duration Settings -->
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <div style="flex: 1;">
            <label class="form-label">Movement</label>
            <select class="select-input" id="select-graphic-movement">
              <option value="fly-left" ${e.graphics.movement === "fly-left" ? "selected" : ""}>🚀 Fly Left</option>
              <option value="fly-right" ${e.graphics.movement === "fly-right" ? "selected" : ""}>🚀 Fly Right</option>
              <option value="fly-bottom" ${e.graphics.movement === "fly-bottom" ? "selected" : ""}>⬆ Fly Bottom</option>
              <option value="fly-top" ${e.graphics.movement === "fly-top" ? "selected" : ""}>⬇ Fly Top</option>
              <option value="zoom" ${e.graphics.movement === "zoom" ? "selected" : ""}>🔍 Zoom</option>
              <option value="dissolve" ${e.graphics.movement === "dissolve" ? "selected" : ""}>✨ Dissolve</option>
              <option value="cut" ${e.graphics.movement === "cut" ? "selected" : ""}>⚡ Cut</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label class="form-label">Auto-Hide</label>
            <select class="select-input" id="select-graphic-autohide">
              <option value="0" ${e.graphics.autoHideMs === 0 ? "selected" : ""}>Manual</option>
              <option value="5000" ${e.graphics.autoHideMs === 5e3 ? "selected" : ""}>5s</option>
              <option value="7000" ${e.graphics.autoHideMs === 7e3 ? "selected" : ""}>7s</option>
              <option value="10000" ${e.graphics.autoHideMs === 1e4 ? "selected" : ""}>10s</option>
              <option value="15000" ${e.graphics.autoHideMs === 15e3 ? "selected" : ""}>15s</option>
            </select>
          </div>
        </div>

        <!-- Destination Slot & Keyer -->
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <label class="form-label">Media Player</label>
            <select class="select-input" id="select-graphic-player">
              <option value="1" ${e.graphics.mediaPlayer === 1 ? "selected" : ""}>Media Player 1</option>
              <option value="2" ${e.graphics.mediaPlayer === 2 ? "selected" : ""}>Media Player 2</option>
            </select>
          </div>
          <div style="flex: 1;">
            <label class="form-label">ATEM Pool Slot</label>
            <select class="select-input" id="select-graphic-slot">
              <option value="7" ${e.graphics.slot === 7 ? "selected" : ""}>Slot 7</option>
              <option value="8" ${e.graphics.slot === 8 ? "selected" : ""}>Slot 8</option>
              <option value="9" ${e.graphics.slot === 9 ? "selected" : ""}>Slot 9</option>
              <option value="10" ${e.graphics.slot === 10 ? "selected" : ""}>Slot 10</option>
            </select>
          </div>
        </div>

        <div class="footer-actions" style="margin-top: 6px;">
          <button class="link-btn" id="btn-reexport-graphics">🔄 Re-export Graphics from Canva</button>
          <button class="link-btn" id="btn-graphic-offair" style="color: var(--accent-red);" ${a ? "" : "disabled"}>⏹ Force Off Air</button>
        </div>
      </div>
    </section>
  `;
}
function De() {
  return `
    <nav class="step-nav" aria-label="Workflow Steps">
      <button class="step-tab ${e.currentStep === 1 ? "active" : ""}" data-step="1">
        <span>1. Push</span>
      </button>
      <button class="step-tab ${e.currentStep === 2 ? "active" : ""}" ${e.staged.presentationId ? "" : "disabled"} data-step="2">
        <span>2. Setup</span>
      </button>
      <button class="step-tab ${e.currentStep === 3 ? "active" : ""}" ${e.live.totalSlides <= 1 && !e.staged.presentationId ? "disabled" : ""} data-step="3">
        <span>3. Live</span>
      </button>
    </nav>
  `;
}
function Re() {
  return e.toast ? `
    <div class="toast-bar ${e.toast.type}">
      <span>${e.toast.message}</span>
    </div>
  ` : "";
}
function Le() {
  const t = e.isExporting || e.isPushing, a = e.isExporting ? '<span class="spinner"></span> Exporting from Canva...' : e.isPushing ? '<span class="spinner"></span> Uploading to Pi Storage...' : "📤 Push Content to Church";
  return `
    <section class="view-card">
      <div class="card-title">
        <span>Step 1: Push Content</span>
        <span style="font-size: 11px; color: var(--text-dim);">Stage Media</span>
      </div>
      ${e.staged.pages && e.staged.pages.length > 0 ? `
      <div class="export-meta">
        <div class="meta-row">
          <span class="meta-label">Title:</span>
          <span class="meta-value">${e.staged.title || "Untitled Presentation"}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Staged Slides:</span>
          <span class="meta-value">${e.staged.pageCount} pages</span>
        </div>
      </div>
      <div class="preview-grid">
        ${e.staged.pages.map(
    (i) => `
          <div class="preview-item">
            <img src="${i.url}" alt="Slide ${i.pageNumber}" />
            <span class="preview-badge">${i.pageNumber}</span>
          </div>
        `
  ).join("")}
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-primary" id="btn-repush" style="flex: 1;" ${t ? "disabled" : ""}>
          ${a}
        </button>
        <button class="btn-secondary" id="btn-goto-step2" style="flex: 1;">
          Proceed to Setup ➔
        </button>
      </div>
    ` : `
      <div class="card-subtitle">
        Export slides from your active Canva design directly into Pi Program church storage. Pushing saves your content safely without changing live screens.
      </div>
      <div class="form-group">
        <label class="form-label" for="input-service-date">Service date (optional)</label>
        <input type="text" class="select-input" id="input-service-date" value="${k(e.serviceDate)}" placeholder="2026-11-08 or 2026-11-08T10" autocomplete="off" />
        <div class="checkbox-hint">Empty = no date. Several dates separated by commas; a range as 2026-11-08/2026-11-09.</div>
      </div>
      <button class="btn-primary" id="btn-push" ${t ? "disabled" : ""}>
        ${a}
      </button>
      ${B() ? "" : `<div style="font-size: 11px; color: var(--accent-amber); text-align: center; margin-top: 4px;">
              Running outside Canva sandbox: will use simulated design export.
            </div>`}
    `}
    </section>
  `;
}
function Oe() {
  const t = e.isSettingUp, a = e.setup.pipelineId === "pipgm1";
  return `
    <section class="view-card">
      <div class="card-title">
        <span>Step 2: Presentation Setup</span>
        <span style="font-size: 11px; color: var(--text-dim);">${e.staged.pageCount} slides ready</span>
      </div>
      <div class="card-subtitle">
        Configure which Pi Program pipeline will present this content, where to route it on the Pi Matrix, and projector shutter options.
      </div>

      <!-- Pipeline Selection -->
      <div class="form-group">
        <label class="form-label">Presentation Pipeline</label>
        <div class="radio-tiles">
          <div class="radio-tile ${a ? "selected" : ""}" data-pipeline="pipgm1">
            <span class="tile-title">Pi Program 1</span>
            <span class="tile-desc">Primary service pipeline</span>
          </div>
          <div class="radio-tile ${a ? "" : "selected"}" data-pipeline="pipgm2">
            <span class="tile-title">Pi Program 2</span>
            <span class="tile-desc">Secondary / split pipeline</span>
          </div>
        </div>
      </div>

      <!-- Matrix Routing Destination -->
      <div class="form-group">
        <label class="form-label">Pi Matrix Routing Destination</label>
        <select class="select-input" id="select-matrix-route">
          <option value="both_projectors" ${e.setup.matrixRoute === "both_projectors" ? "selected" : ""}>Both Projectors (Stage Left & Right)</option>
          <option value="landscape_screen" ${e.setup.matrixRoute === "landscape_screen" ? "selected" : ""}>Landscape Screen (Side Wall)</option>
          <option value="all_displays" ${e.setup.matrixRoute === "all_displays" ? "selected" : ""}>All Church Displays</option>
          <option value="none" ${e.setup.matrixRoute === "none" ? "selected" : ""}>Keep Existing Matrix Routing</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="select-pi-output">Pi Output (Atlona input)</label>
        <select class="select-input" id="select-pi-output">
          <option value="" ${e.setup.piOutput ? "" : "selected"}>Gateway default</option>
          <option value="pi1" ${e.setup.piOutput === "pi1" ? "selected" : ""}>Pi 1 (Atlona input 3)</option>
          <option value="pi2" ${e.setup.piOutput === "pi2" ? "selected" : ""}>Pi 2 (Atlona input 4)</option>
        </select>
      </div>

      <!-- Projector Picture Mute Option -->
      <label class="checkbox-row">
        <input type="checkbox" id="chk-unblank" ${e.setup.unblankProjectors ? "checked" : ""} />
        <div>
          <div class="checkbox-label">Unblank Projectors (Turn OFF Pic Mute)</div>
          <div class="checkbox-hint">Ensures physical projector beams open when activating live</div>
        </div>
      </label>

      <!-- Cue Slide 1 -->
      <label class="checkbox-row">
        <input type="checkbox" id="chk-cue" ${e.setup.cueSlide === 1 ? "checked" : ""} />
        <div>
          <div class="checkbox-label">Cue Slide 1 Immediately</div>
          <div class="checkbox-hint">Prepares first slide on the pipeline stage</div>
        </div>
      </label>

      <button class="btn-primary" id="btn-apply-setup" ${t ? "disabled" : ""}>
        ${t ? '<span class="spinner"></span> Configuring Pipeline...' : "🚀 Apply Pipeline & Go Live"}
      </button>

      <div class="footer-actions">
        <button class="link-btn" id="btn-back-step1">◀ Back to Step 1 (Push Content)</button>
      </div>
    </section>
  `;
}
function Fe() {
  const t = e.live.currentSlide, a = e.live.totalSlides, n = t <= 1, i = t >= a, s = e.live.pages && e.live.pages[t - 1] ? e.live.pages[t - 1].name || `Slide ${t}` : `Slide ${t}`, l = e.live.matrixRoute === "both_projectors" ? "Both Projectors" : e.live.matrixRoute === "landscape_screen" ? "Landscape Screen" : e.live.matrixRoute === "all_displays" ? "All Displays" : "Custom Route";
  return `
    <section class="view-card">
      <!-- Live Status Banner -->
      <div class="live-banner">
        <div class="live-pill">
          <span class="live-pulse"></span>
          <span>LIVE: ${e.live.pipelineId.toUpperCase()}</span>
        </div>
        <div class="live-routing-badge">➔ ${l}</div>
      </div>

      <!-- Prominent Slide Display -->
      <div class="slide-display-box">
        <div class="slide-count-label">Current Slide</div>
        <div class="slide-number-big">${t} <span style="font-size: 20px; color: var(--text-dim); font-weight: 500;">/ ${a}</span></div>
        <div class="slide-title-preview">${s}</div>
      </div>

      <!-- Big Navigation Buttons -->
      <div class="nav-buttons-row">
        <button class="btn-nav btn-nav-prev" id="btn-prev-slide" ${n ? "disabled" : ""}>
          <span>◀ PREVIOUS</span>
          <span class="nav-key-hint">[Left Arrow]</span>
        </button>
        <button class="btn-nav btn-nav-next" id="btn-next-slide" ${i ? "disabled" : ""}>
          <span>NEXT ▶</span>
          <span class="nav-key-hint">[Right / Space]</span>
        </button>
      </div>

      <!-- Quick Thumbnail Drawer -->
      ${e.live.pages && e.live.pages.length > 0 ? `
        <div class="form-label" style="margin-top: 4px;">Jump to Slide</div>
        <div class="thumbnails-strip">
          ${e.live.pages.map(
    (d, o) => `
            <div class="thumb-card ${o + 1 === t ? "active" : ""}" data-jump="${o + 1}" title="Slide ${o + 1}">
              <img src="${d.url}" alt="Slide ${o + 1}" />
              <span class="thumb-number">${o + 1}</span>
            </div>
          `
  ).join("")}
        </div>
      ` : ""}

      <!-- Emergency Shutter & Blackout Controls -->
      <div class="form-label" style="margin-top: 6px;">Output & Shutter Controls</div>
      <div class="quick-controls-grid">
        <button class="btn-toggle-active btn-toggle-ftb ${e.live.ftb ? "active" : ""}" id="btn-toggle-ftb">
          <span>⚫ ${e.live.ftb ? "FTB ACTIVE (BLACK)" : "Fade to Black (FTB)"}</span>
          <span style="font-size: 9px; opacity: 0.8;">[Key B]</span>
        </button>

        <button class="btn-toggle-active btn-toggle-picmute ${e.live.picMute ? "active" : ""}" id="btn-toggle-picmute">
          <span>📽️ ${e.live.picMute ? "PROJECTOR MUTED" : "Pic Mute (Beam)"}</span>
          <span style="font-size: 9px; opacity: 0.8;">[Key M]</span>
        </button>
      </div>

      <div class="footer-actions">
        <button class="link-btn" id="btn-restart-slide1">⏮ Restart (Slide 1)</button>
        <button class="link-btn" id="btn-back-setup">⚙️ Pipeline Settings</button>
      </div>
    </section>
  `;
}
function r() {
  const t = document.getElementById("app");
  if (!t) return;
  const a = e.appMode === "graphics";
  let n = "";
  a ? n = _e() : e.currentStep === 1 ? n = Le() : e.currentStep === 2 ? n = Oe() : e.currentStep === 3 && (n = Fe()), t.innerHTML = `
    ${Ce()}
    ${Ae()}
    ${a ? "" : De()}
    ${Re()}
    ${n}
  `, ze();
}
function ze() {
  const t = document.getElementById("btn-settings");
  t && t.addEventListener("click", () => {
    e.settingsOpen = !e.settingsOpen, e.settingsError = "", r();
  });
  const a = document.getElementById("settings-form");
  a && (a.addEventListener("submit", (c) => {
    c.preventDefault();
    try {
      ce({
        gatewayUrl: document.getElementById("settings-url").value,
        gatewayApiKey: document.getElementById("settings-key").value
      }), e.settingsOpen = !1, e.settingsError = "", e.gatewayStatus = "checking", r(), I();
    } catch (f) {
      e.settingsError = f.message, r();
    }
  }), document.getElementById("settings-reset")?.addEventListener("click", () => {
    de(), e.settingsOpen = !1, e.gatewayStatus = "checking", r(), I();
  }), document.getElementById("settings-close")?.addEventListener("click", () => {
    e.settingsOpen = !1, r();
  })), document.querySelectorAll(".mode-btn").forEach((c) => {
    c.addEventListener("click", () => {
      const f = c.dataset.mode;
      f && f !== e.appMode && (e.appMode = f, r());
    });
  });
  const n = document.getElementById("btn-export-graphics");
  n && n.addEventListener("click", ee);
  const i = document.getElementById("btn-reexport-graphics");
  i && i.addEventListener("click", ee);
  const s = document.getElementById("btn-fly-toggle");
  s && s.addEventListener("click", () => {
    e.graphics.onAir ? $() : se();
  });
  const l = document.getElementById("btn-graphic-offair");
  l && l.addEventListener("click", $);
  const d = document.getElementById("btn-prev-graphic");
  d && d.addEventListener("click", () => P("prev"));
  const o = document.getElementById("btn-next-graphic");
  o && o.addEventListener("click", () => P("next")), document.querySelectorAll("[data-cue-graphic]").forEach((c) => {
    c.addEventListener("click", () => {
      const f = parseInt(c.dataset.cueGraphic, 10);
      f && (e.graphics.cuedIndex = f, r());
    });
  });
  const v = document.getElementById("select-graphic-movement");
  v && v.addEventListener("change", (c) => {
    e.graphics.movement = c.target.value;
  });
  const S = document.getElementById("select-graphic-autohide");
  S && S.addEventListener("change", (c) => {
    e.graphics.autoHideMs = parseInt(c.target.value, 10);
  });
  const C = document.getElementById("select-graphic-slot");
  C && C.addEventListener("change", (c) => {
    e.graphics.slot = parseInt(c.target.value, 10);
  });
  const _ = document.getElementById("select-graphic-player");
  _ && _.addEventListener("change", (c) => {
    e.graphics.mediaPlayer = parseInt(c.target.value, 10);
  }), document.querySelectorAll(".step-tab").forEach((c) => {
    c.addEventListener("click", () => {
      const f = parseInt(c.dataset.step, 10);
      f && f !== e.currentStep && (e.currentStep = f, r());
    });
  });
  const D = document.getElementById("btn-push");
  D && D.addEventListener("click", Q);
  const R = document.getElementById("btn-repush");
  R && R.addEventListener("click", Q);
  const L = document.getElementById("btn-goto-step2");
  L && L.addEventListener("click", () => {
    e.currentStep = 2, r();
  }), document.querySelectorAll(".radio-tile").forEach((c) => {
    c.addEventListener("click", () => {
      e.setup.pipelineId = c.dataset.pipeline, r();
    });
  });
  const O = document.getElementById("select-matrix-route");
  O && O.addEventListener("change", (c) => {
    e.setup.matrixRoute = c.target.value;
  });
  const F = document.getElementById("input-service-date");
  F && F.addEventListener("input", (c) => {
    e.serviceDate = c.target.value;
  });
  const z = document.getElementById("select-pi-output");
  z && z.addEventListener("change", (c) => {
    e.setup.piOutput = c.target.value;
  });
  const G = document.getElementById("chk-unblank");
  G && G.addEventListener("change", (c) => {
    e.setup.unblankProjectors = c.target.checked;
  });
  const j = document.getElementById("chk-cue");
  j && j.addEventListener("change", (c) => {
    e.setup.cueSlide = c.target.checked ? 1 : null;
  });
  const U = document.getElementById("btn-apply-setup");
  U && U.addEventListener("click", Te);
  const N = document.getElementById("btn-back-step1");
  N && N.addEventListener("click", () => {
    e.currentStep = 1, r();
  });
  const H = document.getElementById("btn-prev-slide");
  H && H.addEventListener("click", () => w("prev"));
  const K = document.getElementById("btn-next-slide");
  K && K.addEventListener("click", () => w("next")), document.querySelectorAll("[data-jump]").forEach((c) => {
    c.addEventListener("click", () => {
      const f = parseInt(c.dataset.jump, 10);
      f && w("gotoPage", f);
    });
  });
  const V = document.getElementById("btn-toggle-ftb");
  V && V.addEventListener("click", ie);
  const q = document.getElementById("btn-toggle-picmute");
  q && q.addEventListener("click", re);
  const J = document.getElementById("btn-restart-slide1");
  J && J.addEventListener("click", () => w("gotoPage", 1));
  const Y = document.getElementById("btn-back-setup");
  Y && Y.addEventListener("click", () => {
    e.currentStep = 2, r();
  });
}
document.addEventListener("DOMContentLoaded", r);
(document.readyState === "complete" || document.readyState === "interactive") && r();
const Ge = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null
}, Symbol.toStringTag, { value: "Module" })), oe = document.createElement("style");
oe.textContent = le;
document.head.append(oe);
await Promise.resolve().then(() => Ge);
const je = "2.14.0", Ue = canva_sdk.design.v2.designInteraction.selection, Ne = canva_sdk.design.v2.designInteraction.overlay, He = canva_sdk.design.v2.designInteraction.addPage, Ke = canva_sdk.design.v2.designInteraction.resizeDesign, Ve = canva_sdk.design.v2.designInteraction.searchResizePreset, qe = canva_sdk.design.v2.designInteraction.setCurrentPageBackground, Je = canva_sdk.design.v2.designInteraction.getDefaultPageDimensions, Ye = canva_sdk.design.v2.export.requestExport, We = canva_sdk.design.v2.dragAndDrop, Xe = canva_sdk.design.v2.designInteraction.addNativeElement, Ze = canva_sdk.design.v2.designInteraction.addElementAtPoint, Qe = canva_sdk.design.v2.designInteraction.addElementAtCursor, et = canva_sdk.design.v2.designInteraction.addAudioTrack, tt = canva_sdk.design.v2.designInteraction.getCurrentPageContext, at = canva_sdk.design.v2.designInteraction.initAppElement, nt = canva_sdk.design.v2.designInteraction.getDesignToken, it = canva_sdk.design.v2.designInteraction.getDesignMetadata, rt = canva_sdk.design.v2.designInteraction.getCurrentPageMetadata, st = canva_sdk.design.v2.templates.getDesignTemplateMetadata, ot = canva_sdk.design.v2.designInteraction.createRichtextRange, lt = canva_sdk.design.v2.designInteraction.editContent, ct = canva_sdk.design.v2.designInteraction.openDesign, dt = canva_sdk.design.v2.designInteraction.publish, pt = canva_sdk.design.v2.designInteraction.bulkCreate, ut = canva_sdk.design.v2.designInteraction.getDesignColors, gt = canva_sdk.design.v2.designInteraction.getBrandKitColors, vt = canva_sdk.design.v2.autofill.autofillDesign, ft = canva_sdk.design.v2.autofill.requestDataFieldMatching, mt = canva_sdk.design.v2.autofill.setDataFieldLabelVisibility, bt = canva_sdk.design.v2.templates.requestApplyPublicTemplate, ht = canva_sdk.design.v2.templates.requestBrandTemplates, xt = canva_sdk.design.v2.templates.getBrandTemplateMetadata, yt = canva_sdk.design.v2.templates.applyTemplate;
window.__canva__?.sdkRegistration?.registerPackageVersion("design", je, "ga");
const wt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  addAudioTrack: et,
  addElementAtCursor: Qe,
  addElementAtPoint: Ze,
  addNativeElement: Xe,
  addPage: He,
  applyTemplate: yt,
  autofillDesign: vt,
  bulkCreate: pt,
  createRichtextRange: ot,
  editContent: lt,
  getBrandKitColors: gt,
  getBrandTemplateMetadata: xt,
  getCurrentPageContext: tt,
  getCurrentPageMetadata: rt,
  getDefaultPageDimensions: Je,
  getDesignColors: ut,
  getDesignMetadata: it,
  getDesignTemplateMetadata: st,
  getDesignToken: nt,
  initAppElement: at,
  openDesign: ct,
  overlay: Ne,
  publish: dt,
  requestApplyPublicTemplate: bt,
  requestBrandTemplates: ht,
  requestDataFieldMatching: ft,
  requestExport: Ye,
  resizeDesign: Ke,
  searchResizePreset: Ve,
  selection: Ue,
  setCurrentPageBackground: qe,
  setDataFieldLabelVisibility: mt,
  ui: We
}, Symbol.toStringTag, { value: "Module" })), kt = "2.3.0", St = canva_sdk.user.v2.authentication, Et = canva_sdk.user.v2.monetization, $t = canva_sdk.user.v2.OauthError;
window.__canva__?.sdkRegistration?.registerPackageVersion("user", kt, "ga");
const Pt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  OauthError: $t,
  auth: St,
  monetization: Et
}, Symbol.toStringTag, { value: "Module" }));
