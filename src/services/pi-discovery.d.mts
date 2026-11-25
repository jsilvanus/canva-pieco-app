export type ServiceAuthType = 'none' | 'api_key' | 'bearer' | 'oidc';

export interface ServiceAuth {
  type: ServiceAuthType;
  client_id?: string;
  scopes?: string[];
  audience?: string;
  header_name?: string;
}

export interface DiscoveredService {
  id: string;
  name: string;
  type: string;
  venue: string;
  endpoint_url: string;
  url: string;
  auth?: ServiceAuth;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface DiscoveryResponse {
  updated_at: string;
  services: DiscoveredService[];
}

export interface PiSystemEndpoint {
  id: string;
  name: string;
  gatewayUrl: string;
  source: 'configured' | 'discovered';
  venue?: string;
  location?: string;
  online?: boolean;
  type?: string;
  auth?: ServiceAuth;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface ListPiSystemsOptions {
  discoveryUrl?: string;
  gatewayUrl?: string;
  serviceType?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

export interface DiscoveredExportTarget {
  targetId: string;
  serviceId: string;
  serviceName: string;
  venue?: string;
  name: string;
  category: 'slides' | 'signage' | 'broadcast' | 'print' | 'web' | 'social' | string;
  aspectRatio: string;
  resolution: {
    width: number;
    height: number;
    pixel_ratio?: number;
    dpi?: number;
  };
  formats: string[];
  multiPage: boolean;
  alphaChannel: boolean;
  ingestUrl: string;
  method: string;
  auth: ServiceAuth;
  prefillRules: {
    extract_text?: boolean;
    field_mapping?: Record<string, string>;
  };
}

export interface ValopankkiInstance {
  id: string;
  name: string;
  url: string;
  endpoint_url: string;
  venue?: string;
  source: 'configured' | 'discovered';
  auth?: ServiceAuth;
  metadata?: Record<string, unknown>;
}

export function listValopankkiInstances(options?: {
  discoveryUrl?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}): Promise<ValopankkiInstance[]>;

export function resolveExportTargetIngestUrl(target: unknown, service: unknown): string;
export function resolveExportTargetAuth(target: unknown, service: unknown): ServiceAuth;

export function listDiscoveredExportTargets(options?: {
  discoveryUrl?: string;
  category?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}): Promise<DiscoveredExportTarget[]>;

export function listPiSystems(options?: ListPiSystemsOptions): Promise<PiSystemEndpoint[]>;
