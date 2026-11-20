// Types for canva-sdk.mjs, used by the TypeScript UI in src/app.
export function isRunningInCanva(): boolean;
export function getDesignTitle(): Promise<string>;
export function exportDesignPages(): Promise<{
  status: "completed" | "aborted";
  title: string;
  exportBlobs: { url: string; pageNumber: number; name?: string }[];
}>;
export function openExternalUrl(url: string): Promise<boolean>;
