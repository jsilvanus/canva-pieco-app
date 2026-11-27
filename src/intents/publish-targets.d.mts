// Types for publish-targets.mjs, used by the TypeScript publisher UI.
export type Target = {
  id: string;
  displayName: string;
  orientation: "landscape" | "vertical";
  width: number;
  height: number;
  enabled: boolean;
  transparent?: boolean;
  kind?: "signage" | "signage-view";
  label?: string;
  dynamicSize?: boolean;
  autoSize?: boolean;
  category?: string;
  ingestUrl?: string;
  auth?: any;
  targetId?: string;
  serviceId?: string;
  accepts?: { image?: { format: string }; video?: { format: string } };
};
export type PublishSettingsData = {
  targetId?: string;
  name?: string;
  usage?: { from?: string; to?: string };
  /** Confirmed: no use date, the slides are a permanent asset. */
  permanent?: boolean;
  /** Real Canva designId extracted from designToken JWT. */
  designId?: string;
  /** Optional PiProgram itemId to overwrite in place. */
  overwriteItemId?: string;
  signage?: SignageSettings;
  graphics?: { movement?: string };
  goLive?: GoLiveSettings;
};
export type GoLiveSettings = { on: boolean; feed: string; piOutput: string; projector: string; ftb: boolean };
export const TARGETS: Target[];
export function targetById(id: string | undefined, options?: TargetOptions): Target | null;
export function validatePublishSettings(settings: PublishSettingsData, options?: TargetOptions): {
  validityState: "valid" | "invalid_missing_required_fields";
  errors: string[];
};
export function encodePublishRef(settings: PublishSettingsData): string;
export function decodePublishRef(publishRef: string | undefined): PublishSettingsData;
export function buildPushPayload(
  settings: PublishSettingsData,
  pages: { url: string; pageNumber: number; name?: string }[],
): { title: string; target: string; orientation?: "landscape" | "portrait"; useAt?: string; designId?: string; itemId?: string; pages: { url: string; pageNumber: number; name?: string }[] };

export type SignageSettings = {
  screenId: string;
  alt?: string;
  title?: string;
  text?: string;
  link?: string;
  secondsAll?: number;
  secondsByPage?: Record<string, number>;
  /** true = the slides go live at once (needs the operate right); false = added disabled. */
  enableNow?: boolean;
};
export type TargetOptions = {
  signageUrl?: string;
  saarnavideoUrl?: string;
  hasDiscoveredSaarnavideo?: boolean;
  enableSaarnavideo?: boolean;
  discoveredTargets?: any[];
};
export type SignageFile = { url: string; pageNumber?: number; kind?: "image" | "video"; name?: string };
export type SignagePushPage = { pageNumber: number; kind?: "image" | "video"; url: string; seconds?: number; alt?: string; headline?: string; caption?: string; link?: string };
export function getTargets(options?: TargetOptions): Target[];
export function signageFallbackSize(orientation?: string): { width: number; height: number };
export function signageKindFor(file: SignageFile): "image" | "video" | undefined;
export function buildSignagePushPayload(
  settings: PublishSettingsData,
  files: SignageFile[],
): { screenId: string; mode: "append"; enabled: boolean; title: string; pages: SignagePushPage[] };
export function encodeSignageSettings(sig: Partial<SignageSettings>): string;
export function parseSignageSettings(
  text: string | undefined,
): Required<Omit<SignageSettings, "secondsAll">> & { secondsAll?: number };

