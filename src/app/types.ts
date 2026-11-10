/** One exported page: Canva's temporary PNG URL. */
export type Page = { url: string; pageNumber: number; name?: string };

export type NoticeTone = "info" | "positive" | "warn" | "critical";

/** What the shell gives each mode: notices and the shared progress bar. */
export type PanelProps = {
  notify: (message: string, tone?: NoticeTone, durationMs?: number) => void;
  showProgress: (percent: number, label: string) => void;
  clearProgress: () => void;
  busy: boolean;
  /** Whether this mode is the one shown; only the shown mode handles keyboard shortcuts. */
  active: boolean;
};
