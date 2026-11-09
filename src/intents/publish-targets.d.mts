// Types for publish-targets.mjs, used by the TypeScript publisher UI.
export type Target = {
  id: string;
  displayName: string;
  orientation: "landscape" | "vertical";
  width: number;
  height: number;
  enabled: boolean;
  transparent?: boolean;
};
export type PublishSettingsData = {
  targetId?: string;
  name?: string;
  usage?: { from?: string; to?: string };
};
export const TARGETS: Target[];
export function targetById(id: string | undefined): Target | null;
export function validatePublishSettings(settings: PublishSettingsData): {
  validityState: "valid" | "invalid_missing_required_fields";
  errors: string[];
};
export function encodePublishRef(settings: PublishSettingsData): string;
export function decodePublishRef(publishRef: string | undefined): PublishSettingsData;
export function buildPushPayload(
  settings: PublishSettingsData,
  pages: { url: string; pageNumber: number; name?: string }[],
): { title: string; target: string; useAt: string; pages: { url: string; pageNumber: number; name?: string }[] };
