import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import {
  Alert,
  Badge,
  Box,
  Button,
  Column,
  Columns,
  DateInput,
  FormField,
  Rows,
  Select,
  Switch,
  Text,
  Title,
} from "@canva/app-ui-kit";
import type { DateObj } from "@canva/app-ui-kit";
import {
  getDate,
  liturgicalColorHex,
  nextSundayIso,
  todayIso,
} from "../services/anno-api.mjs";
import type { AnnoDay, AnnoResolvedDate } from "../services/anno-api.mjs";
import {
  autofillDesignWithAnnoTable,
  insertColorSwatchIntoDesign,
  insertTextIntoDesign,
} from "../services/canva-sdk.mjs";
import { buildDayDetailsTable } from "../intents/data_connector/table-builders.mjs";

const toIso = (d?: DateObj) =>
  d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "";

const fromIso = (s?: string): DateObj | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : undefined;
};

type Props = {
  notify: (msg: string, tone?: "info" | "positive" | "warn" | "critical") => void;
};

export function ChurchYearView({ notify }: Props) {
  const intl = useIntl();
  const [date, setDate] = useState<string>(todayIso());
  const [resolved, setResolved] = useState<AnnoResolvedDate | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [autoUpdate, setAutoUpdate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDate = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDate(targetDate);
      setResolved(data);
      setSelectedSlug(data.holyDay?.slug || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDate(date);
  }, [date, loadDate]);

  const activeDay: AnnoDay | null =
    (resolved?.additionalServices ?? []).find((s) => s.slug === selectedSlug) ||
    resolved?.holyDay ||
    resolved?.weekdayMaterial ||
    null;

  const colorName = activeDay?.liturgicalColor?.color || resolved?.liturgicalColor?.color || "";
  const colorHex = colorName ? liturgicalColorHex(colorName) : "#7E003E";

  const handleInsert = async (opts: { title?: string; reference?: string; body?: string; fieldKey: string }) => {
    try {
      const res = await insertTextIntoDesign({
        ...opts,
        autoUpdate,
        date,
      });
      if (res.status === "completed" || res.status === "simulated") {
        notify(
          autoUpdate
            ? intl.formatMessage({ defaultMessage: "Inserted auto-updating dynamic text.", description: "Notice when inserting dynamic text" })
            : intl.formatMessage({ defaultMessage: "Inserted text into design.", description: "Notice when inserting standard text" }),
          "positive",
        );
      } else {
        notify(intl.formatMessage({ defaultMessage: "Could not insert text.", description: "Notice when inserting text fails" }), "warn");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  const handleInsertColorSwatch = async () => {
    try {
      await insertColorSwatchIntoDesign({ hex: colorHex, label: colorName });
      notify(intl.formatMessage({ defaultMessage: "Inserted liturgical color swatch.", description: "Notice when inserting color swatch" }), "positive");
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  const handleAutofillPage = async () => {
    if (!resolved) return;
    try {
      const table = buildDayDetailsTable(resolved, { slug: selectedSlug });
      const res = await autofillDesignWithAnnoTable(table);
      if (res.status === "success" || res.status === "simulated") {
        notify(intl.formatMessage({ defaultMessage: "Autofilled page elements with church year data.", description: "Notice on successful page autofill" }), "positive");
      } else {
        notify(intl.formatMessage({ defaultMessage: "No matching tagged fields found on this page.", description: "Notice when no autofill tags match" }), "info");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  const dayOptions = [
    ...(resolved?.holyDay ? [{ value: resolved.holyDay.slug, label: resolved.holyDay.name }] : []),
    ...(resolved?.additionalServices ?? []).map((s) => ({ value: s.slug, label: s.name })),
  ];

  const texts = activeDay?.texts;
  const psalm = activeDay?.psalm;
  const hallelujah = activeDay?.hallelujah?.text || activeDay?.psalmVerse?.text;
  const prayers = activeDay?.prayers ?? [];
  const lec = activeDay?.dailyLectionary;

  return (
    <Rows spacing="2u">
      <Rows spacing="1u">
        <Columns spacing="1u" alignY="center">
          <Column>
            <Button variant="secondary" size="small" stretch onClick={() => setDate(todayIso())}>
              {intl.formatMessage({ defaultMessage: "Today", description: "Button setting date to today" })}
            </Button>
          </Column>
          <Column>
            <Button variant="secondary" size="small" stretch onClick={() => setDate(nextSundayIso())}>
              {intl.formatMessage({ defaultMessage: "Next Sunday", description: "Button setting date to next Sunday" })}
            </Button>
          </Column>
        </Columns>
        <FormField
          label={intl.formatMessage({ defaultMessage: "Date", description: "Church year date selector" })}
          value={fromIso(date)}
          control={(props) => (
            <DateInput
              {...props}
              onChange={(d?: DateObj) => {
                if (d) setDate(toIso(d));
              }}
            />
          )}
        />
        {dayOptions.length > 1 && (
          <FormField
            label={intl.formatMessage({ defaultMessage: "Service", description: "Select between multiple services on the same date" })}
            value={selectedSlug}
            control={(props) => (
              <Select
                {...props}
                stretch
                value={selectedSlug}
                onChange={setSelectedSlug}
                options={dayOptions}
              />
            )}
          />
        )}
      </Rows>

      {error && <Alert tone="critical">{error}</Alert>}

      {activeDay && (
        <Box padding="1.5u" background="neutralSubtle">
          <Rows spacing="1u">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Title size="small">{activeDay.name}</Title>
              </Column>
              <Column width="content">
                <Badge
                  tone="info"
                  text={colorName || intl.formatMessage({ defaultMessage: "No color", description: "No liturgical color" })}
                />
              </Column>
            </Columns>
            {activeDay.theme && (
              <Text size="small" tone="secondary">
                {activeDay.theme}
              </Text>
            )}
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small" tone="tertiary">
                  {activeDay.altarCandles || intl.formatMessage(
                    { defaultMessage: "{season} • {period}", description: "Season and period" },
                    { season: resolved?.season || "", period: resolved?.period || "" }
                  )}
                </Text>
              </Column>
              <Column width="content">
                <Button variant="tertiary" size="small" onClick={handleInsertColorSwatch}>
                  {intl.formatMessage({ defaultMessage: "Insert color swatch", description: "Button to insert color rectangle" })}
                </Button>
              </Column>
            </Columns>
          </Rows>
        </Box>
      )}

      <Box padding="1.5u" background="neutralSubtle">
        <Columns spacing="1u" alignY="center">
          <Column>
            <Text size="small">
              <strong>
                {intl.formatMessage({ defaultMessage: "Auto-update from Data Connector", description: "Toggle label for data-bound elements" })}
              </strong>
            </Text>
            <Text size="xsmall" tone="secondary">
              {autoUpdate
                ? intl.formatMessage({ defaultMessage: "On: inserts dynamic data-bound element", description: "Dynamic mode on" })
                : intl.formatMessage({ defaultMessage: "Off: inserts standard editable Canva rich text", description: "Dynamic mode off" })}
            </Text>
          </Column>
          <Column width="content">
            <Switch value={autoUpdate} onChange={setAutoUpdate} />
          </Column>
        </Columns>
      </Box>

      <Button variant="secondary" size="small" stretch loading={loading} onClick={() => void handleAutofillPage()}>
        {intl.formatMessage({ defaultMessage: "Autofill page fields for this date", description: "Button to autofill tagged fields on page" })}
      </Button>

      {/* Insertable Items */}
      <Rows spacing="1.5u">
        {/* Title & Theme */}
        {activeDay && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small"><strong>{activeDay.name}</strong></Text>
                {activeDay.theme && <Text size="xsmall" tone="secondary">{activeDay.theme}</Text>}
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      title: activeDay.name,
                      body: activeDay.theme || "",
                      fieldKey: "dayTitle",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* Gospel */}
        {texts?.gospel && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage(
                      { defaultMessage: "Gospel{ref}", description: "Gospel section label" },
                      { ref: texts.gospel.reference ? ` — ${texts.gospel.reference}` : "" }
                    )}
                  </strong>
                </Text>
                {texts.gospel.text && <Text size="xsmall" tone="secondary" lineClamp={2}>{texts.gospel.text}</Text>}
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      reference: texts.gospel?.reference || "",
                      body: texts.gospel?.text || "",
                      fieldKey: "gospelText",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* First Reading */}
        {texts?.firstReading && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage(
                      { defaultMessage: "1st Reading{ref}", description: "First reading label" },
                      { ref: texts.firstReading.reference ? ` — ${texts.firstReading.reference}` : "" }
                    )}
                  </strong>
                </Text>
                {texts.firstReading.text && <Text size="xsmall" tone="secondary" lineClamp={2}>{texts.firstReading.text}</Text>}
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      reference: texts.firstReading?.reference || "",
                      body: texts.firstReading?.text || "",
                      fieldKey: "firstReadingText",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* Second Reading */}
        {texts?.secondReading && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage(
                      { defaultMessage: "2nd Reading{ref}", description: "Second reading label" },
                      { ref: texts.secondReading.reference ? ` — ${texts.secondReading.reference}` : "" }
                    )}
                  </strong>
                </Text>
                {texts.secondReading.text && <Text size="xsmall" tone="secondary" lineClamp={2}>{texts.secondReading.text}</Text>}
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      reference: texts.secondReading?.reference || "",
                      body: texts.secondReading?.text || "",
                      fieldKey: "secondReadingText",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* Psalm */}
        {psalm && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage(
                      { defaultMessage: "Psalm{ref}", description: "Psalm section label" },
                      { ref: psalm.reference ? ` — ${psalm.reference}` : "" }
                    )}
                  </strong>
                </Text>
                {psalm.antiphon && (
                  <Text size="xsmall" tone="secondary">
                    {intl.formatMessage(
                      { defaultMessage: "Antiphon: {text}", description: "Antiphon label" },
                      { text: psalm.antiphon }
                    )}
                  </Text>
                )}
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      reference: psalm.reference || "",
                      body: [psalm.antiphon ? `Antifoni: ${psalm.antiphon}` : "", psalm.text].filter(Boolean).join("\n\n"),
                      fieldKey: "psalmText",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* Hallelujah / Lent verse */}
        {hallelujah && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage({ defaultMessage: "Hallelujah / Psalm verse", description: "Hallelujah section label" })}
                  </strong>
                </Text>
                <Text size="xsmall" tone="secondary" lineClamp={2}>{hallelujah}</Text>
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      body: hallelujah,
                      fieldKey: "hallelujahText",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* Collect Prayer */}
        {prayers.length > 0 && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage({ defaultMessage: "Collect Prayer", description: "Collect prayer label" })}
                  </strong>
                </Text>
                <Text size="xsmall" tone="secondary" lineClamp={2}>{prayers[0].text}</Text>
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      body: prayers[0].text,
                      fieldKey: "collectPrayer",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}

        {/* Midday Psalm from Lectionary */}
        {lec?.noon?.psalms?.[0] && (
          <Box padding="1u" background="neutralSubtle">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage(
                      { defaultMessage: "Midday Psalm (Lectionary){ref}", description: "Midday psalm label" },
                      { ref: lec.noon.psalms[0].reference ? ` — ${lec.noon.psalms[0].reference}` : "" }
                    )}
                  </strong>
                </Text>
                {lec.noon.psalms[0].text && <Text size="xsmall" tone="secondary" lineClamp={2}>{lec.noon.psalms[0].text}</Text>}
              </Column>
              <Column width="content">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    handleInsert({
                      title: intl.formatMessage({ defaultMessage: "Midday Psalm", description: "Midday psalm title" }),
                      reference: lec.noon?.psalms?.[0]?.reference || "",
                      body: lec.noon?.psalms?.[0]?.text || "",
                      fieldKey: "noonPsalm",
                    })
                  }
                >
                  {intl.formatMessage({ defaultMessage: "Insert", description: "Insert button" })}
                </Button>
              </Column>
            </Columns>
          </Box>
        )}
      </Rows>
    </Rows>
  );
}
