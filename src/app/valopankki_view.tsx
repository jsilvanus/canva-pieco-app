import { useCallback, useEffect, useState } from "react";
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
  SegmentedControl,
  Select,
  Switch,
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { CONFIG } from "../config.mjs";
import {
  getCurrentDesignId,
  getDesignTitle,
  inspectCurrentDesignElements,
  insertColorSwatchIntoDesign,
} from "../services/canva-sdk.mjs";
import { listValopankkiInstances } from "../services/pi-discovery.mjs";
import type { ValopankkiInstance } from "../services/pi-discovery.d.mts";
import {
  clearAssetsUsedInDesign,
  getTrackedDesignAssets,
  getValopankkiBrandKit,
  insertValopankkiAssetIntoDesign,
  removeAssetFromDesign,
  reportValopankkiExport,
  searchValopankkiAssets,
} from "../services/valopankki-api.mjs";
import type {
  TrackedDesignAsset,
  ValopankkiAssetKind,
  ValopankkiAssetSummary,
  ValopankkiBrandColor,
  ValopankkiBrandKit,
} from "../services/valopankki-api.d.mts";
import type { NoticeTone } from "./types";

type Props = {
  notify: (msg: string, tone?: NoticeTone) => void;
};

const FALLBACK_PALETTE: ValopankkiBrandColor[] = [
  { name: "Kirkon violetti (Pääväri)", hex: "#7E003E", role: "primary" },
  { name: "Valkoinen / Kulta", hex: "#FFFFFF", role: "secondary" },
  { name: "Vihreä (Arjen aika)", hex: "#2E7D32", role: "accent" },
  { name: "Liturginen violetti", hex: "#6A1B9A", role: "accent" },
  { name: "Sininen (Adventti/Maria)", hex: "#1565C0", role: "accent" },
  { name: "Punainen (Helluntai/Marttyyrit)", hex: "#C62828", role: "accent" },
  { name: "Musta (Pitkäperjantai)", hex: "#212121", role: "background" },
];

export function ValopankkiView({ notify }: Props) {
  const intl = useIntl();
  const [tab, setTab] = useState<"brand" | "assets" | "usage">("brand");
  const [brandKit, setBrandKit] = useState<ValopankkiBrandKit | null>(null);
  const [loadingBrand, setLoadingBrand] = useState<boolean>(false);

  // Asset search state
  const [search, setSearch] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<ValopankkiAssetKind | "all">("all");
  const [assets, setAssets] = useState<ValopankkiAssetSummary[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);

  // Usage tracking & print reporting state
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [currentDesignTitle, setCurrentDesignTitle] = useState<string>("");
  const [trackedAssets, setTrackedAssets] = useState<TrackedDesignAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [canvasElements, setCanvasElements] = useState<{
    supported: boolean;
    totalElements: number;
    imageCount: number;
    textCount: number;
  } | null>(null);
  const [exportTarget, setExportTarget] = useState<string>("print_pdf");
  const [usageNotes, setUsageNotes] = useState<string>("");
  const [reportingUsage, setReportingUsage] = useState<boolean>(false);
  const [inspectingCanvas, setInspectingCanvas] = useState<boolean>(false);
  const [lastReported, setLastReported] = useState<{ count: number; target: string; time: string } | null>(null);

  // Multi-Valopankki discovery
  const [instances, setInstances] = useState<ValopankkiInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("primary");

  useEffect(() => {
    void listValopankkiInstances().then((list) => {
      setInstances(list);
      if (list.length > 0 && !list.some((i) => i.id === selectedInstanceId)) {
        setSelectedInstanceId(list[0].id);
      }
    });
  }, [selectedInstanceId]);

  const activeInstance = instances.find((i) => i.id === selectedInstanceId) || instances[0];
  const activeValopankkiUrl = activeInstance?.endpoint_url || activeInstance?.url || CONFIG.valopankkiUrl;

  // Load Brand Kit for active Valopankki
  useEffect(() => {
    let active = true;
    setLoadingBrand(true);
    void getValopankkiBrandKit({ valopankkiUrl: activeValopankkiUrl })
      .then((kit) => {
        if (active) setBrandKit(kit);
      })
      .catch(() => {
        if (active) setBrandKit(null);
      })
      .finally(() => {
        if (active) setLoadingBrand(false);
      });
    return () => {
      active = false;
    };
  }, [activeValopankkiUrl]);

  // Search Assets for active Valopankki
  const performSearch = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const res = await searchValopankkiAssets({
        search,
        kind: kindFilter,
        limit: 24,
        valopankkiUrl: activeValopankkiUrl,
      });
      setAssets(res.items);
    } catch {
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, [search, kindFilter, activeValopankkiUrl]);

  useEffect(() => {
    if (tab === "assets") {
      void performSearch();
    }
  }, [tab, performSearch]);

  // Refresh Usage Data (Design ID, title, canvas elements, tracked assets)
  const refreshUsageData = useCallback(async () => {
    setInspectingCanvas(true);
    try {
      const [did, title, canvas] = await Promise.all([
        getCurrentDesignId(),
        getDesignTitle(),
        inspectCurrentDesignElements(),
      ]);
      setCurrentDesignId(did);
      setCurrentDesignTitle(title);
      setCanvasElements(canvas);

      if (did) {
        const items = getTrackedDesignAssets(did);
        setTrackedAssets(items);
        setSelectedAssetIds(items.map((a) => a.id));
      } else {
        setTrackedAssets([]);
        setSelectedAssetIds([]);
      }
    } finally {
      setInspectingCanvas(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "usage") {
      void refreshUsageData();
    }
  }, [tab, refreshUsageData]);

  const toggleAssetSelected = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRemoveTrackedAsset = (assetId: string) => {
    if (!currentDesignId) return;
    removeAssetFromDesign(currentDesignId, assetId);
    setTrackedAssets((prev) => prev.filter((a) => a.id !== assetId));
    setSelectedAssetIds((prev) => prev.filter((id) => id !== assetId));
    notify(
      intl.formatMessage({
        defaultMessage: "Asset removed from design tracking.",
        description: "Notice on asset untracked",
      }),
      "info"
    );
  };

  const handleClearAllTracking = () => {
    if (!currentDesignId) return;
    clearAssetsUsedInDesign(currentDesignId);
    setTrackedAssets([]);
    setSelectedAssetIds([]);
    notify(
      intl.formatMessage({
        defaultMessage: "Design tracking cleared.",
        description: "Notice on tracking cleared",
      }),
      "info"
    );
  };

  const handleReportUsage = async () => {
    if (!currentDesignId) {
      notify(
        intl.formatMessage({
          defaultMessage: "No active Canva design ID.",
          description: "Error no design ID",
        }),
        "critical"
      );
      return;
    }
    if (selectedAssetIds.length === 0) {
      notify(
        intl.formatMessage({
          defaultMessage: "Select at least one asset to report.",
          description: "Error no assets selected",
        }),
        "critical"
      );
      return;
    }

    setReportingUsage(true);
    try {
      const res = await reportValopankkiExport(
        {
          canvaDesignId: currentDesignId,
          canvaDesignTitle: [currentDesignTitle, usageNotes].filter(Boolean).join(" — ") || undefined,
          exportTarget,
          assetIds: selectedAssetIds,
        },
        { valopankkiUrl: activeValopankkiUrl }
      );

      const count = res.recorded || selectedAssetIds.length;
      setLastReported({
        count,
        target: exportTarget,
        time: new Date().toLocaleTimeString(),
      });

      notify(
        intl.formatMessage(
          {
            defaultMessage: "Reported usage for {count} asset(s) to Valopankki.",
            description: "Notice on successful usage report",
          },
          { count }
        ),
        "positive"
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    } finally {
      setReportingUsage(false);
    }
  };

  const handleInsertColor = async (hex: string, label: string) => {
    try {
      await insertColorSwatchIntoDesign({ hex, label });
      notify(
        intl.formatMessage({
          defaultMessage: "Inserted color swatch.",
          description: "Notice on inserting color swatch",
        }),
        "positive"
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  const handleInsertAsset = async (asset: ValopankkiAssetSummary) => {
    setInsertingId(asset.id);
    try {
      const designId = await getCurrentDesignId();
      await insertValopankkiAssetIntoDesign(
        asset,
        { designId: designId || undefined, title: asset.title },
        { valopankkiUrl: activeValopankkiUrl }
      );
      notify(
        intl.formatMessage({
          defaultMessage: "Added to design.",
          description: "Notice on asset insert",
        }),
        "positive"
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    } finally {
      setInsertingId(null);
    }
  };

  const colors = brandKit?.colors && brandKit.colors.length > 0 ? brandKit.colors : FALLBACK_PALETTE;

  return (
    <Rows spacing="2u">
      <Box padding="1.5u" background="neutralSubtle">
        <Rows spacing="1u">
          <Columns spacing="1u" alignY="center">
            <Column>
              <Title size="small">
                {intl.formatMessage({ defaultMessage: "Valopankki (Media Library)", description: "Valopankki header" })}
              </Title>
            </Column>
            <Column width="content">
              <Badge
                tone={brandKit ? "positive" : CONFIG.valopankkiUrl ? "info" : "contrast"}
                text={brandKit
                  ? intl.formatMessage({ defaultMessage: "Connected", description: "Valopankki connected" })
                  : CONFIG.valopankkiUrl
                  ? intl.formatMessage({ defaultMessage: "Configured", description: "Valopankki configured" })
                  : intl.formatMessage({ defaultMessage: "Offline mode", description: "Valopankki offline" })}
              />
            </Column>
          </Columns>
          <Text size="small" tone="secondary">
            {intl.formatMessage({
              defaultMessage: "Parish branding assets, vector pictograms, and local photo archives managed via Valopankki.",
              description: "Valopankki description",
            })}
          </Text>
        </Rows>
      </Box>

      {/* Multiple Valopankki instances selector */}
      {instances.length > 1 && (
        <FormField
          label={intl.formatMessage({
            defaultMessage: "Valopankki media repository",
            description: "Select active Valopankki repository",
          })}
          value={selectedInstanceId}
          control={(props) => (
            <Select
              {...props}
              stretch
              value={selectedInstanceId}
              onChange={setSelectedInstanceId}
              options={instances.map((inst) => ({
                value: inst.id,
                label: inst.venue
                  ? intl.formatMessage(
                      { defaultMessage: "{name} ({venue})", description: "Valopankki instance option with venue" },
                      { name: inst.name, venue: inst.venue }
                    )
                  : inst.name,
              }))}
            />
          )}
        />
      )}

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          {
            value: "brand",
            label: intl.formatMessage({ defaultMessage: "Brand Kit & Colors", description: "Brand tab label" }),
          },
          {
            value: "assets",
            label: intl.formatMessage({ defaultMessage: "Assets & Photos", description: "Assets tab label" }),
          },
          {
            value: "usage",
            label: intl.formatMessage({ defaultMessage: "Usage & Print Report", description: "Usage tab label" }),
          },
        ]}
      />

      {tab === "brand" && (
        <Rows spacing="1.5u">
          {brandKit && (
            <Text size="small">
              <strong>{brandKit.parishName}</strong>
            </Text>
          )}

          <Text size="small">
            <strong>{intl.formatMessage({ defaultMessage: "Parish & Liturgical Colors", description: "Color palette header" })}</strong>
          </Text>

          <Rows spacing="1u">
            {colors.map((color) => (
              <Box key={color.hex} padding="1u" background="neutralSubtle">
                <Columns spacing="1u" alignY="center">
                  <Column width="content">
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        backgroundColor: color.hex,
                        border: "1px solid rgba(0,0,0,0.15)",
                      }}
                    />
                  </Column>
                  <Column>
                    <Text size="small"><strong>{color.name}</strong></Text>
                    <Text size="xsmall" tone="tertiary">{color.hex}</Text>
                  </Column>
                  <Column width="content">
                    <Button variant="tertiary" size="small" onClick={() => void handleInsertColor(color.hex, color.name)}>
                      {intl.formatMessage({ defaultMessage: "Insert", description: "Insert color swatch" })}
                    </Button>
                  </Column>
                </Columns>
              </Box>
            ))}
          </Rows>

          {brandKit?.logos && brandKit.logos.length > 0 && (
            <Rows spacing="1u">
              <Text size="small">
                <strong>{intl.formatMessage({ defaultMessage: "Official Logos", description: "Official logos section" })}</strong>
              </Text>
              {brandKit.logos.map((logo) => (
                <Box key={logo.assetId} padding="1u" background="neutralSubtle">
                  <Columns spacing="1u" alignY="center">
                    <Column width="content">
                      <div
                        style={{
                          width: 48,
                          height: 32,
                          backgroundImage: `url(${logo.thumbnailUrl})`,
                          backgroundSize: "contain",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                      />
                    </Column>
                    <Column>
                      <Text size="small"><strong>{logo.title}</strong></Text>
                      <Text size="xsmall" tone="tertiary">{logo.format.toUpperCase()}</Text>
                    </Column>
                    <Column width="content">
                      <Button
                        variant="tertiary"
                        size="small"
                        onClick={() => void handleInsertAsset({
                          id: logo.assetId,
                          title: logo.title,
                          kind: "logo",
                          format: logo.format,
                          mimeType: logo.mimeType,
                          isBrandAsset: true,
                          width: null,
                          height: null,
                          aspectRatio: null,
                          tags: ["logo"],
                          dominantColors: [],
                          thumbnailUrl: logo.thumbnailUrl,
                          useUrl: logo.useUrl,
                          createdAt: "",
                        })}
                      >
                        {intl.formatMessage({ defaultMessage: "Insert", description: "Insert logo" })}
                      </Button>
                    </Column>
                  </Columns>
                </Box>
              ))}
            </Rows>
          )}

          {!brandKit && !loadingBrand && (
            <Alert tone="info">
              {intl.formatMessage({
                defaultMessage: "Connected to offline brand kit. Configure Valopankki URL in Settings or through Tunnus Discovery for live sync.",
                description: "Offline brand kit notice",
              })}
            </Alert>
          )}
        </Rows>
      )}

      {tab === "assets" && (
        <Rows spacing="1.5u">
          <Columns spacing="1u">
            <Column>
              <FormField
                label={intl.formatMessage({ defaultMessage: "Search assets", description: "Search label" })}
                value={search}
                control={(props) => (
                  <TextInput
                    {...props}
                    onChange={setSearch}
                    placeholder={intl.formatMessage({ defaultMessage: "e.g. risti, leipä, pääsiäinen...", description: "Search placeholder" })}
                  />
                )}
              />
            </Column>
            <Column width="content">
              <FormField
                label={intl.formatMessage({ defaultMessage: "Kind", description: "Kind filter label" })}
                value={kindFilter}
                control={(props) => (
                  <Select
                    {...props}
                    onChange={(val) => setKindFilter(val as ValopankkiAssetKind | "all")}
                    options={[
                      { value: "all", label: intl.formatMessage({ defaultMessage: "All", description: "All kinds" }) },
                      { value: "symbol", label: intl.formatMessage({ defaultMessage: "Symbols", description: "Symbols" }) },
                      { value: "graphic", label: intl.formatMessage({ defaultMessage: "Graphics", description: "Graphics" }) },
                      { value: "logo", label: intl.formatMessage({ defaultMessage: "Logos", description: "Logos" }) },
                      { value: "photo", label: intl.formatMessage({ defaultMessage: "Photos", description: "Photos" }) },
                    ]}
                  />
                )}
              />
            </Column>
          </Columns>

          <Button variant="secondary" size="small" onClick={() => void performSearch()} loading={loadingAssets} stretch>
            {intl.formatMessage({ defaultMessage: "Search", description: "Search button" })}
          </Button>

          {assets.length === 0 && !loadingAssets && (
            <Alert tone="info">
              {intl.formatMessage({
                defaultMessage: "No assets found. Connect Valopankki or adjust your search.",
                description: "Empty assets notice",
              })}
            </Alert>
          )}

          {assets.length > 0 && (
            <Rows spacing="1u">
              {assets.map((asset) => (
                <Box key={asset.id} padding="1u" background="neutralSubtle">
                  <Columns spacing="1u" alignY="center">
                    <Column width="content">
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 4,
                          backgroundImage: `url(${asset.thumbnailUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: "#f0f0f0",
                        }}
                      />
                    </Column>
                    <Column>
                      <Text size="small"><strong>{asset.title}</strong></Text>
                      <Columns spacing="0.5u">
                        <Column width="content">
                          <Badge tone="contrast" text={asset.format.toUpperCase()} />
                        </Column>
                        {asset.isBrandAsset && (
                          <Column width="content">
                            <Badge tone="positive" text={intl.formatMessage({ defaultMessage: "Brand", description: "Brand badge" })} />
                          </Column>
                        )}
                      </Columns>
                    </Column>
                    <Column width="content">
                      <Button
                        variant="secondary"
                        size="small"
                        loading={insertingId === asset.id}
                        disabled={Boolean(insertingId)}
                        onClick={() => void handleInsertAsset(asset)}
                      >
                        {intl.formatMessage({ defaultMessage: "Add", description: "Add asset to canvas" })}
                      </Button>
                    </Column>
                  </Columns>
                </Box>
              ))}
            </Rows>
          )}
        </Rows>
      )}

      {tab === "usage" && (
        <Rows spacing="1.5u">
          <Alert tone="info">
            {intl.formatMessage({
              defaultMessage: "When printing or exporting as PDF via Canva's native Share menu, use this tool to confirm which Valopankki assets are present and log their publication in Valopankki's audit registry.",
              description: "Usage report info alert",
            })}
          </Alert>

          {/* Canvas & Design Info Box */}
          <Box padding="1u" background="neutralSubtle">
            <Rows spacing="0.5u">
              <Columns spacing="1u" alignY="center">
                <Column>
                  <Text size="small">
                    <strong>
                      {currentDesignTitle
                        ? currentDesignTitle
                        : intl.formatMessage({ defaultMessage: "Current Canva Design", description: "Default design title label" })}
                    </strong>
                  </Text>
                  {currentDesignId && (
                    <Text size="xsmall" tone="tertiary">
                      {intl.formatMessage(
                        { defaultMessage: "Design ID: {id}", description: "Design ID label" },
                        { id: currentDesignId }
                      )}
                    </Text>
                  )}
                </Column>
                <Column width="content">
                  <Button
                    variant="tertiary"
                    size="small"
                    loading={inspectingCanvas}
                    onClick={() => void refreshUsageData()}
                  >
                    {intl.formatMessage({ defaultMessage: "Refresh canvas", description: "Refresh canvas button" })}
                  </Button>
                </Column>
              </Columns>

              {canvasElements && (
                <Columns spacing="0.5u" alignY="center">
                  <Column width="content">
                    <Badge
                      tone={canvasElements.imageCount > 0 ? "positive" : "contrast"}
                      text={intl.formatMessage(
                        { defaultMessage: "{count} image element(s) on canvas", description: "Canvas image elements count" },
                        { count: canvasElements.imageCount }
                      )}
                    />
                  </Column>
                  <Column width="content">
                    <Badge
                      tone="contrast"
                      text={intl.formatMessage(
                        { defaultMessage: "{count} text element(s)", description: "Canvas text elements count" },
                        { count: canvasElements.textCount }
                      )}
                    />
                  </Column>
                </Columns>
              )}
            </Rows>
          </Box>

          {/* Tracked Assets Section */}
          <Rows spacing="1u">
            <Columns spacing="1u" alignY="center">
              <Column>
                <Text size="small">
                  <strong>
                    {intl.formatMessage({
                      defaultMessage: "Valopankki Assets in this Design",
                      description: "Tracked assets header",
                    })}
                  </strong>
                </Text>
              </Column>
              {trackedAssets.length > 0 && (
                <Column width="content">
                  <Button variant="tertiary" size="small" onClick={handleClearAllTracking}>
                    {intl.formatMessage({ defaultMessage: "Clear all", description: "Clear all tracked assets" })}
                  </Button>
                </Column>
              )}
            </Columns>

            {trackedAssets.length === 0 ? (
              <Alert tone="info">
                {intl.formatMessage({
                  defaultMessage: "No Valopankki assets are currently tracked for this design. Add symbols, logos, or photos from the Assets tab to track usage.",
                  description: "No tracked assets notice",
                })}
              </Alert>
            ) : (
              <Rows spacing="1u">
                {trackedAssets.map((asset) => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  return (
                    <Box key={asset.id} padding="1u" background="neutralSubtle">
                      <Columns spacing="1u" alignY="center">
                        <Column width="content">
                          <Switch
                            value={isSelected}
                            onChange={() => toggleAssetSelected(asset.id)}
                          />
                        </Column>
                        {asset.thumbnailUrl ? (
                          <Column width="content">
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 4,
                                backgroundImage: `url(${asset.thumbnailUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundColor: "#f0f0f0",
                              }}
                            />
                          </Column>
                        ) : null}
                        <Column>
                          <Text size="small"><strong>{asset.title}</strong></Text>
                          <Columns spacing="0.5u">
                            {asset.format && (
                              <Column width="content">
                                <Badge tone="contrast" text={asset.format.toUpperCase()} />
                              </Column>
                            )}
                            {asset.kind && (
                              <Column width="content">
                                <Badge tone="contrast" text={asset.kind} />
                              </Column>
                            )}
                          </Columns>
                        </Column>
                        <Column width="content">
                          <Button
                            variant="tertiary"
                            size="small"
                            onClick={() => handleRemoveTrackedAsset(asset.id)}
                          >
                            {intl.formatMessage({ defaultMessage: "Remove", description: "Remove asset button" })}
                          </Button>
                        </Column>
                      </Columns>
                    </Box>
                  );
                })}
              </Rows>
            )}
          </Rows>

          {/* Usage Report Destination & Action */}
          {trackedAssets.length > 0 && (
            <Rows spacing="1.5u">
              <FormField
                label={intl.formatMessage({ defaultMessage: "Publication / Usage Target", description: "Export target label" })}
                value={exportTarget}
                control={(props) => (
                  <Select
                    {...props}
                    onChange={(val) => setExportTarget(val)}
                    options={[
                      {
                        value: "print_pdf",
                        label: intl.formatMessage({ defaultMessage: "Print / PDF export (Esitteet, lehdet, julisteet)", description: "Print target" }),
                      },
                      {
                        value: "bulletin",
                        label: intl.formatMessage({ defaultMessage: "Parish bulletin / Kirkolliset ilmoitukset", description: "Bulletin target" }),
                      },
                      {
                        value: "flyer",
                        label: intl.formatMessage({ defaultMessage: "Flyer / Juliste / Eteisaulan taulu", description: "Flyer target" }),
                      },
                      {
                        value: "social_media",
                        label: intl.formatMessage({ defaultMessage: "Social media / Verkkojulkaisu", description: "Social target" }),
                      },
                      {
                        value: "archive",
                        label: intl.formatMessage({ defaultMessage: "Archive / Sisäinen jakelu", description: "Archive target" }),
                      },
                    ]}
                  />
                )}
              />

              <FormField
                label={intl.formatMessage({ defaultMessage: "Notes / Distribution (optional)", description: "Usage notes label" })}
                value={usageNotes}
                control={(props) => (
                  <TextInput
                    {...props}
                    onChange={setUsageNotes}
                    placeholder={intl.formatMessage({ defaultMessage: "e.g. 500 copies printed for Easter service", description: "Usage notes placeholder" })}
                  />
                )}
              />

              <Button
                variant="secondary"
                size="small"
                stretch
                loading={reportingUsage}
                disabled={selectedAssetIds.length === 0}
                onClick={() => void handleReportUsage()}
              >
                {intl.formatMessage(
                  {
                    defaultMessage: "Report Usage to Valopankki ({count} selected)",
                    description: "Report usage button",
                  },
                  { count: selectedAssetIds.length }
                )}
              </Button>

              {lastReported && (
                <Alert tone="positive">
                  {intl.formatMessage(
                    {
                      defaultMessage: "Reported {count} asset(s) to Valopankki for target {target} at {time}.",
                      description: "Last reported notice",
                    },
                    {
                      count: lastReported.count,
                      target: lastReported.target,
                      time: lastReported.time,
                    }
                  )}
                </Alert>
              )}
            </Rows>
          )}
        </Rows>
      )}
    </Rows>
  );
}
