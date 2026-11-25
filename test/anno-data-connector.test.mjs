import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDataSourceRef,
  applyTableLimits,
  buildDayDetailsTable,
  buildUpcomingSundaysTable,
  buildDailyHoursTable,
  buildYearCalendarTable,
} from "../src/intents/data_connector/table-builders.mjs";
import { decodeDesignIdFromToken } from "../src/services/canva-sdk.mjs";

test("parseDataSourceRef extracts data source types and date parameters", () => {
  assert.equal(
    parseDataSourceRef(JSON.stringify({ preset: "day_details" })).preset,
    "day_details"
  );

  assert.equal(
    parseDataSourceRef(JSON.stringify({ preset: "day_details", date: "2026-12-24" })).date,
    "2026-12-24"
  );

  assert.equal(
    parseDataSourceRef(JSON.stringify({ preset: "upcoming_sundays" })).preset,
    "upcoming_sundays"
  );

  // Fallback on invalid JSON or unknown preset
  assert.equal(parseDataSourceRef("not-json").preset, "day_details");
  assert.equal(parseDataSourceRef(JSON.stringify({ preset: "unknown" })).preset, "day_details");
});

test("applyTableLimits truncates rows to limits and clamps column count", () => {
  const cols = [{ name: "c1", type: "string" }, { name: "c2", type: "string" }];
  const rows = [
    { cells: [{ type: "string", value: "r1c1" }, { type: "string", value: "r1c2" }] },
    { cells: [{ type: "string", value: "r2c1" }, { type: "string", value: "r2c2" }] },
    { cells: [{ type: "string", value: "r3c1" }, { type: "string", value: "r3c2" }] },
  ];

  const limited = applyTableLimits(cols, rows, { row: 2, column: 1 });
  assert.equal(limited.columnConfigs.length, 1);
  assert.equal(limited.rows.length, 2);
  assert.equal(limited.rows[0].cells[0].value, "r1c1");
  assert.equal(limited.rows[0].cells.length, 1);
});

test("buildDayDetailsTable constructs valid Canva DataTable with columns and rows", () => {
  const mockResolved = {
    date: "2026-12-25",
    dayOfWeek: "Perjantai",
    period: "Jouluaika",
    season: "Joulu",
    liturgicalColor: { color: "valkoinen" },
    holyDay: {
      slug: "joulupaiva",
      name: "Joulupäivä",
      theme: "Sana tuli lihaksi",
      texts: {
        gospel: { title: "Evankeliumi", reference: "Joh. 1:1-14", text: "Alussa oli Sana..." },
        firstReading: { title: "1. lukukappale", reference: "Jes. 9:1-6", text: "Kansa, joka pimeydessä vaeltaa..." },
        secondReading: { title: "2. lukukappale", reference: "Hepr. 1:1-6", text: "Monet kerrat..." },
      },
      psalm: { reference: "Ps. 98", text: "Laulakaa Herralle uusi laulu...", antiphon: "Iloitkaa!" },
      hallelujah: { text: "Halleluja!" },
      prayers: [{ text: "Rakas Jumala..." }],
    },
  };

  const table = buildDayDetailsTable(mockResolved);
  assert.ok(table.columnConfigs.length >= 10);
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0].cells[1].value, "2026-12-25");
  assert.equal(table.rows[0].cells[3].value, "Joulupäivä");
  assert.equal(table.rows[0].cells[4].value, "Sana tuli lihaksi");
});

test("buildUpcomingSundaysTable handles list of upcoming days", () => {
  const mockSundays = {
    sundays: [
      { date: "2026-11-29", name: "1. adventtisunnuntai", theme: "Kuninkaasi tulee", liturgicalColor: "valkoinen", liturgicalColorHex: "#ffffff" },
      { date: "2026-12-06", name: "2. adventtisunnuntai", theme: "Kuninkaasi tulee kunniassa", liturgicalColor: "sininen", liturgicalColorHex: "#1565c0" },
    ],
  };

  const table = buildUpcomingSundaysTable(mockSundays);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0].cells[1].value, "1. adventtisunnuntai");
  assert.equal(table.rows[1].cells[1].value, "2. adventtisunnuntai");
});

test("buildDailyHoursTable structures morning, midday, and evening prayers", () => {
  const mockLec = {
    lectionary: {
      morning: { readings: [{ reference: "Room. 8:1-11", text: "Niin ei nyt siis ole..." }], psalms: [{ reference: "Ps. 63", text: "Jumala..." }] },
      noon: { readings: [], psalms: [{ reference: "Ps. 121", text: "Minä nostan silmäni..." }] },
      evening: { readings: [{ reference: "Ilm. 21:1-7", text: "Ja minä näin..." }], psalms: [{ reference: "Ps. 134", text: "Tulkaa, kiittäkää..." }] },
    },
  };

  const table = buildDailyHoursTable(mockLec);
  assert.equal(table.rows.length, 3);
  assert.equal(table.rows[0].cells[0].value, "Aamurukous");
  assert.equal(table.rows[1].cells[0].value, "Päivärukous");
  assert.equal(table.rows[1].cells[3].value, "Ps. 121");
});

test("buildYearCalendarTable formats church year entries", () => {
  const mockYear = {
    entries: [
      { date: "2026-01-01", name: "Uudenvuodenpäivä", theme: "Jeesuksen nimessä", liturgicalColor: { color: "valkoinen" }, slug: "uudenvuodenpaiva" },
      { date: "2026-01-06", name: "Loppiainen", theme: "Kristus, kansojen valo", liturgicalColor: { color: "valkoinen" }, slug: "loppiainen" },
    ],
  };

  const table = buildYearCalendarTable(mockYear);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0].cells[1].value, "Uudenvuodenpäivä");
  assert.equal(table.rows[1].cells[1].value, "Loppiainen");
});

test("decodeDesignIdFromToken decodes design ID from valid JWT token payload", () => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    aud: "app",
    designId: "DAG12345678",
    sub: "user-1",
  })).toString("base64url");
  const token = `${header}.${payload}.dummy_signature`;

  assert.equal(decodeDesignIdFromToken(token), "DAG12345678");
  assert.equal(decodeDesignIdFromToken("invalid-token"), null);
  assert.equal(decodeDesignIdFromToken(""), null);
});
