/**
 * Checks if the current app is running embedded in the Canva iframe.
 */
export function isRunningInCanva() {
  try {
    return typeof window !== "undefined" && typeof window.parent !== "undefined" && window.self !== window.top;
  } catch {
    return true; // Cross-origin top indicates iframe embed
  }
}

/**
 * Generates mock slide export blobs for testing outside Canva (or in Node).
 */
function createMockExport() {
  const mockPages = [
    { name: "Slide 1 - Welcome", color: "#1e3a8a", text: "Welcome to Church" },
    { name: "Slide 2 - Song 1", color: "#1e293b", text: "Amazing Grace" },
    { name: "Slide 3 - Sermon", color: "#0f172a", text: "Today's Scripture: John 3:16" },
    { name: "Slide 4 - Blessing", color: "#312e81", text: "Peace Be With You" },
  ];

  const exportBlobs = mockPages.map((p, index) => {
    let url = `https://export.canva.dev/mock/page-${index + 1}.png`;
    if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
        <rect width="1920" height="1080" fill="${p.color}"/>
        <text x="960" y="500" font-family="sans-serif" font-size="72" fill="#ffffff" text-anchor="middle" font-weight="bold">${p.text}</text>
        <text x="960" y="600" font-family="sans-serif" font-size="36" fill="#94a3b8" text-anchor="middle">Slide ${index + 1} of ${mockPages.length}</text>
      </svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      url = URL.createObjectURL(blob);
    }
    return { url, pageNumber: index + 1, name: p.name };
  });

  return {
    status: "completed",
    title: "Sunday Service Presentation (Mock)",
    exportBlobs,
  };
}

const DESIGN_TEXT_CACHE_KEY = "canva-pieco-app.design-text-cache";

function readListItems(list) {
  if (!list) return [];
  if (Array.isArray(list)) return list;
  const out = [];
  if (typeof list[Symbol.iterator] === "function") {
    for (const item of list) out.push(item);
    return out;
  }
  if (typeof list.length === "number") {
    for (let i = 0; i < list.length; i++) out.push(list.at ? list.at(i) : list[i]);
  }
  return out;
}

/**
 * Extracts sorted non-empty text blocks from Canva DesignEditing elements.
 * @param {unknown} elements
 */
export function extractTextBlocksFromElements(elements) {
  const collected = [];
  const visit = (list, offsetTop = 0, offsetLeft = 0) => {
    for (const el of readListItems(list)) {
      if (!el || typeof el !== "object") continue;
      const top = offsetTop + (typeof el.top === "number" ? el.top : 0);
      const left = offsetLeft + (typeof el.left === "number" ? el.left : 0);
      if (el.type === "text" && el.text && typeof el.text.readPlaintext === "function") {
        const raw = el.text.readPlaintext();
        const text = typeof raw === "string" ? raw.trim() : "";
        if (text) collected.push({ text, top, left });
      } else if (el.type === "group" && el.contents) {
        visit(el.contents, top, left);
      }
    }
  };
  visit(elements);
  collected.sort((a, b) => (a.top !== b.top ? a.top - b.top : a.left - b.left));
  const blocks = collected.map((item) => item.text);
  const heading = blocks[0] ?? "";
  const bodyText = blocks.length > 1 ? blocks.slice(1).join("\n\n") : heading;
  const fullText = blocks.join("\n\n");
  return { heading, bodyText, fullText, blocks };
}

/**
 * Reads cached design page text previously extracted on the Design Editor surface.
 */
export function readCachedDesignPageText() {
  try {
    const raw = globalThis.localStorage?.getItem(DESIGN_TEXT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      heading: typeof parsed.heading === "string" ? parsed.heading : "",
      bodyText: typeof parsed.bodyText === "string" ? parsed.bodyText : "",
      fullText: typeof parsed.fullText === "string" ? parsed.fullText : "",
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks.filter((b) => typeof b === "string") : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Reads text elements from the current Canva page when supported (Design Editor surface)
 * and caches the result so the Content Publisher surface can pre-fill web page fields.
 */
export async function readDesignPageText() {
  if (!isRunningInCanva()) {
    const mock = {
      heading: "Sunday Service",
      bodyText: "Welcome to our Sunday worship service at 10:00.",
      fullText: "Sunday Service\n\nWelcome to our Sunday worship service at 10:00.",
      blocks: ["Sunday Service", "Welcome to our Sunday worship service at 10:00."],
      updatedAt: Date.now(),
    };
    try {
      globalThis.localStorage?.setItem(DESIGN_TEXT_CACHE_KEY, JSON.stringify(mock));
    } catch {
      // ignore
    }
    return mock;
  }

  try {
    const [{ openDesign }, { features }] = await Promise.all([
      import("@canva/design"),
      import("@canva/platform"),
    ]);
    if (!features.isSupported(openDesign)) {
      return readCachedDesignPageText();
    }
    let extracted = null;
    await openDesign({ type: "current_page" }, async (session) => {
      if (session?.page?.type === "absolute") {
        extracted = {
          ...extractTextBlocksFromElements(session.page.elements),
          updatedAt: Date.now(),
        };
      }
    });
    if (extracted) {
      try {
        globalThis.localStorage?.setItem(DESIGN_TEXT_CACHE_KEY, JSON.stringify(extracted));
      } catch {
        // ignore
      }
      return extracted;
    }
  } catch {
    // unsupported_surface on Content Publisher or user design lock — fall back to cache
  }
  return readCachedDesignPageText();
}

/**
 * Reads the current Canva design's title for prefilling name fields.
 * Returns "" when unavailable or outside Canva (mock title in dev).
 */
export async function getDesignTitle() {
  if (!isRunningInCanva()) {
    return "Sunday Service Presentation (Mock)";
  }
  try {
    const { getDesignMetadata } = await import("@canva/design");
    const metadata = await getDesignMetadata();
    return typeof metadata?.title === "string" ? metadata.title.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Requests an uncompressed multi-page export from Canva.
 * Returns { status: 'completed' | 'aborted', title: string, exportBlobs: Array<{ url: string, pageNumber: number }> }
 */
export async function exportDesignPages() {
  if (!isRunningInCanva()) {
    return createMockExport();
  }

  try {
    const { requestExport } = await import("@canva/design");
    const result = await requestExport({
      acceptedFileTypes: [
        {
          type: "png",
          zipped: "never",
        },
      ],
    });

    if (result.status === "aborted") {
      return { status: "aborted", title: "", exportBlobs: [] };
    }

    const blobs = (result.exportBlobs || []).map((blob, idx) => ({
      url: blob.url,
      pageNumber: idx + 1,
      name: `Page ${idx + 1}`,
    }));

    return {
      status: "completed",
      title: result.title || "Canva Presentation",
      exportBlobs: blobs,
    };
  } catch (err) {
    if (err && (err.name === "AbortError" || err.message?.toLowerCase().includes("cancel"))) {
      return { status: "aborted", title: "", exportBlobs: [] };
    }
    console.error("[canva-pieco-app] Canva requestExport error:", err);
    throw err;
  }
}

/**
 * Opens a link in a new browser tab. Inside Canva the app cannot open windows itself: Canva asks the
 * user and opens it (requestOpenExternalUrl). Outside Canva (a browser test) it is a plain window.open.
 * Returns true when the link was opened, false when the user declined or it could not be opened.
 */
export async function openExternalUrl(url) {
  if (!/^https?:\/\//i.test(String(url ?? ""))) return false;
  if (!isRunningInCanva()) {
    const opened = typeof window !== "undefined" && typeof window.open === "function" ? window.open(url, "_blank", "noopener") : null;
    return Boolean(opened);
  }
  try {
    const { requestOpenExternalUrl } = await import("@canva/platform");
    const result = await requestOpenExternalUrl({ url });
    return result?.status === "completed";
  } catch (err) {
    console.warn("[canva-pieco-app] Canva could not open the link:", err?.message);
    return false;
  }
}
