// Types for canva-sdk.mjs, used by the TypeScript UI in src/app.
export type DesignPageText = {
  heading: string;
  bodyText: string;
  fullText: string;
  blocks: string[];
  updatedAt?: number;
};

export function isRunningInCanva(): boolean;
export function getDesignTitle(): Promise<string>;
export function inspectCurrentDesignElements(): Promise<{
  supported: boolean;
  totalElements: number;
  imageCount: number;
  textCount: number;
  groupCount: number;
  otherCount: number;
}>;
export function extractTextBlocksFromElements(elements: unknown): DesignPageText;
export function readCachedDesignPageText(): DesignPageText | null;
export function readDesignPageText(): Promise<DesignPageText | null>;
export function exportDesignPages(): Promise<{
  status: "completed" | "aborted";
  title: string;
  exportBlobs: { url: string; pageNumber: number; name?: string }[];
}>;
export function openExternalUrl(url: string): Promise<boolean>;
export function decodeDesignIdFromToken(designToken: string | undefined | null): string | null;
export function getCurrentDesignId(): Promise<string | null>;
export function insertTextIntoDesign(opts: {
  title?: string;
  reference?: string;
  body?: string;
  autoUpdate?: boolean;
  fieldKey?: string;
  date?: string;
}): Promise<{
  status: string;
  mode?: string;
  text?: string;
  elements?: { type: string; text: string }[];
}>;
export function insertColorSwatchIntoDesign(opts: { hex: string; label?: string }): Promise<{ status: string; color?: string }>;
export function autofillDesignWithAnnoTable(dataTable: unknown): Promise<{ status: string }>;
export function importImageUrlIntoDesign(opts: { url: string; title?: string; mimeType?: string }): Promise<{ status: string }>;
