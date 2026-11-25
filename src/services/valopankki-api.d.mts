export type ValopankkiAssetFormat = 'svg' | 'png' | 'jpeg' | 'webp';
export type ValopankkiAssetKind = 'logo' | 'symbol' | 'graphic' | 'photo' | 'badge';
export type ValopankkiUsageAction = 'inserted' | 'exported';

export interface ValopankkiAssetSummary {
  id: string;
  title: string;
  kind: ValopankkiAssetKind;
  format: ValopankkiAssetFormat;
  mimeType: string;
  isBrandAsset: boolean;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  tags: string[];
  dominantColors: string[];
  thumbnailUrl: string;
  useUrl: string;
  createdAt: string;
}

export interface ValopankkiBrandColor {
  name: string;
  hex: string;
  role: 'primary' | 'secondary' | 'accent' | 'background';
}

export interface ValopankkiBrandKit {
  id: string;
  parishName: string;
  parishSlug: string;
  colors: ValopankkiBrandColor[];
  fonts: Array<{ name: string; family: string; style: string }>;
  logos: Array<{
    assetId: string;
    title: string;
    format: ValopankkiAssetFormat;
    mimeType: string;
    thumbnailUrl: string;
    useUrl: string;
  }>;
}

export interface ValopankkiCollection {
  id: string;
  name: string;
  type: 'brand_kit' | 'church_year' | 'curated' | string;
  assetCount: number;
  coverThumbnailUrl?: string;
}

export interface ValopankkiAssetUsageRequest {
  canvaDesignId?: string;
  canvaDesignTitle?: string;
  channel?: 'canva';
  action?: ValopankkiUsageAction;
  exportTarget?: 'piprogram' | 'sissi' | 'signage' | 'signage-view' | 'atem' | string;
}

export interface ValopankkiAssetUsageResponse {
  usageId: string;
  asset?: {
    id: string;
    title: string;
    format: ValopankkiAssetFormat;
    mimeType: string;
    width: number | null;
    height: number | null;
    downloadUrl: string;
  };
  action?: ValopankkiUsageAction;
  recordedAt: string;
}

export interface ValopankkiExportAuditReport {
  canvaDesignId: string;
  canvaDesignTitle?: string;
  channel?: 'canva';
  exportTarget: string;
  assetIds?: string[];
  exportedAt?: string;
}

export interface ValopankkiAssetsResponse {
  items: ValopankkiAssetSummary[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ValopankkiRequestOptions {
  valopankkiUrl?: string;
  parishSlug?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

export interface SearchValopankkiOptions extends ValopankkiRequestOptions {
  search?: string;
  kind?: ValopankkiAssetKind | 'all';
  format?: ValopankkiAssetFormat | 'all';
  collectionId?: string;
  brandKitOnly?: boolean;
  page?: number;
  limit?: number;
}

export function recordAssetUsedInDesign(designId: string, assetId: string): void;
export function getAssetsUsedInDesign(designId: string): string[];
export function clearAssetsUsedInDesign(designId: string): void;

export function getValopankkiBrandKit(options?: ValopankkiRequestOptions): Promise<ValopankkiBrandKit | null>;

export function listValopankkiCollections(
  options?: ValopankkiRequestOptions & { type?: 'brand_kit' | 'church_year' | 'curated' | 'all' }
): Promise<ValopankkiCollection[]>;

export function searchValopankkiAssets(
  options?: SearchValopankkiOptions
): Promise<ValopankkiAssetsResponse>;

export function useValopankkiAsset(
  assetIdOrUrl: string,
  usageData?: ValopankkiAssetUsageRequest,
  options?: ValopankkiRequestOptions
): Promise<ValopankkiAssetUsageResponse>;

export function insertValopankkiAssetIntoDesign(
  asset: ValopankkiAssetSummary | { id: string; title: string; useUrl: string; thumbnailUrl?: string; mimeType?: string },
  designContext?: { designId?: string; title?: string },
  options?: ValopankkiRequestOptions
): Promise<{ status: 'completed' | 'simulated' | 'unsupported'; usageId?: string }>;

export function reportValopankkiExport(
  report: ValopankkiExportAuditReport,
  options?: ValopankkiRequestOptions
): Promise<{ recorded: number; success: boolean }>;
