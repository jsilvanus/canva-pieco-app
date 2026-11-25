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
  Text,
  TextInput,
  Title,
} from "@canva/app-ui-kit";
import { CONFIG } from "../config.mjs";
import { getCurrentDesignId, insertColorSwatchIntoDesign } from "../services/canva-sdk.mjs";
import {
  getValopankkiBrandKit,
  insertValopankkiAssetIntoDesign,
  searchValopankkiAssets,
} from "../services/valopankki-api.mjs";
import type {
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
  const [tab, setTab] = useState<"brand" | "assets">("brand");
  const [brandKit, setBrandKit] = useState<ValopankkiBrandKit | null>(null);
  const [loadingBrand, setLoadingBrand] = useState<boolean>(false);

  // Asset search state
  const [search, setSearch] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<ValopankkiAssetKind | "all">("all");
  const [assets, setAssets] = useState<ValopankkiAssetSummary[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);

  // Load Brand Kit
  useEffect(() => {
    let active = true;
    setLoadingBrand(true);
    void getValopankkiBrandKit()
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
  }, []);

  // Search Assets
  const performSearch = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const res = await searchValopankkiAssets({
        search,
        kind: kindFilter,
        limit: 24,
      });
      setAssets(res.items);
    } catch {
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  }, [search, kindFilter]);

  useEffect(() => {
    if (tab === "assets") {
      void performSearch();
    }
  }, [tab, performSearch]);

  const handleInsertColor = async (hex: string, label: string) => {
    try {
      await insertColorSwatchIntoDesign({ hex, label });
      notify(intl.formatMessage({ defaultMessage: "Inserted color swatch.", description: "Notice on inserting color swatch" }), "positive");
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "critical");
    }
  };

  const handleInsertAsset = async (asset: ValopankkiAssetSummary) => {
    setInsertingId(asset.id);
    try {
      const designId = await getCurrentDesignId();
      await insertValopankkiAssetIntoDesign(asset, { designId: designId || undefined, title: asset.title });
      notify(intl.formatMessage({ defaultMessage: "Added to design.", description: "Notice on asset insert" }), "positive");
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
        ]}
      />

      {tab === "brand" ? (
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
      ) : (
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
    </Rows>
  );
}
