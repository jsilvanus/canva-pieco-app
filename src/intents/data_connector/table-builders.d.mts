import type { DataTable, DataTableLimit } from "@canva/intents/data";
import type { AnnoCalendarResponse, AnnoDailyLectionary, AnnoDay, AnnoResolvedDate } from "../../services/anno-api.mjs";

export type AnnoPreset = "day_details" | "upcoming_sundays" | "daily_hours" | "year_calendar";
export type HeaderLang = "fi" | "sv" | "en";

export type AnnoDataQuery = {
  v: 1;
  preset: AnnoPreset;
  date: string;
  endDate: string;
  year: number;
  slug: string;
  headerLang: HeaderLang;
};

export function resolvePrimaryDay(resolved: AnnoResolvedDate | null | undefined, slug?: string): AnnoDay | null;
export function applyTableLimits(
  columnConfigs: NonNullable<DataTable["columnConfigs"]>,
  rows: DataTable["rows"],
  limit?: DataTableLimit,
): DataTable;
export function buildDayDetailsTable(
  resolved: AnnoResolvedDate,
  opts?: { slug?: string; headerLang?: HeaderLang; limit?: DataTableLimit },
): DataTable;
export function buildUpcomingSundaysTable(
  resolvedList: AnnoResolvedDate[],
  opts?: { headerLang?: HeaderLang; limit?: DataTableLimit },
): DataTable;
export function buildDailyHoursTable(
  lectionaryResponse: { lectionary: AnnoDailyLectionary | null },
  opts?: { headerLang?: HeaderLang; limit?: DataTableLimit },
): DataTable;
export function buildYearCalendarTable(
  calendarResponse: AnnoCalendarResponse,
  opts?: { headerLang?: HeaderLang; limit?: DataTableLimit },
): DataTable;
export function buildEventsTable(
  eventsList: any[],
  opts?: { limit?: DataTableLimit },
): DataTable;
export function parseDataSourceRef(source: string | undefined): AnnoDataQuery;
