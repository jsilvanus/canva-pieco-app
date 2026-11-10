// Types for config.mjs, used by the TypeScript UI in src/app.
export const CONFIG: Readonly<{ appName: string; gatewayUrl: string; gatewayApiKey: string }>;
export function normalizeGatewayUrl(value: string): string;
export function saveRuntimeSettings(settings: { gatewayUrl: string; gatewayApiKey: string }): void;
export function clearRuntimeSettings(): void;
