// Types for gateway-api.mjs, used by the TypeScript UI in src/app.
export type Task = {
  taskId: string;
  presentationId?: string;
  state: string;
  progress?: number;
  pageCount?: number;
  downloaded?: { done: number; total: number };
  pictures?: { done: number; total: number };
  ready?: boolean;
  error?: string | null;
};
type PageRef = { url: string; pageNumber: number; name?: string };

export class GatewayError extends Error {}
export function setFetchImpl(fn: typeof fetch): void;
export function resetFetchImpl(): void;
export function parseUseAt(text: string): string | string[] | null;
export function pushContent(args: { title: string; pages: PageRef[]; useAt?: string | string[] | null; target?: string | null }): Promise<Task>;
export function getTask(taskId: string): Promise<Task>;
export function waitForTask(
  taskId: string,
  options?: { onUpdate?: (task: Task) => void; pollMs?: number; timeoutMs?: number; sleep?: (ms: number) => Promise<unknown> },
): Promise<Task>;
export function setupPresentation(args: {
  presentationId: string;
  pipelineId: string;
  matrixRoute: string;
  unblankProjectors: boolean;
  cueSlide?: number | null;
  piOutput?: string | null;
}): Promise<{ picMute?: boolean }>;
export function controlSlide(args: { pipelineId: string; action: string; page?: number }): Promise<{ currentPage?: number } | null>;
export function toggleFtb(args: { pipelineId: string; enabled: boolean }): Promise<unknown>;
export function setProjectorPicMute(args: { muted: boolean; pipelineId: string }): Promise<unknown>;
export function pushCanvaGraphic(args: {
  title: string;
  image?: string;
  imageUrl?: string;
  movement?: string;
  autoHideMs?: number;
  keyer?: string;
  slot?: number;
}): Promise<unknown>;
export function setCanvaGraphicOffAir(args?: { keyer?: string; index?: number }): Promise<unknown>;
export function getGatewayStatus(pipelineId?: string): Promise<{ isSimulated?: boolean }>;
export function describeTask(task: Task): { percent: number; label: string };
