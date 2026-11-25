import { CONFIG, normalizeGatewayUrl } from "../config.mjs";

export const LITURGICAL_COLOR_HEX = Object.freeze({
  valkoinen: "#FFFFFF",
  white: "#FFFFFF",
  vihrea: "#2E7D32",
  "vihreä": "#2E7D32",
  green: "#2E7D32",
  violetti: "#6A1B9A",
  violet: "#6A1B9A",
  sininen: "#1565C0",
  blue: "#1565C0",
  punainen: "#C62828",
  red: "#C62828",
  musta: "#212121",
  black: "#212121",
});

export function liturgicalColorHex(colorName) {
  const key = String(colorName ?? "").trim().toLowerCase();
  return LITURGICAL_COLOR_HEX[key] || "#7E003E";
}

export class AnnoApiError extends Error {
  constructor(code, status, userMessage) {
    super(userMessage);
    this.name = "AnnoApiError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
  }
}

export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nextSundayIso(fromIso = todayIso()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fromIso));
  const base = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date();
  const day = base.getUTCDay();
  const add = day === 0 ? 7 : 7 - day;
  base.setUTCDate(base.getUTCDate() + add);
  return base.toISOString().slice(0, 10);
}

function buildMockResolvedDate(dateIso = todayIso()) {
  return {
    date: dateIso,
    dayOfWeek: "sunnuntai",
    season: "Joulujakso",
    period: "Adventtiaika",
    churchYear: {
      start: 2025,
      label: "2025–2026",
      yearCycle: 1,
      firstAdventSunday: "2025-11-30",
      easter: "2026-04-05",
      lastDay: "2026-11-28",
    },
    holyDay: {
      name: "1. adventtisunnuntai",
      slug: "1-adventtisunnuntai",
      date: dateIso,
      type: "sunday",
      theme: "Kuninkaasi tulee nöyränä",
      latinName: "Adventus Domini",
      season: "Joulujakso",
      period: "Adventtiaika",
      altarCandles: "Neljä alttarikynttilää",
      liturgicalColor: { color: "valkoinen", alternatives: [], english: ["white"], note: null, text: "Valkoinen" },
      texts: {
        yearCycle: 1,
        sameInAllCycles: false,
        firstReading: { reference: "Sak. 9:9–10", bookIntro: null, text: "Iloitse suuresti, tytär Siion! Riemuitse, tytär Jerusalem! Katso, kuninkaasi tulee." },
        secondReading: { reference: "Room. 13:11–14", bookIntro: null, text: "Te tiedätte, mikä hetki nyt on: aika on herätä unesta." },
        gospel: { reference: "Matt. 21:1–9", bookIntro: null, text: "Hoosianna, Daavidin poika! Siunattu olkoon hän, joka tulee Herran nimessä!" },
      },
      psalm: {
        antiphon: "Sinun kuninkaasi tulee vanhurskaana ja voitokkaana.",
        antiphonReference: "Sak. 9:9",
        reference: "Ps. 24:1–10",
        text: "Herran on maa ja kaikki mitä siinä on, maanpiiri ja ne jotka sitä asuvat.",
      },
      hallelujah: { text: "Halleluja. Valmistakaa Herralle tie, tasoittakaa hänen polkunsa.", reference: "Jes. 40:3" },
      psalmVerse: null,
      prayers: [{ number: 1, text: "Kaikkivaltias Jumala! Herätä meidän sydämemme valmistamaan tietä sinun Pojallesi." }],
      dailyLectionary: {
        morning: { readings: [{ reference: "Jes. 2:1–5", text: "Monet kansat lähtevät liikkeelle." }], psalms: [{ reference: "Ps. 122", text: "Minä iloitsin, kun minulle sanottiin: Lähdemme Herran huoneeseen!" }] },
        noon: { readings: [{ reference: "1. Tess. 5:1–6", text: "Valvokaamme siis." }], psalms: [{ reference: "Ps. 119:105–112", text: "Sinun sanasi on lamppu, joka valaisee askeleeni." }] },
        evening: { readings: [{ reference: "Ilm. 3:19–22", text: "Minä seison ovella ja kolkutan." }], psalms: [{ reference: "Ps. 130", text: "Syvyydestä minä huudan sinua, Herra." }] },
        dayPsalm: [{ reference: "Ps. 24", text: "Kohottakaa päänne, te portit!" }],
        weekPsalm: [{ reference: "Ps. 25", text: "Sinun puoleesi, Herra, minä nostan sieluni." }],
      },
    },
    additionalServices: [],
    weekdayMaterial: null,
    liturgicalColor: { color: "valkoinen", alternatives: [], english: ["white"], note: null, text: "Valkoinen" },
    liturgy: { gloria: true, hallelujah: true, psalmVerseInsteadOfHallelujah: false, gloriaPatri: true, notes: [], source: "Evankeliumikirja" },
  };
}

async function annoRequest(path, { baseUrl = CONFIG.annoUrl, fetch: fetchFn = globalThis.fetch, signal, timeoutMs = 10000 } = {}) {
  const normalizedBase = normalizeGatewayUrl(baseUrl) || String(baseUrl ?? "").replace(/\/+$/, "");
  if (!normalizedBase) {
    throw new AnnoApiError("NOT_CONFIGURED", 0, "Anno API URL is not configured.");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetchFn(`${normalizedBase}/api/v1${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      if (res.status === 404) throw new AnnoApiError("NOT_FOUND", 404, `Anno resource not found (${path})`);
      throw new AnnoApiError("BAD_RESPONSE", res.status, `Anno API returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof AnnoApiError) throw err;
    if (err?.name === "AbortError") {
      throw new AnnoApiError("TIMEOUT", 0, "Anno API request timed out or was aborted.");
    }
    throw new AnnoApiError("NETWORK", 0, `Could not reach Anno API: ${err?.message || String(err)}`);
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

export async function getToday({ cycles = false, ...opts } = {}) {
  try {
    return await annoRequest(`/today?cycles=${cycles ? "true" : "false"}`, opts);
  } catch (err) {
    if (CONFIG.isDev && err?.code === "NETWORK") return buildMockResolvedDate(todayIso());
    throw err;
  }
}

export async function getDate(dateIso, { cycles = false, ...opts } = {}) {
  try {
    return await annoRequest(`/date/${encodeURIComponent(dateIso)}?cycles=${cycles ? "true" : "false"}`, opts);
  } catch (err) {
    if (CONFIG.isDev && err?.code === "NETWORK") return buildMockResolvedDate(dateIso);
    throw err;
  }
}

export async function getDateLectionary(dateIso, { day, ...opts } = {}) {
  const qs = day ? `?day=${encodeURIComponent(day)}` : "";
  const path = dateIso === "today" ? `/today/lectionary${qs}` : `/date/${encodeURIComponent(dateIso)}/lectionary${qs}`;
  try {
    return await annoRequest(path, opts);
  } catch (err) {
    if (CONFIG.isDev && err?.code === "NETWORK") {
      const mock = buildMockResolvedDate(dateIso === "today" ? todayIso() : dateIso);
      return { date: mock.date, day: { name: mock.holyDay.name, slug: mock.holyDay.slug, type: mock.holyDay.type }, lectionary: mock.holyDay.dailyLectionary };
    }
    throw err;
  }
}

export async function getYearCalendar(year, opts = {}) {
  try {
    return await annoRequest(`/year/${encodeURIComponent(String(year))}/calendar`, opts);
  } catch (err) {
    if (CONFIG.isDev && err?.code === "NETWORK") {
      const mock = buildMockResolvedDate(`${year}-11-30`);
      return {
        churchYear: mock.churchYear,
        entries: [{ date: `${year}-11-30`, slug: "1-adventtisunnuntai", name: "1. adventtisunnuntai", type: "sunday", theme: mock.holyDay.theme, liturgicalColor: mock.liturgicalColor, gospel: "Matt. 21:1–9" }],
      };
    }
    throw err;
  }
}

export async function getUpcomingSundays(startIso, endIso, { maxRows = 20, concurrency = 4, ...opts } = {}) {
  const startYear = Number(String(startIso).slice(0, 4)) || new Date().getFullYear();
  const endYear = Number(String(endIso).slice(0, 4)) || startYear;
  const years = new Set([startYear - 1, startYear, endYear]);
  const entries = [];
  for (const y of years) {
    try {
      const cal = await getYearCalendar(y, opts);
      for (const e of cal?.entries ?? []) {
        if (e.date >= startIso && e.date <= endIso && (e.type === "sunday" || e.type === "feast" || e.type === "day")) {
          entries.push(e);
        }
      }
    } catch (err) {
      if (err?.code === "NOT_FOUND") continue;
      throw err;
    }
  }
  const uniqueByDate = [];
  const seen = new Set();
  for (const entry of entries.sort((a, b) => a.date.localeCompare(b.date))) {
    if (seen.has(entry.date)) continue;
    seen.add(entry.date);
    uniqueByDate.push(entry);
    if (uniqueByDate.length >= maxRows) break;
  }

  const results = [];
  for (let i = 0; i < uniqueByDate.length; i += concurrency) {
    const batch = uniqueByDate.slice(i, i + concurrency);
    const resolved = await Promise.all(batch.map((entry) => getDate(entry.date, opts)));
    results.push(...resolved);
  }
  return results;
}
