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

export function listPiSystems(options?: ListPiSystemsOptions): Promise<PiSystemEndpoint[]>;
