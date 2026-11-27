import type { OutputTypeConfiguration, PublishContentRequest, PublishContentResponse } from "@canva/intents/content";
import type { SignageProgress, SignagePushAccepted, SignagePushRequest, SignagePushStatus, SignageScreen } from "../../services/signage-api.mjs";
import type { PublishSettingsData, SignageSettings, Target } from "../publish-targets.mjs";

export type ScreenListState = {
  status: "loading" | "ready" | "error";
  screens: SignageScreen[];
  error: string | null;
  refreshRequired: boolean;
};

export type SignageSizeMismatch = {
  widthPx: number;
  heightPx: number;
  targetWidth: number;
  targetHeight: number;
};

export type SignageWarnings = {
  sizeMismatch: SignageSizeMismatch | null;
  videoTooLongPages: number[];
};

export function isSignageTarget(target: Target | null | undefined): boolean;
export function screenTargetDimensions(screen: SignageScreen | null | undefined): {
  orientation: "landscape" | "vertical";
  width: number;
  height: number;
};
export function formatScreenOptionLabel(screen: SignageScreen): string;
export function findScreenById(screens: SignageScreen[], screenId: string | undefined): SignageScreen | null;

export function screenListInitialState(): ScreenListState;
export function screenListLoaded(screens: SignageScreen[]): ScreenListState;
export function screenListFailed(error: unknown): ScreenListState;
export function isScreenNotFoundPayload(payload: string | null | undefined): boolean;

export function mergeSignageSettings(
  prevSettings: PublishSettingsData,
  patch: Partial<SignageSettings>,
): PublishSettingsData;
export function updatePageSeconds(
  secondsByPage: Record<string, number> | undefined,
  pageNumber: number,
  value: number | undefined,
): Record<string, number>;
export function isValidSecondsValue(value: unknown): boolean;

export function isVideoTooLong(durationMs: number | undefined, maxVideoSeconds: number | null | undefined): boolean;
export function formatDurationSeconds(durationMs: number | undefined): number | null;
export function computeSignageWarnings(
  previews: Array<{ kind?: string; widthPx?: number; heightPx?: number; durationMs?: number }>,
  screen: SignageScreen | null | undefined,
): SignageWarnings;

export function writeDraftSecondsByPage(secondsByPage: Record<string, number>): void;
export function readDraftSecondsByPage(): Record<string, number> | null;
export function subscribeDraftSecondsByPage(onChange: (secondsByPage: Record<string, number>) => void): () => void;
export function notifyDraftAuthChanged(): void;
export function subscribeDraftAuthChanged(onChange: () => void): () => void;

export type PublishSignageDeps = {
  signageUrl?: string;
  discoveredTargets?: any[];
  pushSignage?: (request: SignagePushRequest, options?: { baseUrl?: string; auth?: any }) => Promise<SignagePushAccepted>;
  waitForSignagePush?: (
    pushId: string,
    options?: { onProgress?: (progress: SignageProgress) => void },
  ) => Promise<SignagePushStatus>;
  onProgress?: (progress: SignageProgress) => void;
};

export function publishSignageContent(
  request: Pick<PublishContentRequest, "outputMedia" | "publishRef"> & { outputType: Pick<OutputTypeConfiguration, "id"> },
  deps?: PublishSignageDeps,
): Promise<PublishContentResponse>;
