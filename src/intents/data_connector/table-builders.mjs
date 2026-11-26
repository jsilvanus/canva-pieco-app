import { liturgicalColorHex, todayIso } from "../../services/anno-api.mjs";

const MAX_STRING_LEN = 10000;

function strCell(value) {
  if (value === null || value === undefined || value === "") {
    return { type: "string", value: undefined };
  }
  const text = String(value);
  return { type: "string", value: text.length > MAX_STRING_LEN ? text.slice(0, MAX_STRING_LEN) : text };
}

function numCell(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    return { type: "number", value: undefined };
  }
  return { type: "number", value };
}

function dateCell(dateIso) {
  if (!dateIso || typeof dateIso !== "string") return { type: "date", value: undefined };
  const ms = Date.parse(`${dateIso}T00:00:00Z`);
  if (!Number.isFinite(ms)) return { type: "date", value: undefined };
  return { type: "date", value: Math.floor(ms / 1000) };
}

const LABELS = {
  fi: {
    date: "Päivämäärä",
    dateText: "Päiväys (teksti)",
    dayOfWeek: "Viikonpäivä",
    name: "Pyhäpäivä",
    theme: "Aihe",
    latinName: "Latinankielinen nimi",
    season: "Jakso",
    period: "Aika",
    yearCycle: "Vuosikerta",
    liturgicalColor: "Liturginen väri",
    liturgicalColorHex: "Värikoodi (hex)",
    altarCandles: "Alttarikynttilät",
    firstReadingRef: "1. lukukappale (viite)",
    firstReadingText: "1. lukukappale (teksti)",
    secondReadingRef: "2. lukukappale (viite)",
    secondReadingText: "2. lukukappale (teksti)",
    gospelRef: "Evankeliumi (viite)",
    gospelText: "Evankeliumi (teksti)",
    psalmRef: "Päivän psalmi (viite)",
    psalmText: "Päivän psalmi (teksti)",
    psalmAntiphon: "Psalmin antifoni",
    hallelujahText: "Halleluja / paastonsäe",
    collectPrayer: "Päivän rukous",
    hourName: "Rukoushetki",
    readingRef: "Lukukappale (viite)",
    readingText: "Lukukappale (teksti)",
    psalmChant: "Sävelmä",
    type: "Tyyppi",
    slug: "Tunniste",
  },
  sv: {
    date: "Datum",
    dateText: "Datum (text)",
    dayOfWeek: "Veckodag",
    name: "Helgdag",
    theme: "Tema",
    latinName: "Latinskt namn",
    season: "Period",
    period: "Tid",
    yearCycle: "Årgång",
    liturgicalColor: "Liturgisk färg",
    liturgicalColorHex: "Färgkod (hex)",
    altarCandles: "Altarkjus",
    firstReadingRef: "1. läsningen (ref)",
    firstReadingText: "1. läsningen (text)",
    secondReadingRef: "2. läsningen (ref)",
    secondReadingText: "2. läsningen (text)",
    gospelRef: "Evangelium (ref)",
    gospelText: "Evangelium (text)",
    psalmRef: "Dagens psalm (ref)",
    psalmText: "Dagens psalm (text)",
    psalmAntiphon: "Antifon",
    hallelujahText: "Halleluja / fastevers",
    collectPrayer: "Dagens bön",
    hourName: "Bönestund",
    readingRef: "Läsning (ref)",
    readingText: "Läsning (text)",
    psalmChant: "Ton",
    type: "Typ",
    slug: "Slug",
  },
  en: {
    date: "Date",
    dateText: "Date (text)",
    dayOfWeek: "Day of week",
    name: "Holy day",
    theme: "Theme",
    latinName: "Latin name",
    season: "Season",
    period: "Period",
    yearCycle: "Year cycle",
    liturgicalColor: "Liturgical color",
    liturgicalColorHex: "Color hex",
    altarCandles: "Altar candles",
    firstReadingRef: "1st reading (ref)",
    firstReadingText: "1st reading (text)",
    secondReadingRef: "2nd reading (ref)",
    secondReadingText: "2nd reading (text)",
    gospelRef: "Gospel (ref)",
    gospelText: "Gospel (text)",
    psalmRef: "Psalm (ref)",
    psalmText: "Psalm (text)",
    psalmAntiphon: "Psalm antiphon",
    hallelujahText: "Hallelujah / Lent verse",
    collectPrayer: "Collect prayer",
    hourName: "Prayer hour",
    readingRef: "Reading (ref)",
    readingText: "Reading (text)",
    psalmChant: "Chant",
    type: "Type",
    slug: "Slug",
  },
};

function labelFor(lang, key) {
  return (LABELS[lang] || LABELS.fi)[key] || key;
}

export function applyTableLimits(columnConfigs, rows, limit = { row: 100, column: 20 }) {
  const maxCols = Math.max(1, limit?.column ?? 20);
  const maxRows = Math.max(0, limit?.row ?? 100);
  return {
    columnConfigs: columnConfigs.slice(0, maxCols),
    rows: rows.slice(0, maxRows).map((r) => ({ cells: r.cells.slice(0, maxCols) })),
  };
}

export function resolvePrimaryDay(resolved, slug) {
  if (!resolved) return null;
  if (slug) {
    if (resolved.holyDay?.slug === slug) return resolved.holyDay;
    const extra = (resolved.additionalServices ?? []).find((d) => d.slug === slug);
    if (extra) return extra;
  }
  return resolved.holyDay || resolved.weekdayMaterial || null;
}

function dayRowCells(resolved, slug) {
  const day = resolvePrimaryDay(resolved, slug);
  const colorObj = day?.liturgicalColor || resolved?.liturgicalColor;
  const colorName = colorObj?.color || "";
  const colorHex = colorName ? liturgicalColorHex(colorName) : "";
  const texts = day?.texts || {};
  const psalm = day?.psalm || {};
  const hallelujah = day?.hallelujah?.text || day?.psalmVerse?.text || "";
  const prayer = day?.prayers?.[0]?.text || "";
  return [
    dateCell(resolved?.date),
    strCell(resolved?.date),
    strCell(resolved?.dayOfWeek),
    strCell(day?.name || resolved?.period || resolved?.season),
    strCell(day?.theme),
    strCell(day?.latinName),
    strCell(resolved?.season || day?.season),
    strCell(resolved?.period || day?.period),
    numCell(resolved?.churchYear?.yearCycle),
    strCell(colorName),
    strCell(colorHex),
    strCell(day?.altarCandles),
    strCell(texts.gospel?.reference),
    strCell(texts.gospel?.text),
    strCell(texts.firstReading?.reference),
    strCell(texts.firstReading?.text),
    strCell(texts.secondReading?.reference),
    strCell(texts.secondReading?.text),
    strCell(psalm.reference),
    strCell(psalm.text),
    strCell(psalm.antiphon),
    strCell(hallelujah),
    strCell(prayer),
  ];
}

export function buildDayDetailsTable(resolved, { slug = "", headerLang = "fi", limit } = {}) {
  const cols = [
    { name: labelFor(headerLang, "date"), type: "date" },
    { name: labelFor(headerLang, "dateText"), type: "string" },
    { name: labelFor(headerLang, "dayOfWeek"), type: "string" },
    { name: labelFor(headerLang, "name"), type: "string" },
    { name: labelFor(headerLang, "theme"), type: "string" },
    { name: labelFor(headerLang, "latinName"), type: "string" },
    { name: labelFor(headerLang, "season"), type: "string" },
    { name: labelFor(headerLang, "period"), type: "string" },
    { name: labelFor(headerLang, "yearCycle"), type: "number" },
    { name: labelFor(headerLang, "liturgicalColor"), type: "string" },
    { name: labelFor(headerLang, "liturgicalColorHex"), type: "string" },
    { name: labelFor(headerLang, "altarCandles"), type: "string" },
    { name: labelFor(headerLang, "gospelRef"), type: "string" },
    { name: labelFor(headerLang, "gospelText"), type: "string" },
    { name: labelFor(headerLang, "firstReadingRef"), type: "string" },
    { name: labelFor(headerLang, "firstReadingText"), type: "string" },
    { name: labelFor(headerLang, "secondReadingRef"), type: "string" },
    { name: labelFor(headerLang, "secondReadingText"), type: "string" },
    { name: labelFor(headerLang, "psalmRef"), type: "string" },
    { name: labelFor(headerLang, "psalmText"), type: "string" },
    { name: labelFor(headerLang, "psalmAntiphon"), type: "string" },
    { name: labelFor(headerLang, "hallelujahText"), type: "string" },
    { name: labelFor(headerLang, "collectPrayer"), type: "string" },
  ];
  return applyTableLimits(cols, [{ cells: dayRowCells(resolved, slug) }], limit);
}

export function buildUpcomingSundaysTable(resolvedList, { headerLang = "fi", limit } = {}) {
  const cols = [
    { name: labelFor(headerLang, "date"), type: "date" },
    { name: labelFor(headerLang, "name"), type: "string" },
    { name: labelFor(headerLang, "theme"), type: "string" },
    { name: labelFor(headerLang, "liturgicalColor"), type: "string" },
    { name: labelFor(headerLang, "liturgicalColorHex"), type: "string" },
    { name: labelFor(headerLang, "gospelRef"), type: "string" },
    { name: labelFor(headerLang, "gospelText"), type: "string" },
    { name: labelFor(headerLang, "firstReadingRef"), type: "string" },
    { name: labelFor(headerLang, "secondReadingRef"), type: "string" },
    { name: labelFor(headerLang, "psalmRef"), type: "string" },
    { name: labelFor(headerLang, "collectPrayer"), type: "string" },
    { name: labelFor(headerLang, "altarCandles"), type: "string" },
  ];
  const list = Array.isArray(resolvedList)
    ? resolvedList
    : Array.isArray(resolvedList?.sundays)
      ? resolvedList.sundays
      : [];
  const rows = list.map((resolved) => {
    const day = resolvePrimaryDay(resolved);
    const colorName = day?.liturgicalColor?.color || resolved?.liturgicalColor?.color || "";
    return {
      cells: [
        dateCell(resolved?.date),
        strCell(day?.name || resolved?.name || resolved?.period),
        strCell(day?.theme || resolved?.theme),
        strCell(colorName || (typeof resolved?.liturgicalColor === "string" ? resolved.liturgicalColor : "")),
        strCell(
          colorName
            ? liturgicalColorHex(colorName)
            : resolved?.liturgicalColorHex || (typeof resolved?.liturgicalColor === "string" ? liturgicalColorHex(resolved.liturgicalColor) : "")
        ),
        strCell(day?.texts?.gospel?.reference || resolved?.gospel),
        strCell(day?.texts?.gospel?.text),
        strCell(day?.texts?.firstReading?.reference),
        strCell(day?.texts?.secondReading?.reference),
        strCell(day?.psalm?.reference),
        strCell(day?.prayers?.[0]?.text || resolved?.collectPrayer),
        strCell(day?.altarCandles ?? resolved?.altarCandles),
      ],
    };
  });
  return applyTableLimits(cols, rows, limit);
}

export function buildDailyHoursTable(lectionaryResponse, { headerLang = "fi", limit } = {}) {
  const cols = [
    { name: labelFor(headerLang, "hourName"), type: "string" },
    { name: labelFor(headerLang, "readingRef"), type: "string" },
    { name: labelFor(headerLang, "readingText"), type: "string" },
    { name: labelFor(headerLang, "psalmRef"), type: "string" },
    { name: labelFor(headerLang, "psalmText"), type: "string" },
    { name: labelFor(headerLang, "psalmChant"), type: "string" },
  ];
  const lec = lectionaryResponse?.lectionary || {};
  const entries = [
    { label: "Aamurukous", hour: lec.morning },
    { label: "Päivärukous", hour: lec.noon },
    { label: "Iltarukous", hour: lec.evening },
    { label: "Päivän psalmi", hour: lec.dayPsalm?.length ? { readings: [], psalms: lec.dayPsalm } : null },
  ].filter((e) => e.hour);

  const rows = entries.map((e) => {
    const reading = e.hour.readings?.[0];
    const psalm = e.hour.psalms?.[0];
    return {
      cells: [
        strCell(e.label),
        strCell(reading?.reference),
        strCell(reading?.text),
        strCell(psalm?.reference),
        strCell(psalm?.text),
        strCell(psalm?.chant),
      ],
    };
  });
  return applyTableLimits(cols, rows, limit);
}

export function buildYearCalendarTable(calendarResponse, { headerLang = "fi", limit } = {}) {
  const cols = [
    { name: labelFor(headerLang, "date"), type: "date" },
    { name: labelFor(headerLang, "name"), type: "string" },
    { name: labelFor(headerLang, "type"), type: "string" },
    { name: labelFor(headerLang, "theme"), type: "string" },
    { name: labelFor(headerLang, "liturgicalColor"), type: "string" },
    { name: labelFor(headerLang, "gospelRef"), type: "string" },
    { name: labelFor(headerLang, "slug"), type: "string" },
  ];
  const rows = (calendarResponse?.entries ?? []).map((entry) => ({
    cells: [
      dateCell(entry.date),
      strCell(entry.name),
      strCell(entry.type),
      strCell(entry.theme),
      strCell(entry.liturgicalColor?.color),
      strCell(entry.gospel),
      strCell(entry.slug),
    ],
  }));
  return applyTableLimits(cols, rows, limit);
}

export function buildEventsTable(eventsList, { limit } = {}) {
  const cols = [
    { name: "Otsikko", type: "string" },
    { name: "Päivä", type: "string" },
    { name: "Klo", type: "string" },
    { name: "Aika ja paikka", type: "string" },
    { name: "Paikka", type: "string" },
    { name: "Osoite", type: "string" },
    { name: "Kuvaus", type: "string" },
    { name: "Lyhyt kuvaus", type: "string" },
    { name: "Kategoria", type: "string" },
    { name: "Linkki", type: "string" },
    { name: "Päivämäärä", type: "date" },
  ];
  const rows = (eventsList ?? []).map((ev) => {
    const timeAndVenue = ev.slide_snippets?.time_and_venue || `${ev.date_display} ${ev.time_display} • ${ev.venue}`;
    const desc = ev.description_clean || "";
    const shortDesc = ev.slide_snippets?.short_body || desc;
    let epochSec;
    try {
      const ms = Date.parse(ev.start_time);
      epochSec = Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
    } catch {
      epochSec = undefined;
    }
    return {
      cells: [
        strCell(ev.title),
        strCell(ev.date_display),
        strCell(ev.time_display),
        strCell(timeAndVenue),
        strCell(ev.venue),
        strCell(ev.venue_address),
        strCell(desc),
        strCell(shortDesc),
        strCell(ev.category),
        strCell(ev.link_url),
        { type: "date", value: epochSec },
      ],
    };
  });
  return applyTableLimits(cols, rows, limit);
}

export function parseDataSourceRef(source) {
  const fallback = { v: 1, preset: "day_details", date: todayIso(), endDate: "", year: new Date().getFullYear(), slug: "", headerLang: "fi" };
  if (!source || typeof source !== "string") return fallback;
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      v: 1,
      preset: ["day_details", "upcoming_sundays", "daily_hours", "year_calendar"].includes(parsed.preset) ? parsed.preset : "day_details",
      date: typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : fallback.date,
      endDate: typeof parsed.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.endDate) ? parsed.endDate : "",
      year: Number.isInteger(parsed.year) ? parsed.year : fallback.year,
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      headerLang: ["fi", "sv", "en"].includes(parsed.headerLang) ? parsed.headerLang : "fi",
    };
  } catch {
    return fallback;
  }
}
