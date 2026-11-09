import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { ArrowDownIcon, ArrowUpIcon, Badge, Box, Button, Columns, Column, FormField, ImageCard, Rows, Select, Text, Title } from "@canva/app-ui-kit";
import { exportDesignPages, isRunningInCanva } from "../services/canva-sdk.mjs";
import { pushCanvaGraphic, setCanvaGraphicOffAir } from "../services/gateway-api.mjs";
import { Thumbnails } from "./slides_view";
import type { Page, PanelProps } from "./types";

type Options = { movement: string; autoHideMs: number; slot: number; mediaPlayer: number; keyer: string };
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** ATEM graphics: load the design as a deck of overlays and fly them on air with the flying key. */
export function GraphicsView({ notify, showProgress, clearProgress, busy, active }: PanelProps) {
  const intl = useIntl();
  const [pages, setPages] = useState<Page[]>([]);
  const [cued, setCued] = useState(1);
  const [options, setOptions] = useState<Options>({ movement: "fly-left", autoHideMs: 7000, slot: 7, mediaPlayer: 1, keyer: "usk" });
  const [flying, setFlying] = useState(false);
  const [onAir, setOnAir] = useState<{ index: number; remaining: number | null } | null>(null);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = () => {
    if (countdown.current) clearInterval(countdown.current);
    countdown.current = null;
  };
  useEffect(() => stopCountdown, []);

  const loadDeck = async () => {
    showProgress(20, intl.formatMessage({ defaultMessage: "Exporting the graphics deck from Canva…", description: "Progress while the graphics are exported" }));
    try {
      const exported = await exportDesignPages();
      clearProgress();
      if (exported.status === "aborted") {
        notify(intl.formatMessage({ defaultMessage: "Graphics export was cancelled.", description: "Notice when the export is cancelled" }));
        return;
      }
      const deck: Page[] = exported.exportBlobs || [];
      if (deck.length === 0) {
        notify(intl.formatMessage({ defaultMessage: "No pages were exported from Canva.", description: "Error when the export has no pages" }), "critical");
        return;
      }
      setPages(deck);
      setCued(1);
      notify(intl.formatMessage({ defaultMessage: "Loaded {count, plural, one {# graphic} other {# graphics}}.", description: "Success after loading the deck" }, { count: deck.length }), "positive");
    } catch (err) {
      clearProgress();
      notify(errorMessage(err), "critical");
    }
  };

  const offAir = async () => {
    stopCountdown();
    try {
      await setCanvaGraphicOffAir({ keyer: options.keyer, index: 1 });
      setOnAir(null);
    } catch (err) {
      notify(errorMessage(err), "critical");
    }
  };

  const fly = async () => {
    const page = pages[cued - 1];
    if (!page || flying) return;
    const title = page.name || intl.formatMessage({ defaultMessage: "Graphic {n}", description: "Fallback graphic name" }, { n: cued });
    setFlying(true);
    try {
      // The gateway has no media player field yet; mediaPlayer stays a UI choice as before.
      const { movement, autoHideMs, keyer, slot } = options;
      await pushCanvaGraphic({ title, imageUrl: page.url, movement, autoHideMs, keyer, slot });
      stopCountdown();
      let remaining: number | null = options.autoHideMs > 0 ? Math.round(options.autoHideMs / 1000) : null;
      setOnAir({ index: cued, remaining });
      if (remaining) {
        // The gateway hides the graphic itself; this only mirrors the countdown.
        countdown.current = setInterval(() => {
          remaining = (remaining ?? 1) - 1;
          if (remaining <= 0) {
            stopCountdown();
            setOnAir(null);
          } else {
            setOnAir((prev) => prev && { ...prev, remaining });
          }
        }, 1000);
      }
    } catch (err) {
      notify(errorMessage(err), "critical");
    } finally {
      setFlying(false);
    }
  };

  const cue = (direction: "next" | "prev") => {
    if (pages.length === 0) return;
    setCued((n) => (direction === "next" ? (n >= pages.length ? 1 : n + 1) : n <= 1 ? pages.length : n - 1));
  };

  // Keyboard: space/enter flies or takes off air, Esc takes off air, arrows cue.
  const keys = useRef({ fly, offAir, cue, onAir, active });
  keys.current = { fly, offAir, cue, onAir, active };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const k = keys.current;
      if (!k.active) return;
      if (e.key === " " || e.key === "Enter") (k.onAir ? k.offAir : k.fly)();
      else if (e.key === "Escape") k.offAir();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") k.cue("next");
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") k.cue("prev");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (patch: Partial<Options>) => setOptions((prev) => ({ ...prev, ...patch }));
  const movementOptions = [
    { value: "fly-left", label: intl.formatMessage({ defaultMessage: "Fly in from left", description: "Flying key movement" }) },
    { value: "fly-right", label: intl.formatMessage({ defaultMessage: "Fly in from right", description: "Flying key movement" }) },
    { value: "fly-bottom", label: intl.formatMessage({ defaultMessage: "Fly in from bottom", description: "Flying key movement" }) },
    { value: "fly-top", label: intl.formatMessage({ defaultMessage: "Fly in from top", description: "Flying key movement" }) },
    { value: "zoom", label: intl.formatMessage({ defaultMessage: "Zoom from center", description: "Flying key movement" }) },
    { value: "dissolve", label: intl.formatMessage({ defaultMessage: "Dissolve", description: "Flying key movement" }) },
    { value: "cut", label: intl.formatMessage({ defaultMessage: "Cut", description: "Flying key movement" }) },
  ];
  const seconds = (s: number) => intl.formatMessage({ defaultMessage: "{s} seconds", description: "Auto-hide duration" }, { s });
  const autoHideOptions = [
    { value: 0, label: intl.formatMessage({ defaultMessage: "Manual (hold until taken off)", description: "No auto-hide" }) },
    { value: 5000, label: seconds(5) },
    { value: 7000, label: seconds(7) },
    { value: 10000, label: seconds(10) },
    { value: 15000, label: seconds(15) },
  ];
  const motionFields = (
    <Columns spacing="1u">
      <Column>
        <FormField
          label={intl.formatMessage({ defaultMessage: "Movement", description: "Label of the flying key movement" })}
          value={options.movement}
          control={(props) => <Select {...props} stretch options={movementOptions} onChange={(movement) => set({ movement })} />}
        />
      </Column>
      <Column>
        <FormField
          label={intl.formatMessage({ defaultMessage: "Auto-hide", description: "Label of the on-air duration" })}
          value={options.autoHideMs}
          control={(props) => <Select {...props} stretch options={autoHideOptions} onChange={(autoHideMs) => set({ autoHideMs })} />}
        />
      </Column>
    </Columns>
  );
  const loadLabel = intl.formatMessage({ defaultMessage: "Load graphics deck from Canva", description: "Exports the design as graphics" });

  if (pages.length === 0) {
    return (
      <Rows spacing="2u">
        <Text>
          {intl.formatMessage({
            defaultMessage: "Export transparent overlays, lower thirds or song titles from this design and fly them live to the ATEM media player with the flying key.",
            description: "Explains the graphics mode",
          })}
        </Text>
        <Button variant="primary" onClick={loadDeck} loading={busy} disabled={busy} stretch>
          {loadLabel}
        </Button>
        {motionFields}
        {!isRunningInCanva() && (
          <Text size="small" tone="secondary">
            {intl.formatMessage({ defaultMessage: "Running outside Canva: loads a simulated deck.", description: "Shown when the app runs outside Canva" })}
          </Text>
        )}
      </Rows>
    );
  }

  const cuedPage = pages[cued - 1];
  const cuedIsLive = onAir?.index === cued;

  return (
    <Rows spacing="2u">
      <Columns spacing="1u" alignY="center">
        <Column>
          <Title size="xsmall">
            {intl.formatMessage({ defaultMessage: "Cued: {n} of {total}", description: "Which graphic is cued" }, { n: cued, total: pages.length })}
          </Title>
        </Column>
        <Column width="content">
          <Badge
            tone={onAir ? "critical" : "assist"}
            text={
              onAir
                ? intl.formatMessage({ defaultMessage: "On air{remaining, select, null {} other { ({remaining} s)}}", description: "Badge while a graphic is on air" }, { remaining: onAir.remaining ?? "null" })
                : intl.formatMessage({ defaultMessage: "Off air", description: "Badge while nothing is on air" })
            }
          />
        </Column>
      </Columns>
      <Box background="neutralSubtle" borderRadius="large" padding="1u">
        <ImageCard thumbnailUrl={cuedPage.url} alt={cuedPage.name || ""} borderRadius="standard" selectable selected={cuedIsLive} onClick={() => {}} />
      </Box>
      <Columns spacing="1u">
        <Column>
          <Button variant="secondary" icon={ArrowUpIcon} onClick={() => cue("prev")} stretch>
            {intl.formatMessage({ defaultMessage: "Previous", description: "Cue the previous graphic" })}
          </Button>
        </Column>
        <Column>
          <Button variant="secondary" icon={ArrowDownIcon} iconPosition="end" onClick={() => cue("next")} stretch>
            {intl.formatMessage({ defaultMessage: "Next", description: "Cue the next graphic" })}
          </Button>
        </Column>
      </Columns>
      {onAir ? (
        <Button variant="primary" onClick={offAir} stretch>
          {intl.formatMessage({ defaultMessage: "Take off air (Space / Esc)", description: "Removes the graphic from the stream" })}
        </Button>
      ) : (
        <Button variant="primary" onClick={fly} loading={flying} disabled={flying} stretch>
          {intl.formatMessage({ defaultMessage: "Fly on air (Space)", description: "Puts the cued graphic on the stream" })}
        </Button>
      )}
      <Thumbnails pages={pages} selected={cued} onSelect={setCued} />
      {motionFields}
      <Columns spacing="1u">
        <Column>
          <FormField
            label={intl.formatMessage({ defaultMessage: "Media player", description: "Label of the ATEM media player choice" })}
            value={options.mediaPlayer}
            control={(props) => (
              <Select
                {...props}
                stretch
                options={[1, 2].map((n) => ({ value: n, label: intl.formatMessage({ defaultMessage: "Media player {n}", description: "ATEM media player" }, { n }) }))}
                onChange={(mediaPlayer) => set({ mediaPlayer })}
              />
            )}
          />
        </Column>
        <Column>
          <FormField
            label={intl.formatMessage({ defaultMessage: "ATEM pool slot", description: "Label of the media pool slot choice" })}
            value={options.slot}
            control={(props) => (
              <Select
                {...props}
                stretch
                options={[7, 8, 9, 10].map((n) => ({ value: n, label: intl.formatMessage({ defaultMessage: "Slot {n}", description: "ATEM media pool slot" }, { n }) }))}
                onChange={(slot) => set({ slot })}
              />
            )}
          />
        </Column>
      </Columns>
      <Columns spacing="1u">
        <Column>
          <Button variant="tertiary" onClick={loadDeck} disabled={busy} stretch>
            {intl.formatMessage({ defaultMessage: "Export again from Canva", description: "Reloads the graphics deck" })}
          </Button>
        </Column>
        <Column>
          <Button variant="tertiary" onClick={offAir} disabled={!onAir} stretch>
            {intl.formatMessage({ defaultMessage: "Force off air", description: "Takes any graphic off the stream" })}
          </Button>
        </Column>
      </Columns>
    </Rows>
  );
}
