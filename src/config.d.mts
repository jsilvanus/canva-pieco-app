// Types for config.mjs, used by the TypeScript UI in src/app.
export const CONFIG: Readonly<{
  appName: string;
  gatewayUrl: string;
  gatewayApiKey: string;
  picontrolUrl: string;
  signageUrl: string;
  signagePushKey: string;
  annoUrl: string;
  valopankkiUrl: string;
  katrinaUrl: string;
  tunnusUrl: string;
  piDiscoveryUrl: string;
  tunnusSignIn: boolean;
  authProvider: string;
  signInLabel: string;
}>;
export function normalizeGatewayUrl(value: string | null | undefined): string | null;
export function saveRuntimeSettings(settings: {
  gatewayUrl: string;
  gatewayApiKey: string;
  signageUrl?: string;
  signagePushKey?: string;
  annoUrl?: string;
  valopankkiUrl?: string;
  katrinaUrl?: string;
  piDiscoveryUrl?: string;
}): void;
export function clearRuntimeSettings(): void;
