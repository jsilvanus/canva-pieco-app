// Types for auth.mjs, used by the TypeScript UI in src/app.
export const SIGN_IN_SCOPES: readonly string[];
export const SIGN_IN_QUERY_PARAMS: Readonly<Record<string, string>>;
export type AccountState = "off" | "signed-out" | "signed-in" | "no-access" | "unknown";
export type Account = { state: AccountState; name: string; rights: string[]; canWrite: boolean; canOperate: boolean };
export function setOauthClient(client: unknown): void;
export function resetOauthClient(): void;
export function setAuthFetchImpl(fn: typeof fetch): void;
export function resetAuthFetchImpl(): void;
export function getCanvaUserToken(): Promise<string | null>;
export function getTunnusToken(options?: { forceRefresh?: boolean }): Promise<string | null>;
export function getBearerToken(): Promise<string | null>;
export function signIn(): Promise<boolean>;
export function signOut(): Promise<void>;
export function hasRight(rights: string[] | null | undefined, right: string): boolean;
export function loadAccount(options?: { getToken?: () => Promise<string | null>; baseUrl?: string; fetch?: typeof fetch; timeoutMs?: number }): Promise<Account>;
