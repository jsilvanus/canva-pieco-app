// Types for signage-api.mjs (Sissi signage service, openapi/sissi-v1.yaml).
export type SignageScreen = {
  id: string;
  name: string;
  orientation: "landscape" | "vertical";
  width?: number | null;
  height?: number | null;
  defaultImageSeconds: number;
  maxVideoSeconds: number | null;
  entryCount: number;
  playlistVersion: number;
};
export type SignagePage = { pageNumber: number; url: string; kind?: "image" | "video"; seconds?: number };
export type SignagePushRequest = { screenId: string; mode?: "append" | "replace"; enabled?: boolean; title: string; pages: SignagePage[] };
export type SignagePushAccepted = { pushId: string; taskId: string; state: "queued"; screenId: string; isSimulated?: boolean };
export type SignagePushStatus = {
  pushId: string;
  screenId: string;
  state: "queued" | "downloading" | "ready" | "failed";
  progress: number;
  pages?: { done: number; total: number };
  error: { code?: string; message?: string } | null;
  playlistVersion: number | null;
  isSimulated?: boolean;
};
export type SignageProgress = { state: SignagePushStatus["state"]; progress: number; done: number; total: number; label: string; status: SignagePushStatus };
export type SignageRequestOptions = {
  /** Signage address including the path prefix (https://host/signage). Default: CONFIG.signageUrl. */
  baseUrl?: string;
  /** Push key, used only when there is no Canva user token (outside Canva). */
  pushKey?: string;
  fetch?: typeof fetch;
  getToken?: () => Promise<string | null>;
  timeoutMs?: number;
  /** Force (true) or forbid (false) the dev mock. Default: dev, outside Canva, no address set. */
  mock?: boolean;
  now?: () => number;
};
export type SignageWaitOptions = SignageRequestOptions & {
  onProgress?: (progress: SignageProgress) => void;
  pollMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<unknown>;
};

export class SignageError extends Error {
  constructor(code: string, status: number, userMessage: string, extra?: { serviceMessage?: string | null; details?: unknown });
  code: string;
  status: number;
  userMessage: string;
  serviceMessage: string | null;
  details: unknown;
  refreshScreens: boolean;
}
export function signageErrorFromCode(code: string, status: number, serviceMessage?: string | null, details?: unknown): SignageError;
export function setSignageFetchImpl(fn: typeof fetch): void;
export function resetSignageFetchImpl(): void;
export function listScreens(options?: SignageRequestOptions): Promise<SignageScreen[]>;
export function pushSignage(request: SignagePushRequest, options?: SignageRequestOptions): Promise<SignagePushAccepted>;
export function getSignagePush(pushId: string, options?: SignageRequestOptions): Promise<SignagePushStatus>;
export function describeSignagePush(status: SignagePushStatus): string;
export function waitForSignagePush(pushId: string, options?: SignageWaitOptions): Promise<SignagePushStatus>;

export function listViews(options?: SignageRequestOptions): Promise<SignageScreen[]>;
