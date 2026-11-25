import { useCallback, useEffect, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import {
  Alert,
  Badge,
  Box,
  Button,
  Column,
  Columns,
  FormField,
  Rows,
  Select,
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { CONFIG } from "../config.mjs";
import {
  clearOverwriteTarget,
  getOverwriteTarget,
  getPiProgramOriginalAssetUrl,
  listPiProgramItems,
  pushCanvaGraphic,
  setCanvaGraphicOffAir,
  setOverwriteTarget,
} from "../services/gateway-api.mjs";
import type { OverwriteTarget, PiProgramItem } from "../services/gateway-api.mjs";
import { listPiSystems } from "../services/pi-discovery.mjs";
import type { PiSystemEndpoint } from "../services/pi-discovery.mjs";
import {
  getCurrentDesignId,
  importImageUrlIntoDesign,
  openExternalUrl,
} from "../services/canva-sdk.mjs";
import { SlidesView } from "./slides_view";
import { GraphicsView } from "./graphics_view";
import type { NoticeTone } from "./types";

type Props = {
  notify: (msg: string, tone?: NoticeTone) => void;
  showProgress: (percent: number, label: string) => void;
  clearProgress: () => void;
  busy: boolean;
  canWrite: boolean;
  canOperate: boolean;
};

export function PiProgramLibraryView({
  notify,
  showProgress,
  clearProgress,
  busy,
  canWrite,
  canOperate,
}: Props) {
  const intl = useIntl();
  const [systems, setSystems] = useState<PiSystemEndpoint[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("primary");
  const [items, setItems] = useState<PiProgramItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeOverwrite, setActiveOverwriteState] = useState<OverwriteTarget | null>(() => getOverwriteTarget());
  const [showLiveControl, setShowLiveControl] = useState<boolean>(false);
  const [_pipelineId, setPipelineId] = useState<string>("pipgm1");
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  // Expanded item details and ATEM broadcast controls
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemAtemMovement, setItemAtemMovement] = useState<Record<string, string>>({});
  const [itemAtemAutoHide, setItemAtemAutoHide] = useState<Record<string, number>>({});
  const [airingItemId, setAiringItemId] = useState<string | null>(null);

  // Discover Pi systems (supports multiple PiProgram systems populated via Tunnus)
  useEffect(() => {
    void listPiSystems().then((sys) => {
      setSystems(sys);
      if (sys.length > 0 && !sys.some((s) => s.id === selectedSystemId)) {
        setSelectedSystemId(sys[0].id);
      }
    });
    void getCurrentDesignId().then(setCurrentDesignId);
  }, [selectedSystemId]);

  const activeSystem = systems.find((s) => s.id === selectedSystemId) || systems[0] || {
    id: "primary",
    name: "Primary Pi Gateway",
    gatewayUrl: CONFIG.gatewayUrl,
    source: "configured" as const,
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPiProgramItems({ gatewayUrl: activeSystem.gatewayUrl });
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [activeSystem.gatewayUrl]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterType !== "all") {
        if (filterType === "graphic") {
          if (item.kind !== "graphic" && item.kind !== "atem") return false;
        } else if (item.kind !== filterType) {
          return false;
        }
      }
      if (!q) return true;
      return (
        item.title?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q) ||
        item.canva?.designId?.toLowerCase().includes(q)
      );
    });
  }, [items, filterType, searchQuery]);

  // Group items by useAt date
  const groupedItems = useMemo(() => {
    const groups: Record<string, PiProgramItem[]> = {};
    for (const item of filteredItems) {
      const dates = Array.isArray(item.useAt) && item.useAt.length > 0 ? item.useAt : ["permanent"];
      for (const d of dates) {
        if (!groups[d]) groups[d] = [];
        groups[d].push(item);
      }
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "permanent") return 1;
      if (b === "permanent") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((k) => ({
      key: k,
      label: k === "permanent" ? intl.formatMessage({ defaultMessage: "Permanent / No date", description: "Permanent items header" }) : k,
      items: groups[k],
    }));
  }, [filteredItems, intl]);

  const handleOpenOriginalInCanva = async (designId: string) => {
    const url = `https://www.canva.com/design/${encodeURIComponent(designId)}/edit`;
    const opened = await openExternalUrl(url);
    if (opened) {
      notify(intl.formatMessage({ defaultMessage: "Opened original Canva design in new tab.", description: "Notice when opening Canva design" }), "positive");
    } else {
      notify(intl.formatMessage({ defaultMessage: "Could not open Canva design URL.", description: "Notice when opening Canva design fails" }), "warn");
    }
  };

  const handleToggleOverwrite = (item: PiProgramItem) => {
    if (activeOverwrite?.itemId === item.id) {
      clearOverwriteTarget();
      setActiveOverwriteState(null);
      notify(intl.formatMessage({ defaultMessage: "Cleared overwrite target.", description: "Notice on clearing overwrite target" }), "info");
    } else {
      const target: OverwriteTarget = {
        itemId: item.id,
        title: item.title,
        designId: item.canva?.designId,
        gatewayUrl: activeSystem.gatewayUrl,
        useAt: item.useAt,
      };
      setOverwriteTarget(target);
      setActiveOverwriteState(target);
      notify(intl.formatMessage({ defaultMessage: "Target selected. Next publish will overwrite this item in PiProgram.", description: "Notice when setting overwrite target" }), "positive");
    }
  };

  const handleImportOriginalPage = async (item: PiProgramItem) => {
    try {
      const url = getPiProgramOriginalAssetUrl(item, 1, { gatewayUrl: activeSystem.gatewayUrl });
      const res = await importImageUrlIntoDesign({
        url,
        title: `${item.title} (Page 1)`,
      });
      if (res.status === "completed" || res.status === "simulated") {
        notify(intl.formatMessage({ defaultMessage: "Imported slide image to current design.", description: "Notice on importing original slide image" }), "positive");
      } else {
        notify(intl.formatMessage({ defaultMessage: "Could not import image.", description: "Notice when importing image fails" }), "warn");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  const handleDownloadOriginal = (item: PiProgramItem) => {
    const url = getPiProgramOriginalAssetUrl(item, 1, { gatewayUrl: activeSystem.gatewayUrl });
    void openExternalUrl(url);
  };

  const handleTakeOnAir = async (item: PiProgramItem) => {
    const isGraphic = item.kind === "graphic" || item.kind === "atem";
    const movement = itemAtemMovement[item.id] || (isGraphic ? "fly-bottom" : "cut");
    const autoHideMs = itemAtemAutoHide[item.id] ?? 7000;
    const url = getPiProgramOriginalAssetUrl(item, 1, { gatewayUrl: activeSystem.gatewayUrl });
    setAiringItemId(item.id);
    try {
      await pushCanvaGraphic({
        title: item.title,
        imageUrl: url,
        movement,
        autoHideMs,
        keyer: "usk",
        slot: 7,
      });
      notify(
        intl.formatMessage(
          { defaultMessage: "Put \"{title}\" on air with {anim} animation.", description: "Notice when taking graphic on air" },
          { title: item.title, anim: movement }
        ),
        "positive"
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    } finally {
      setAiringItemId(null);
    }
  };

  const handleTakeOffAir = async () => {
    try {
      await setCanvaGraphicOffAir({ keyer: "usk", index: 1 });
      notify(intl.formatMessage({ defaultMessage: "Took graphics off air.", description: "Notice when off air" }), "info");
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  return (
    <Rows spacing="2u">
      {/* Header Banner */}
      <Box padding="1.5u" background="neutralSubtle">
        <Rows spacing="1u">
          <Columns spacing="1u" alignY="center">
            <Column>
              <Title size="small">
                {intl.formatMessage({ defaultMessage: "Pi Ecosystem", description: "Pi Ecosystem header" })}
              </Title>
            </Column>
            <Column width="content">
              <Badge
                tone="positive"
                text={activeSystem.venue ? activeSystem.venue.toUpperCase() : intl.formatMessage({ defaultMessage: "Connected", description: "Connected status" })}
              />
            </Column>
          </Columns>
          <Text size="small" tone="secondary">
            {intl.formatMessage({
              defaultMessage: "Parish venues, screen decks, and ATEM broadcast graphics managed via Pi Ecosystem.",
              description: "Pi Ecosystem description",
            })}
          </Text>
        </Rows>
      </Box>

      {/* Multi-Pi System Switcher */}
      {systems.length > 1 && (
        <FormField
          label={intl.formatMessage({ defaultMessage: "Pi venue / system", description: "Select Pi system venue" })}
          value={selectedSystemId}
          control={(props) => (
            <Select
              {...props}
              stretch
              value={selectedSystemId}
              onChange={setSelectedSystemId}
              options={systems.map((s) => ({
                value: s.id,
                label: s.venue || s.location
                  ? intl.formatMessage(
                      { defaultMessage: "{name} ({venue})", description: "Venue option label with venue" },
                      { name: s.name, venue: s.venue || s.location }
                    )
                  : s.name,
              }))}
            />
          )}
        />
      )}

      {/* Active Overwrite Banner */}
      {activeOverwrite && (
        <Alert tone="warn">
          <Rows spacing="1u">
            <Text size="small">
              <strong>
                {intl.formatMessage(
                  { defaultMessage: "Active overwrite target: {title}", description: "Banner showing active overwrite target" },
                  { title: activeOverwrite.title },
                )}
              </strong>
            </Text>
            <Text size="xsmall">
              {intl.formatMessage(
                { defaultMessage: "Publishing to Pi Ecosystem will overwrite item {id} in place without altering playlists.", description: "Explains overwrite mechanism" },
                { id: activeOverwrite.itemId },
              )}
            </Text>
            <Button variant="secondary" size="small" onClick={() => handleToggleOverwrite({ id: activeOverwrite.itemId, title: activeOverwrite.title, kind: "canva" })}>
              {intl.formatMessage({ defaultMessage: "Cancel overwrite (Publish as new item)", description: "Cancel overwrite button" })}
            </Button>
          </Rows>
        </Alert>
      )}

      {/* Filters & Refresh */}
      <Rows spacing="1u">
        <Columns spacing="1u" alignY="center">
          <Column>
            <FormField
              label={intl.formatMessage({ defaultMessage: "Filter type", description: "Filter items by type" })}
              value={filterType}
              control={(props) => (
                <Select
                  {...props}
                  stretch
                  value={filterType}
                  onChange={setFilterType}
                  options={[
                    { value: "all", label: intl.formatMessage({ defaultMessage: "All items", description: "All items option" }) },
                    { value: "canva", label: intl.formatMessage({ defaultMessage: "Canva presentations", description: "Canva items option" }) },
                    { value: "graphic", label: intl.formatMessage({ defaultMessage: "ATEM broadcast graphics", description: "ATEM graphics option" }) },
                    { value: "media", label: intl.formatMessage({ defaultMessage: "Images & media", description: "Media items option" }) },
                    { value: "pptx", label: intl.formatMessage({ defaultMessage: "PowerPoint", description: "PowerPoint items option" }) },
                    { value: "hymn", label: intl.formatMessage({ defaultMessage: "Hymns (virret)", description: "Hymns option" }) },
                  ]}
                />
              )}
            />
          </Column>
          <Column width="content">
            <Button variant="secondary" size="small" loading={loading} onClick={() => void loadItems()}>
              {intl.formatMessage({ defaultMessage: "Refresh", description: "Refresh button" })}
            </Button>
          </Column>
        </Columns>

        <FormField
          label={intl.formatMessage({ defaultMessage: "Search", description: "Search library items" })}
          value={searchQuery}
          control={(props) => (
            <TextInput
              {...props}
              placeholder={intl.formatMessage({ defaultMessage: "Search by title or ID…", description: "Search placeholder" })}
              onChange={setSearchQuery}
            />
          )}
        />
      </Rows>

      {error && (
        <Alert tone="critical">
          <Rows spacing="1u">
            <Text size="small">{error}</Text>
            <Button variant="secondary" size="small" onClick={() => void loadItems()}>
              {intl.formatMessage({ defaultMessage: "Retry", description: "Retry loading items" })}
            </Button>
          </Rows>
        </Alert>
      )}

      {/* Items list grouped by date */}
      <Rows spacing="2u">
        {groupedItems.length === 0 && !loading && (
          <Text size="small" tone="secondary">
            {intl.formatMessage({ defaultMessage: "No library items found.", description: "Empty library message" })}
          </Text>
        )}

        {groupedItems.map((group) => (
          <Rows key={group.key} spacing="1u">
            <Text size="small" tone="secondary">
              <strong>
                {intl.formatMessage(
                  { defaultMessage: "{label} ({count})", description: "Group header with count" },
                  { label: group.label, count: group.items.length },
                )}
              </strong>
            </Text>
            {group.items.map((item) => {
              const hasCanvaId = Boolean(item.canva?.designId && /^[a-zA-Z0-9_-]{3,64}$/.test(item.canva.designId));
              const isCurrentDesign = Boolean(hasCanvaId && currentDesignId && item.canva?.designId === currentDesignId);
              const isTargeted = activeOverwrite?.itemId === item.id;
              const isGraphic = item.kind === "graphic" || item.kind === "atem";
              const isExpanded = expandedItemId === item.id;
              const designId = item.canva?.designId;

              return (
                <Box key={item.id} padding="1.5u" background="neutralSubtle">
                  <Rows spacing="1u">
                    <Columns spacing="1u" alignY="center">
                      <Column>
                        <Title size="small">{item.title}</Title>
                      </Column>
                      <Column width="content">
                        {isGraphic ? (
                          <Badge
                            tone="positive"
                            text={intl.formatMessage({ defaultMessage: "ATEM GRAPHIC", description: "ATEM graphic badge" })}
                          />
                        ) : (
                          <Badge
                            tone={hasCanvaId ? "positive" : "contrast"}
                            text={item.kind.toUpperCase()}
                          />
                        )}
                      </Column>
                    </Columns>

                    <Columns spacing="1u" alignY="center">
                      <Column>
                        <Text size="xsmall" tone="tertiary">
                          {intl.formatMessage(
                            { defaultMessage: "ID: {id}{pages}{steps}", description: "Item metadata summary" },
                            {
                              id: item.id,
                              pages: item.canva?.pageCount ? ` • ${item.canva.pageCount} ${intl.formatMessage({ defaultMessage: "pages", description: "pages count suffix" })}` : "",
                              steps: item.steps?.length ? ` • ${item.steps.length} ${intl.formatMessage({ defaultMessage: "steps", description: "steps count suffix" })}` : "",
                            },
                          )}
                        </Text>
                      </Column>
                      {isCurrentDesign && (
                        <Column width="content">
                          <Badge tone="positive" text={intl.formatMessage({ defaultMessage: "Current design", description: "Matches active Canva design" })} />
                        </Column>
                      )}
                    </Columns>

                    <Columns spacing="1u" alignY="center">
                      {hasCanvaId && designId && (
                        <Column>
                          <Button
                            variant="secondary"
                            size="small"
                            stretch
                            onClick={() => handleOpenOriginalInCanva(designId)}
                          >
                            {intl.formatMessage({ defaultMessage: "Open in Canva", description: "Open original design in Canva" })}
                          </Button>
                        </Column>
                      )}
                      <Column>
                        <Button
                          variant="secondary"
                          size="small"
                          stretch
                          onClick={() => handleToggleOverwrite(item)}
                        >
                          {isTargeted
                            ? intl.formatMessage({ defaultMessage: "Cancel overwrite", description: "Cancel overwrite" })
                            : intl.formatMessage({ defaultMessage: "Target overwrite", description: "Set item as overwrite target" })}
                        </Button>
                      </Column>
                      <Column width="content">
                        <Button
                          variant="tertiary"
                          size="small"
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        >
                          {isExpanded
                            ? intl.formatMessage({ defaultMessage: "Hide details", description: "Hide item details" })
                            : intl.formatMessage({ defaultMessage: "Details & ATEM", description: "Show item details and ATEM options" })}
                        </Button>
                      </Column>
                    </Columns>

                    {isExpanded && (
                      <Box padding="1.5u" background="surface">
                        <Rows spacing="1.5u">
                          <Text size="small">
                            <strong>
                              {intl.formatMessage({ defaultMessage: "ATEM Broadcast & Display Settings", description: "ATEM drawer title" })}
                            </strong>
                          </Text>

                          <Columns spacing="1u">
                            <Column>
                              <FormField
                                label={intl.formatMessage({ defaultMessage: "Animation style", description: "Animation style label" })}
                                value={itemAtemMovement[item.id] || (isGraphic ? "fly-bottom" : "cut")}
                                control={(props) => (
                                  <Select
                                    {...props}
                                    stretch
                                    onChange={(val) => setItemAtemMovement((prev) => ({ ...prev, [item.id]: val }))}
                                    options={[
                                      { value: "fly-bottom", label: intl.formatMessage({ defaultMessage: "Fly in (Lower third / Alhaalta)", description: "Fly bottom" }) },
                                      { value: "fly-left", label: intl.formatMessage({ defaultMessage: "Fly in (Vasemmalta)", description: "Fly left" }) },
                                      { value: "dissolve", label: intl.formatMessage({ defaultMessage: "Dissolve (Häivytys)", description: "Dissolve" }) },
                                      { value: "cut", label: intl.formatMessage({ defaultMessage: "Cut (Suora leikkaus)", description: "Cut" }) },
                                    ]}
                                  />
                                )}
                              />
                            </Column>
                            <Column>
                              <FormField
                                label={intl.formatMessage({ defaultMessage: "Auto-hide", description: "Auto-hide duration label" })}
                                value={String(itemAtemAutoHide[item.id] ?? 7000)}
                                control={(props) => (
                                  <Select
                                    {...props}
                                    stretch
                                    onChange={(val) => setItemAtemAutoHide((prev) => ({ ...prev, [item.id]: Number(val) }))}
                                    options={[
                                      { value: "5000", label: intl.formatMessage({ defaultMessage: "5 seconds", description: "5s option" }) },
                                      { value: "7000", label: intl.formatMessage({ defaultMessage: "7 seconds", description: "7s option" }) },
                                      { value: "10000", label: intl.formatMessage({ defaultMessage: "10 seconds", description: "10s option" }) },
                                      { value: "0", label: intl.formatMessage({ defaultMessage: "Manual off-air", description: "Manual option" }) },
                                    ]}
                                  />
                                )}
                              />
                            </Column>
                          </Columns>

                          <Columns spacing="1u">
                            <Column>
                              <Button
                                variant="secondary"
                                size="small"
                                stretch
                                loading={airingItemId === item.id}
                                disabled={Boolean(airingItemId)}
                                onClick={() => void handleTakeOnAir(item)}
                              >
                                {intl.formatMessage({ defaultMessage: "Take on Air (ATEM)", description: "Take graphic on air" })}
                              </Button>
                            </Column>
                            <Column width="content">
                              <Button
                                variant="tertiary"
                                size="small"
                                onClick={() => void handleTakeOffAir()}
                              >
                                {intl.formatMessage({ defaultMessage: "Off Air", description: "Take graphic off air" })}
                              </Button>
                            </Column>
                          </Columns>

                          <Columns spacing="1u">
                            <Column width="content">
                              <Button
                                variant="tertiary"
                                size="small"
                                onClick={() => handleImportOriginalPage(item)}
                              >
                                {intl.formatMessage({ defaultMessage: "Import page into design", description: "Import raw page into design" })}
                              </Button>
                            </Column>
                            <Column width="content">
                              <Button
                                variant="tertiary"
                                size="small"
                                onClick={() => handleDownloadOriginal(item)}
                              >
                                {intl.formatMessage({ defaultMessage: "Download original", description: "Download original asset" })}
                              </Button>
                            </Column>
                          </Columns>
                        </Rows>
                      </Box>
                    )}
                  </Rows>
                </Box>
              );
            })}
          </Rows>
        ))}
      </Rows>

      {/* Expandable Live Projection & Output Drawer */}
      <Box padding="1.5u" background="neutralSubtle">
        <Rows spacing="1u">
          <Columns spacing="1u" alignY="center">
            <Column>
              <Text size="small">
                <strong>
                  {intl.formatMessage({ defaultMessage: "Live Presentation & Routing", description: "Live control drawer heading" })}
                </strong>
              </Text>
            </Column>
            <Column width="content">
              <Button
                variant="tertiary"
                size="small"
                onClick={() => setShowLiveControl((prev) => !prev)}
              >
                {showLiveControl
                  ? intl.formatMessage({ defaultMessage: "Hide", description: "Hide live controls" })
                  : intl.formatMessage({ defaultMessage: "Show", description: "Show live controls" })}
              </Button>
            </Column>
          </Columns>
          {showLiveControl && (
            <Rows spacing="1.5u">
              <SlidesView
                notify={notify}
                showProgress={showProgress}
                clearProgress={clearProgress}
                busy={busy}
                canWrite={canWrite}
                canOperate={canOperate}
                active={showLiveControl}
                onPipelineChange={setPipelineId}
              />
              <GraphicsView
                notify={notify}
                showProgress={showProgress}
                clearProgress={clearProgress}
                busy={busy}
                canWrite={canWrite}
                canOperate={canOperate}
                active={showLiveControl}
              />
            </Rows>
          )}
        </Rows>
      </Box>
    </Rows>
  );
}
