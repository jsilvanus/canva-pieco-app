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
export function extractTextBlocksFromElements(elements: unknown): DesignPageText;
export function readCachedDesignPageText(): DesignPageText | null;
export function readDesignPageText(): Promise<DesignPageText | null>;
export function exportDesignPages(): Promise<{
  status: "completed" | "aborted";
  title: string;
  exportBlobs: { url: string; pageNumber: number; name?: string }[];
}>;
export function openExternalUrl(url: string): Promise<boolean>;
