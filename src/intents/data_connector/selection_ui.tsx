import { useState } from "react";
import { useIntl } from "react-intl";
import {
  Alert,
  Box,
  Button,
  Column,
  Columns,
  DateInput,
  FormField,
  NumberInput,
  Rows,
  Select,
  Text,
} from "@canva/app-ui-kit";
import type { DateObj } from "@canva/app-ui-kit";
import type { RenderSelectionUiRequest } from "@canva/intents/data";
import { nextSundayIso, todayIso } from "../../services/anno-api.mjs";
import { parseDataSourceRef } from "./table-builders.mjs";
import type { AnnoPreset, HeaderLang } from "./table-builders.mjs";

const toIso = (d?: DateObj) =>
  d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "";

const fromIso = (s?: string): DateObj | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : undefined;
};

function addDaysIso(iso: string, days: number): string {
  const parsed = Date.parse(`${iso}T00:00:00Z`);
  const d = Number.isFinite(parsed) ? new Date(parsed) : new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data Connector Selection UI for connecting Canva Autofill / Bulk Create to the church year Anno API. */
export function DataSelectionUi({ invocationContext, updateDataRef }: RenderSelectionUiRequest) {
  const intl = useIntl();
  const initial = parseDataSourceRef(invocationContext.dataSourceRef?.source);
  const [preset, setPreset] = useState<AnnoPreset>(initial.preset);
  const [date, setDate] = useState<string>(initial.date);
  const [endDate, setEndDate] = useState<string>(initial.endDate || addDaysIso(initial.date, 28));
  const [year, setYear] = useState<number>(initial.year);
  const [headerLang, setHeaderLang] = useState<HeaderLang>(initial.headerLang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    invocationContext.reason === "app_error" ? invocationContext.message || null : null,
  );

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = {
        v: 1 as const,
        preset,
        date,
        endDate: preset === "upcoming_sundays" ? endDate : "",
        year,
        slug: initial.slug,
        headerLang,
      };
      const titleMap: Record<AnnoPreset, string> = {
        day_details: `Kirkkovuosi ${date}`,
        upcoming_sundays: `Pyhäpäivät ${date}–${endDate}`,
        daily_hours: `Rukoushetket ${date}`,
        year_calendar: `Kirkkovuosi ${year}`,
      };
      const result = await updateDataRef({
        source: JSON.stringify(query),
        title: titleMap[preset].slice(0, 255),
      });
      if (result.status !== "completed") {
        setError(
          result.status === "app_error" && result.message
            ? result.message
            : intl.formatMessage({
                defaultMessage: "Could not load church year data from Anno API.",
                description: "Shown when the Data Connector preview request fails",
              }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding="2u">
      <Rows spacing="2u">
        {invocationContext.reason === "outdated_source_ref" && (
          <Alert tone="warn">
            {intl.formatMessage({
              defaultMessage: "This data source reference is outdated. Choose parameters and load again.",
              description: "Shown when Canva asks to refresh an outdated data source ref",
            })}
          </Alert>
        )}
        {error && <Alert tone="critical">{error}</Alert>}

        <FormField
          label={intl.formatMessage({ defaultMessage: "Dataset", description: "Label for choosing the Anno dataset preset" })}
          value={preset}
          control={(props) => (
            <Select
              {...props}
              stretch
              value={preset}
              onChange={(v) => setPreset(v as AnnoPreset)}
              options={[
                {
                  value: "day_details",
                  label: intl.formatMessage({ defaultMessage: "Single day details & texts", description: "Dataset preset for a single church year day" }),
                },
                {
                  value: "upcoming_sundays",
                  label: intl.formatMessage({ defaultMessage: "Upcoming Sundays & feasts", description: "Dataset preset for a date range of Sundays" }),
                },
                {
                  value: "daily_hours",
                  label: intl.formatMessage({ defaultMessage: "Daily prayer hours (lectionary)", description: "Dataset preset for morning/noon/evening prayer hours" }),
                },
                {
                  value: "year_calendar",
                  label: intl.formatMessage({ defaultMessage: "Church year calendar", description: "Dataset preset for full church year entries" }),
                },
              ]}
            />
          )}
        />

        {preset !== "year_calendar" && (
          <Rows spacing="1u">
            <Columns spacing="1u">
              <Column>
                <Button variant="secondary" size="small" stretch onClick={() => setDate(todayIso())}>
                  {intl.formatMessage({ defaultMessage: "Today", description: "Quick button to set the date to today" })}
                </Button>
              </Column>
              <Column>
                <Button variant="secondary" size="small" stretch onClick={() => setDate(nextSundayIso())}>
                  {intl.formatMessage({ defaultMessage: "Next Sunday", description: "Quick button to set the date to next Sunday" })}
                </Button>
              </Column>
            </Columns>
            <FormField
              label={
                preset === "upcoming_sundays"
                  ? intl.formatMessage({ defaultMessage: "Start date", description: "Start date for upcoming Sundays range" })
                  : intl.formatMessage({ defaultMessage: "Date", description: "Date for church year lookup" })
              }
              value={fromIso(date)}
              control={(props) => <DateInput {...props} onChange={(d?: DateObj) => d && setDate(toIso(d))} />}
            />
          </Rows>
        )}

        {preset === "upcoming_sundays" && (
          <FormField
            label={intl.formatMessage({ defaultMessage: "End date", description: "End date for upcoming Sundays range" })}
            value={fromIso(endDate)}
            control={(props) => (
              <DateInput {...props} min={fromIso(date)} onChange={(d?: DateObj) => d && setEndDate(toIso(d))} />
            )}
          />
        )}

        {preset === "year_calendar" && (
          <FormField
            label={intl.formatMessage({ defaultMessage: "Church year start", description: "Starting year of the church year (1st Advent)" })}
            value={year}
            control={(props) => (
              <NumberInput
                {...props}
                min={1900}
                max={2100}
                step={1}
                onChange={(v) => setYear(typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : new Date().getFullYear())}
              />
            )}
          />
        )}

        <FormField
          label={intl.formatMessage({ defaultMessage: "Column header language", description: "Language for DataTable column names" })}
          value={headerLang}
          control={(props) => (
            <Select
              {...props}
              stretch
              value={headerLang}
              onChange={(v) => setHeaderLang(v as HeaderLang)}
              options={[
                { value: "fi", label: intl.formatMessage({ defaultMessage: "Finnish", description: "Finnish column names" }) },
                { value: "sv", label: intl.formatMessage({ defaultMessage: "Swedish", description: "Swedish column names" }) },
                { value: "en", label: intl.formatMessage({ defaultMessage: "English", description: "English column names" }) },
              ]}
            />
          )}
        />

        <Text size="small" tone="secondary">
          {intl.formatMessage({
            defaultMessage: "Liturgical texts and readings come from the Finnish church year API (Anno).",
            description: "Explains the source of Anno data",
          })}
        </Text>

        <Button variant="primary" stretch loading={loading} disabled={loading} onClick={() => void loadPreview()}>
          {intl.formatMessage({ defaultMessage: "Load church year data", description: "Primary button to fetch and preview Data Connector table" })}
        </Button>
      </Rows>
    </Box>
  );
}
