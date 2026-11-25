export type AnnoReading = {
  reference: string;
  bookIntro?: string | null;
  text: string | null;
  alternatives?: AnnoReading[];
};

export type AnnoPassage = {
  reference: string;
  text: string | null;
  chant?: string;
};

export type AnnoPrayerHour = {
  readings: AnnoPassage[];
  psalms: AnnoPassage[];
};

export type AnnoDailyLectionary = {
  firstVespers?: AnnoPrayerHour;
  morning?: AnnoPrayerHour;
  noon?: AnnoPrayerHour;
  evening?: AnnoPrayerHour;
  nextDayFirstVespers?: AnnoPrayerHour;
  dayPsalm?: AnnoPassage[];
  weekPsalm?: AnnoPassage[];
  apocrypha?: AnnoPassage[];
};

export type AnnoLiturgicalColor = {
  color: string | null;
  alternatives?: string[];
  english?: string[];
  note?: string | null;
  text?: string;
};

export type AnnoDay = {
  name: string;
  slug: string;
  date?: string;
  type: string;
  theme?: string | null;
  latinName?: string | null;
  alternativeName?: string | null;
  season?: string | null;
  period?: string | null;
  description?: string | null;
  liturgicalColor?: AnnoLiturgicalColor | null;
  altarCandles?: string | null;
  texts?: {
    yearCycle?: number;
    sameInAllCycles?: boolean;
    firstReading?: AnnoReading | null;
    secondReading?: AnnoReading | null;
    gospel?: AnnoReading | null;
    alternativeSermonTexts?: string[];
  } | null;
  psalm?: {
    antiphon?: string | null;
    antiphonReference?: string | null;
    text?: string | null;
    reference?: string | null;
  } | null;
  hallelujah?: { text?: string | null; reference?: string | null } | null;
  psalmVerse?: { text?: string | null; reference?: string | null } | null;
  prayers?: Array<{ number: number; text: string }>;
  dailyLectionary?: AnnoDailyLectionary | null;
};

export type AnnoResolvedDate = {
  date: string;
  dayOfWeek: string;
  season?: string | null;
  period?: string | null;
  churchYear?: {
    start: number;
    label: string;
    yearCycle: number;
    firstAdventSunday?: string;
    easter?: string;
    lastDay?: string;
  } | null;
  holyDay: AnnoDay | null;
  additionalServices: AnnoDay[];
  weekdayMaterial: AnnoDay | null;
  liturgicalColor: AnnoLiturgicalColor | null;
  liturgy?: {
    gloria?: boolean;
    hallelujah?: boolean;
    psalmVerseInsteadOfHallelujah?: boolean;
    gloriaPatri?: boolean;
    notes?: string[];
  } | null;
};

export type AnnoCalendarResponse = {
  churchYear: { start: number; label: string; yearCycle: number };
  entries: Array<{
    date: string;
    slug: string;
    name: string;
    type: string;
    theme?: string | null;
    liturgicalColor?: AnnoLiturgicalColor | null;
    gospel?: string | null;
  }>;
};

export const LITURGICAL_COLOR_HEX: Readonly<Record<string, string>>;
export function liturgicalColorHex(colorName: string | null | undefined): string;
export function todayIso(now?: Date): string;
export function nextSundayIso(fromIso?: string): string;
export class AnnoApiError extends Error {
  code: string;
  status: number;
  userMessage: string;
}
export function getToday(opts?: { cycles?: boolean; baseUrl?: string; fetch?: typeof fetch; signal?: AbortSignal }): Promise<AnnoResolvedDate>;
export function getDate(dateIso: string, opts?: { cycles?: boolean; baseUrl?: string; fetch?: typeof fetch; signal?: AbortSignal }): Promise<AnnoResolvedDate>;
export function getDateLectionary(dateIso: string, opts?: { day?: string; baseUrl?: string; fetch?: typeof fetch; signal?: AbortSignal }): Promise<{ date: string; day: { name: string; slug: string; type: string }; lectionary: AnnoDailyLectionary | null }>;
export function getYearCalendar(year: number, opts?: { baseUrl?: string; fetch?: typeof fetch; signal?: AbortSignal }): Promise<AnnoCalendarResponse>;
export function getUpcomingSundays(startIso: string, endIso: string, opts?: { maxRows?: number; concurrency?: number; baseUrl?: string; fetch?: typeof fetch; signal?: AbortSignal }): Promise<AnnoResolvedDate[]>;
