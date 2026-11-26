import { CONFIG } from "../config.mjs";
import { getBearerToken } from "./auth.mjs";

/**
 * @typedef {Object} SlideSnippets
 * @property {string} headline
 * @property {string} time_and_venue
 * @property {string} short_body
 * @property {string} [contact_line]
 * @property {string} full_slide_block
 */

/**
 * @typedef {Object} EventItem
 * @property {string} id
 * @property {string} [series_id]
 * @property {string} title
 * @property {string} start_time
 * @property {string} [end_time]
 * @property {string} date_display
 * @property {string} time_display
 * @property {string} venue
 * @property {string} [venue_address]
 * @property {string} category
 * @property {string[]} [categories]
 * @property {string} [link_url]
 * @property {string} [description_clean]
 * @property {SlideSnippets} [slide_snippets]
 */

/**
 * Resolves base URL for Katrina Tunneli API.
 */
export function getKatrinaBaseUrl() {
  const url = CONFIG.katrinaUrl || "https://events.riihimaenseurakunta.fi";
  return url.replace(/\/+$/, "");
}

/**
 * Fetches events list from Katrina Tunneli API.
 * @param {Object} [params]
 * @param {string} [params.startDate] YYYY-MM-DD
 * @param {string} [params.endDate] YYYY-MM-DD
 * @param {string} [params.category]
 * @param {string} [params.venue]
 * @param {string} [params.q]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ total: number; items: EventItem[] }>}
 */
export async function fetchEvents({
  startDate,
  endDate,
  category,
  venue,
  q,
  page = 1,
  limit = 20,
} = {}) {
  const base = getKatrinaBaseUrl();
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set("start_date", startDate);
  if (endDate) searchParams.set("end_date", endDate);
  if (category && category !== "kaikki") searchParams.set("category", category);
  if (venue && venue !== "kaikki") searchParams.set("venue", venue);
  if (q) searchParams.set("q", q);
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));

  const url = `${base}/api/v1/events?${searchParams.toString()}`;
  const headers = { Accept: "application/json" };
  const token = await getBearerToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Events API returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    // Return simulated mock events if API is offline or during testing
    console.warn("Katrina API unavailable, using local fallback events:", err);
    return getFallbackEvents();
  }
}

/**
 * Fetches details for a single event.
 * @param {string} id
 * @returns {Promise<EventItem>}
 */
export async function fetchEvent(id) {
  const base = getKatrinaBaseUrl();
  const url = `${base}/api/v1/events/${encodeURIComponent(id)}`;
  const headers = { Accept: "application/json" };
  const token = await getBearerToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Event ${id} not found`);
  return await res.json();
}

/**
 * Fetches unique categories.
 * @returns {Promise<{ categories: string[]; main_groups: any[] }>}
 */
export async function fetchCategories() {
  const base = getKatrinaBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/categories`);
    if (res.ok) return await res.json();
  } catch {}
  return {
    categories: ["Jumalanpalvelukset", "Lapset ja perheet", "Musiikki ja konsertit", "Nuoret ja rippikoulu", "Yleinen"],
    main_groups: [],
  };
}

/**
 * Fetches unique venues.
 * @returns {Promise<{ venues: { id: string; name: string; address?: string }[] }>}
 */
export async function fetchVenues() {
  const base = getKatrinaBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/venues`);
    if (res.ok) return await res.json();
  } catch {}
  return {
    venues: [
      { id: "1", name: "Keskuskirkko", address: "Hämeenkatu 5, 11100 Riihimäki" },
      { id: "2", name: "Pääskypolun seurakuntakoti", address: "Pääskypolku 1, 11130 Riihimäki" },
    ],
  };
}

function getFallbackEvents() {
  return {
    total: 3,
    items: [
      {
        id: "1166",
        title: "Messu Keskuskirkossa",
        start_time: "2026-04-12T10:00:00+03:00",
        date_display: "Su 12.4.2026",
        time_display: "klo 10:00–11:30",
        venue: "Keskuskirkko",
        venue_address: "Hämeenkatu 5, 11100 Riihimäki",
        category: "Jumalanpalvelukset",
        description_clean: "Tervetuloa viettämään sunnuntain messua Riihimäen Keskuskirkkoon. Messun jälkeen kirkkokahvit.",
        slide_snippets: {
          headline: "Messu Keskuskirkossa",
          time_and_venue: "Su 12.4.2026 klo 10:00–11:30 • Keskuskirkko",
          short_body: "Tervetuloa viettämään sunnuntain messua Riihimäen Keskuskirkkoon. Messun jälkeen kirkkokahvit.",
          contact_line: "riihimaenseurakunta.fi",
          full_slide_block: "Messu Keskuskirkossa\nSu 12.4.2026 klo 10:00–11:30 • Keskuskirkko\n\nTervetuloa viettämään sunnuntain messua Riihimäen Keskuskirkkoon. Messun jälkeen kirkkokahvit.\n\nriihimaenseurakunta.fi",
        },
      },
      {
        id: "1167",
        title: "Perhekerho ja vauvakahvila",
        start_time: "2026-04-15T09:30:00+03:00",
        date_display: "Ke 15.4.2026",
        time_display: "klo 09:30–11:30",
        venue: "Pääskypolun seurakuntakoti",
        venue_address: "Pääskypolku 1, 11130 Riihimäki",
        category: "Lapset ja perheet",
        description_clean: "Lapsiperheiden avoin kohtaamispaikka. Tarjolla leikkiä, juttuseuraa ja pientä välipalaa.",
        slide_snippets: {
          headline: "Perhekerho ja vauvakahvila",
          time_and_venue: "Ke 15.4.2026 klo 09:30–11:30 • Pääskypolun seurakuntakoti",
          short_body: "Lapsiperheiden avoin kohtaamispaikka. Tarjolla leikkiä, juttuseuraa ja pientä välipalaa.",
          contact_line: "riihimaenseurakunta.fi",
          full_slide_block: "Perhekerho ja vauvakahvila\nKe 15.4.2026 klo 09:30–11:30 • Pääskypolun seurakuntakoti\n\nLapsiperheiden avoin kohtaamispaikka. Tarjolla leikkiä, juttuseuraa ja pientä välipalaa.\n\nriihimaenseurakunta.fi",
        },
      },
      {
        id: "1168",
        title: "Urkukonsertti: Kevään valoa",
        start_time: "2026-04-17T19:00:00+03:00",
        date_display: "Pe 17.4.2026",
        time_display: "klo 19:00–20:15",
        venue: "Keskuskirkko",
        venue_address: "Hämeenkatu 5, 11100 Riihimäki",
        category: "Musiikki ja konsertit",
        description_clean: "Urkutaiteilija Maija Musiikki tulkitsee J.S. Bachin ja ranskalaisten romantikkojen urkumusiikkia Keskuskirkon uruilla.",
        slide_snippets: {
          headline: "Urkukonsertti: Kevään valoa",
          time_and_venue: "Pe 17.4.2026 klo 19:00–20:15 • Keskuskirkko",
          short_body: "Urkutaiteilija Maija Musiikki tulkitsee J.S. Bachin ja ranskalaisten romantikkojen urkumusiikkia Keskuskirkon uruilla.",
          contact_line: "riihimaenseurakunta.fi",
          full_slide_block: "Urkukonsertti: Kevään valoa\nPe 17.4.2026 klo 19:00–20:15 • Keskuskirkko\n\nUrkutaiteilija Maija Musiikki tulkitsee J.S. Bachin ja ranskalaisten romantikkojen urkumusiikkia Keskuskirkon uruilla.\n\nriihimaenseurakunta.fi",
        },
      },
    ],
  };
}
