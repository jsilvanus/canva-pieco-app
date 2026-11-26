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
 * Inspects elements on the current design canvas to count images, text, and groups.
 * Used by the Valopankki usage tracking panel to verify whether image elements remain on canvas.
 */
export async function inspectCurrentDesignElements() {
  if (!isRunningInCanva()) {
    return {
      supported: true,
      totalElements: 2,
      imageCount: 1,
      textCount: 1,
      groupCount: 0,
      otherCount: 0,
    };
  }

  try {
    const [{ openDesign }, { features }] = await Promise.all([
      import("@canva/design"),
      import("@canva/platform"),
    ]);
    if (!features.isSupported(openDesign)) {
      return { supported: false, totalElements: 0, imageCount: 0, textCount: 0, groupCount: 0, otherCount: 0 };
    }

    const summary = { supported: true, totalElements: 0, imageCount: 0, textCount: 0, groupCount: 0, otherCount: 0 };
    await openDesign({ type: "current_page" }, async (session) => {
      if (session?.page?.type === "absolute") {
        const countElements = (list) => {
          for (const el of readListItems(list)) {
            if (!el || typeof el !== "object") continue;
            summary.totalElements++;
            if (el.type === "image") {
              summary.imageCount++;
            } else if (el.type === "text") {
              summary.textCount++;
            } else if (el.type === "group") {
              summary.groupCount++;
              if (el.contents) countElements(el.contents);
            } else {
              summary.otherCount++;
            }
          }
        };
        countElements(session.page.elements);
      }
    });
    return summary;
  } catch {
    return { supported: false, totalElements: 0, imageCount: 0, textCount: 0, groupCount: 0, otherCount: 0 };
  }
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

/**
 * Decodes the Canva designId from a signed designToken JWT without verifying signature
 * (used client-side to link exported PiProgram items back to their editable Canva design).
 */
export function decodeDesignIdFromToken(designToken) {
  if (!designToken || typeof designToken !== "string") return null;
  const parts = designToken.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json);
    const id = payload?.designId || payload?.did || payload?.design_id || payload?.sub;
    return typeof id === "string" && /^[a-zA-Z0-9_-]{3,64}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Reads the current Canva design's ID via getDesignToken() when on the Design Editor surface.
 */
export async function getCurrentDesignId() {
  if (!isRunningInCanva()) return "DAG_MOCK_DESIGN_1";
  try {
    const [{ getDesignToken }, { features }] = await Promise.all([
      import("@canva/design"),
      import("@canva/platform"),
    ]);
    if (!features.isSupported(getDesignToken)) return null;
    const { token } = await getDesignToken();
    return decodeDesignIdFromToken(token);
  } catch {
    return null;
  }
}

let annoAppElementClient = null;
let activeAnnoElement = null;

async function getAnnoAppElementClient() {
  if (annoAppElementClient) return annoAppElementClient;
  const { initAppElement } = await import("@canva/design");
  annoAppElementClient = initAppElement({
    render: (data) => {
      const lines = [];
      const heading = [data.title, data.reference].filter(Boolean).join(" — ");
      if (heading) {
        lines.push({
          type: "text",
          children: [heading],
          top: 0,
          left: 0,
          width: 680,
          fontSize: 22,
          fontWeight: "bold",
        });
      }
      if (data.body) {
        lines.push({
          type: "text",
          children: [data.body],
          top: heading ? 36 : 0,
          left: 0,
          width: 680,
          fontSize: 16,
        });
      }
      return lines.length ? lines : [{ type: "text", children: [""], top: 0, left: 0, width: 400 }];
    },
  });
  annoAppElementClient.registerOnElementChange((el) => {
    activeAnnoElement = el ?? null;
  });
  return annoAppElementClient;
}

/**
 * Inserts formatted liturgical text onto the current Canva page.
 * When `reference` and `body` are both present, creates two distinct elements: one for the reference,
 * and one for the passage text (without section titles like 'Gospel' or '1st Reading').
 * When `autoUpdate` is true, creates a data-bound AppElement that can be updated in place when the date changes.
 */
export async function insertTextIntoDesign({ title = "", reference = "", body = "", autoUpdate = false, fieldKey = "", date = "" }) {
  const cleanRef = String(reference || "").trim();
  const cleanBody = String(body || "").trim();
  // Remove section titles (Gospel, 1st Reading, etc.) when reference is present
  const cleanTitle = cleanRef ? "" : String(title || "").trim();

  const fullText = [cleanRef, cleanBody || cleanTitle].filter(Boolean).join("\n\n");
  if (!fullText) return { status: "empty" };

  if (!isRunningInCanva()) {
    if (cleanRef && cleanBody) {
      return {
        status: "simulated",
        mode: autoUpdate ? "app_element" : "richtext",
        elements: [
          { type: "reference", text: cleanRef },
          { type: "body", text: cleanBody },
        ],
        text: `${cleanRef}\n\n${cleanBody}`,
      };
    }
    return { status: "simulated", mode: autoUpdate ? "app_element" : "richtext", text: fullText };
  }

  const [{ addElementAtPoint, addElementAtCursor, createRichtextRange, getDefaultPageDimensions }, { features }] = await Promise.all([
    import("@canva/design"),
    import("@canva/platform"),
  ]);

  if (autoUpdate) {
    try {
      const client = await getAnnoAppElementClient();
      const payload = { fieldKey: String(fieldKey || "custom"), date: String(date || ""), reference: cleanRef, body: cleanBody || cleanTitle };
      if (activeAnnoElement) {
        await activeAnnoElement.update({ data: payload });
      } else {
        await client.addElement({ data: payload });
      }
      return { status: "completed", mode: "app_element" };
    } catch {
      // Fallback to standard richtext if app elements are unsupported on this page type
    }
  }

  // When both reference and body are present, create TWO distinct elements:
  // 1. Bible passage reference (e.g. "Matt. 21:1–9")
  // 2. Bible passage text (e.g. "Hoosianna, Daavidin poika!...")
  if (cleanRef && cleanBody) {
    const rangeRef = createRichtextRange();
    rangeRef.appendText(cleanRef, { fontWeight: "bold" });

    const rangeBody = createRichtextRange();
    rangeBody.appendText(cleanBody);

    if (features.isSupported(addElementAtPoint)) {
      let pageWidth = 1920;
      let pageHeight = 1080;
      if (typeof getDefaultPageDimensions === "function" && features.isSupported(getDefaultPageDimensions)) {
        try {
          const dims = await getDefaultPageDimensions();
          if (dims && typeof dims.width === "number" && typeof dims.height === "number") {
            pageWidth = dims.width;
            pageHeight = dims.height;
          }
        } catch {
          // keep defaults
        }
      }

      const boxWidth = Math.min(pageWidth - 160, 960);
      const left = Math.max(40, Math.round((pageWidth - boxWidth) / 2));
      const topRef = Math.max(40, Math.round(pageHeight * 0.28));
      const topBody = topRef + 64;

      await addElementAtPoint({
        type: "richtext",
        range: rangeRef,
        top: topRef,
        left,
        width: boxWidth,
      });

      await addElementAtPoint({
        type: "richtext",
        range: rangeBody,
        top: topBody,
        left,
        width: boxWidth,
      });

      return {
        status: "completed",
        mode: "richtext",
        elements: [
          { type: "reference", text: cleanRef },
          { type: "body", text: cleanBody },
        ],
      };
    }

    if (features.isSupported(addElementAtCursor)) {
      await addElementAtCursor({ type: "richtext", range: rangeRef });
      await addElementAtCursor({ type: "richtext", range: rangeBody });
      return {
        status: "completed",
        mode: "richtext",
        elements: [
          { type: "reference", text: cleanRef },
          { type: "body", text: cleanBody },
        ],
      };
    }
    return { status: "unsupported" };
  }

  // Single element insertion (e.g. prayer, hallelujah, or single passage text)
  const singleText = cleanBody || cleanRef || cleanTitle;
  const range = createRichtextRange();
  range.appendText(singleText);

  if (features.isSupported(addElementAtPoint)) {
    let pageWidth = 1920;
    let pageHeight = 1080;
    if (typeof getDefaultPageDimensions === "function" && features.isSupported(getDefaultPageDimensions)) {
      try {
        const dims = await getDefaultPageDimensions();
        if (dims && typeof dims.width === "number" && typeof dims.height === "number") {
          pageWidth = dims.width;
          pageHeight = dims.height;
        }
      } catch {
        // keep defaults
      }
    }
    const boxWidth = Math.min(pageWidth - 160, 960);
    const left = Math.max(40, Math.round((pageWidth - boxWidth) / 2));
    const top = Math.max(40, Math.round((pageHeight - 200) / 2));

    await addElementAtPoint({
      type: "richtext",
      range,
      top,
      left,
      width: boxWidth,
    });
    return { status: "completed", mode: "richtext" };
  }

  if (features.isSupported(addElementAtCursor)) {
    await addElementAtCursor({ type: "richtext", range });
    return { status: "completed", mode: "richtext" };
  }

  return { status: "unsupported" };
}

/**
 * Inserts a liturgical color swatch rectangle onto the current Canva page.
 * Includes all required box properties (top, left, width, height) to satisfy Canva API requirements.
 */
export async function insertColorSwatchIntoDesign({ hex, label = "" }) {
  const color = /^#[0-9a-f]{6}$/i.test(String(hex ?? "")) ? String(hex).toLowerCase() : "#7e003e";
  if (!isRunningInCanva()) {
    return { status: "simulated", color, label };
  }
  const [{ addElementAtPoint, getDefaultPageDimensions }, { features }] = await Promise.all([
    import("@canva/design"),
    import("@canva/platform"),
  ]);

  const width = 240;
  const height = 100;
  let top = 100;
  let left = 100;

  if (typeof getDefaultPageDimensions === "function" && features.isSupported(getDefaultPageDimensions)) {
    try {
      const dimensions = await getDefaultPageDimensions();
      if (dimensions && typeof dimensions.width === "number" && typeof dimensions.height === "number") {
        top = Math.max(20, Math.round((dimensions.height - height) / 2));
        left = Math.max(20, Math.round((dimensions.width - width) / 2));
      }
    } catch {
      // fallback coordinates
    }
  }

  if (features.isSupported(addElementAtPoint)) {
    await addElementAtPoint({
      type: "shape",
      paths: [{ d: `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`, fill: { color } }],
      viewBox: { top: 0, left: 0, width, height },
      top,
      left,
      width,
      height,
    });
    return { status: "completed", color };
  }
  return { status: "unsupported" };
}

/**
 * Runs Canva Autofill on the current design using an Anno DataTable.
 */
export async function autofillDesignWithAnnoTable(dataTable) {
  if (!isRunningInCanva()) {
    return { status: "simulated" };
  }
  const [{ autofillDesign }, { features }] = await Promise.all([
    import("@canva/design"),
    import("@canva/platform"),
  ]);
  if (!features.isSupported(autofillDesign)) {
    return { status: "unsupported" };
  }
  return autofillDesign({ dataTable });
}

/**
 * Imports an external image URL (e.g. a PiProgram slide) onto the current Canva page.
 */
export async function importImageUrlIntoDesign({ url, title = "PiProgram slide", mimeType = "image/png" }) {
  if (!isRunningInCanva()) {
    return { status: "simulated", url, title };
  }
  const [{ upload }, { addElementAtPoint, addElementAtCursor }, { features }] = await Promise.all([
    import("@canva/asset"),
    import("@canva/design"),
    import("@canva/platform"),
  ]);
  const uploaded = await upload({
    type: "image",
    mimeType: mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
    url,
    thumbnailUrl: url,
    aiDisclosure: "none",
  });
  if (features.isSupported(addElementAtPoint)) {
    await addElementAtPoint({
      type: "image",
      ref: uploaded.ref,
      altText: { text: title, decorative: false },
    });
    return { status: "completed" };
  }
  if (features.isSupported(addElementAtCursor)) {
    await addElementAtCursor({
      type: "image",
      ref: uploaded.ref,
      altText: { text: title, decorative: false },
    });
    return { status: "completed" };
  }
  return { status: "unsupported" };
}
