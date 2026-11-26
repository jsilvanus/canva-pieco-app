import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import {
  Badge,
  Box,
  Button,
  Column,
  Columns,
  FormField,
  Rows,
  SegmentedControl,
  Select,
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { fetchEvents, fetchCategories, fetchVenues } from "../services/katrina-api.mjs";
import type { EventItem } from "../services/katrina-api.mjs";
import { insertTextIntoDesign } from "../services/canva-sdk.mjs";

type Props = {
  notify: (msg: string, tone?: "info" | "positive" | "warn" | "critical") => void;
};

export function EventsView({ notify }: Props) {
  const intl = useIntl();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState<"upcoming" | "week" | "month" | "all">("upcoming");
  const [category, setCategory] = useState<string>("kaikki");
  const [venue, setVenue] = useState<string>("kaikki");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [venuesList, setVenuesList] = useState<{ id: string; name: string }[]>([]);

  // Load categories and venues once
  useEffect(() => {
    void (async () => {
      try {
        const [catRes, venRes] = await Promise.all([fetchCategories(), fetchVenues()]);
        setCategoriesList(catRes.categories || []);
        setVenuesList(venRes.venues || []);
      } catch {
        // Ignored
      }
    })();
  }, []);

  // Compute date limits based on filter
  const getDateRange = useCallback(() => {
    const now = new Date();
    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
    const startIso = toIsoDate(now);

    if (dateFilter === "week") {
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return { startDate: startIso, endDate: toIsoDate(end) };
    }
    if (dateFilter === "month") {
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return { startDate: startIso, endDate: toIsoDate(end) };
    }
    if (dateFilter === "upcoming") {
      return { startDate: startIso };
    }
    return {};
  }, [dateFilter]);

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await fetchEvents({
        startDate,
        endDate,
        category: category !== "kaikki" ? category : undefined,
        venue: venue !== "kaikki" ? venue : undefined,
        q: searchQuery.trim() || undefined,
        limit: 50,
      });
      setEvents(res.items || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      notify(msg, "critical");
    } finally {
      setLoading(false);
    }
  }, [getDateRange, category, venue, searchQuery, notify]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Add full slide snippet to Canva slide
  const handleAddFullSlide = async (item: EventItem) => {
    try {
      const timeAndVenue = `${item.date_display} klo ${item.time_display} | ${item.venue}${
        item.venue_address ? ` (${item.venue_address})` : ""
      }`;
      await insertTextIntoDesign({
        title: item.title,
        reference: timeAndVenue,
        body: item.slide_snippets?.short_body || item.description_clean || "",
        date: item.start_time ? item.start_time.slice(0, 10) : undefined,
      });
      notify(
        intl.formatMessage(
          { defaultMessage: "Lisätty tapahtuma: {title}", description: "Event added notice" },
          { title: item.title }
        ),
        "positive"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(
        intl.formatMessage(
          { defaultMessage: "Lisäys epäonnistui: {msg}", description: "Event add failed" },
          { msg }
        ),
        "critical"
      );
    }
  };

  // Add single field
  const handleAddPart = async (text: string, label: string) => {
    if (!text || !text.trim()) {
      notify(
        intl.formatMessage(
          { defaultMessage: "Kenttä {label} on tyhjä", description: "Empty field notice" },
          { label }
        ),
        "warn"
      );
      return;
    }
    try {
      await insertTextIntoDesign({
        body: text.trim(),
      });
      notify(
        intl.formatMessage(
          { defaultMessage: "Lisätty kenttä: {label}", description: "Field added notice" },
          { label }
        ),
        "positive"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(
        intl.formatMessage(
          { defaultMessage: "Lisäys epäonnistui: {msg}", description: "Field add failed" },
          { msg }
        ),
        "critical"
      );
    }
  };

  return (
    <Rows spacing="2u">
      {/* Header & Filter Controls */}
      <Rows spacing="1.5u">
        <Columns spacing="1u" alignY="center">
          <Column>
            <Title size="small">
              {intl.formatMessage({
                defaultMessage: "Katrina Tapahtumat",
                description: "Events tab title",
              })}
            </Title>
          </Column>
          <Column width="content">
            <Button variant="tertiary" size="small" onClick={() => void loadEvents()}>
              {intl.formatMessage({ defaultMessage: "Päivitä", description: "Refresh events" })}
            </Button>
          </Column>
        </Columns>

        {/* Date filter pills */}
        <SegmentedControl
          options={[
            {
              value: "upcoming",
              label: intl.formatMessage({ defaultMessage: "Tulevat", description: "Upcoming filter" }),
            },
            {
              value: "week",
              label: intl.formatMessage({ defaultMessage: "7 pv", description: "7 days filter" }),
            },
            {
              value: "month",
              label: intl.formatMessage({ defaultMessage: "30 pv", description: "30 days filter" }),
            },
            {
              value: "all",
              label: intl.formatMessage({ defaultMessage: "Kaikki", description: "All filter" }),
            },
          ]}
          value={dateFilter}
          onChange={(val) => setDateFilter(val as "upcoming" | "week" | "month" | "all")}
        />
      </Rows>

      {/* Dropdown Filters */}
      <Rows spacing="1.5u">
        <Columns spacing="1u">
          <Column>
            <FormField
              label={intl.formatMessage({
                defaultMessage: "Toiminta-alue / Kategoria",
                description: "Category label",
              })}
              value={category}
              control={(props) => (
                <Select
                  {...props}
                  stretch
                  value={category}
                  onChange={setCategory}
                  options={[
                    {
                      value: "kaikki",
                      label: intl.formatMessage({
                        defaultMessage: "Kaikki kategoriat",
                        description: "All categories",
                      }),
                    },
                    ...categoriesList.map((c) => ({ value: c, label: c })),
                  ]}
                />
              )}
            />
          </Column>
          <Column>
            <FormField
              label={intl.formatMessage({
                defaultMessage: "Tila / Paikka",
                description: "Venue label",
              })}
              value={venue}
              control={(props) => (
                <Select
                  {...props}
                  stretch
                  value={venue}
                  onChange={setVenue}
                  options={[
                    {
                      value: "kaikki",
                      label: intl.formatMessage({
                        defaultMessage: "Kaikki tilat",
                        description: "All venues",
                      }),
                    },
                    ...venuesList.map((v) => ({ value: v.name, label: v.name })),
                  ]}
                />
              )}
            />
          </Column>
        </Columns>

        <FormField
          label={intl.formatMessage({
            defaultMessage: "Haku otsikosta tai kuvauksesta",
            description: "Search label",
          })}
          value={searchQuery}
          control={(props) => (
            <TextInput
              {...props}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={intl.formatMessage({
                defaultMessage: "Hae tapahtumia...",
                description: "Search placeholder",
              })}
            />
          )}
        />
      </Rows>

      {/* Event list */}
      <Rows spacing="1.5u">
        {loading && (
          <Box padding="2u">
            <Text tone="tertiary">
              {intl.formatMessage({
                defaultMessage: "Haetaan tapahtumia Katrina-tietokannasta…",
                description: "Loading text",
              })}
            </Text>
          </Box>
        )}

        {!loading && error && (
          <Box padding="1.5u" background="neutralSubtle">
            <Text tone="critical">{error}</Text>
          </Box>
        )}

        {!loading && !error && events.length === 0 && (
          <Box padding="2u">
            <Text tone="tertiary">
              {intl.formatMessage({
                defaultMessage: "Ei tapahtumia valituilla hakuehdoilla.",
                description: "No events empty state",
              })}
            </Text>
          </Box>
        )}

        {!loading &&
          !error &&
          events.map((ev) => {
            const dateTimeDisplay = `${ev.date_display} ${ev.time_display}`;
            const venueDisplay = ev.venue_address ? `${ev.venue} (${ev.venue_address})` : ev.venue;
            const timeAndVenue = `${ev.date_display} klo ${ev.time_display} | ${venueDisplay}`;
            const shortBody = ev.slide_snippets?.short_body || (ev.description_clean ? ev.description_clean.slice(0, 160) : "");

            return (
              <Box key={ev.id} padding="1.5u" background="neutralSubtle" borderRadius="standard">
                <Rows spacing="1u">
                  <Columns spacing="1u" alignY="center">
                    <Column>
                      <Badge tone="info" text={dateTimeDisplay} />
                    </Column>
                    <Column width="content">
                      <Badge tone="contrast" text={ev.category} />
                    </Column>
                  </Columns>

                  <Rows spacing="0.5u">
                    <Title size="small">{ev.title}</Title>
                    <Text size="small" tone="secondary">
                      {venueDisplay}
                    </Text>
                    {shortBody && (
                      <Text size="small" tone="tertiary">
                        {shortBody}
                      </Text>
                    )}
                  </Rows>

                  {/* Insertion action buttons */}
                  <Rows spacing="0.5u">
                    <Button
                      variant="primary"
                      size="medium"
                      onClick={() => void handleAddFullSlide(ev)}
                      stretch
                    >
                      {intl.formatMessage({
                        defaultMessage: "+ Lisää diaan (Koko teksti)",
                        description: "Add full slide button",
                      })}
                    </Button>
                    <Columns spacing="0.5u">
                      <Column>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => void handleAddPart(ev.title, "Otsikko")}
                          stretch
                        >
                          {intl.formatMessage({
                            defaultMessage: "Otsikko",
                            description: "Insert title button",
                          })}
                        </Button>
                      </Column>
                      <Column>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => void handleAddPart(timeAndVenue, "Aika & Paikka")}
                          stretch
                        >
                          {intl.formatMessage({
                            defaultMessage: "Aika & Paikka",
                            description: "Insert time venue button",
                          })}
                        </Button>
                      </Column>
                      <Column>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() =>
                            void handleAddPart(
                              ev.slide_snippets?.short_body || ev.description_clean || "",
                              "Kuvaus"
                            )
                          }
                          stretch
                        >
                          {intl.formatMessage({
                            defaultMessage: "Kuvaus",
                            description: "Insert description button",
                          })}
                        </Button>
                      </Column>
                    </Columns>
                  </Rows>
                </Rows>
              </Box>
            );
          })}
      </Rows>
    </Rows>
  );
}
