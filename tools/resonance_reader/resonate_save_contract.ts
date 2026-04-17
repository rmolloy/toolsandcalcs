export type ResonanceSaveSurface =
  | { mode: "offline"; label: string; hint?: string }
  | { mode: "lab-disconnected"; label: string; accessState?: "anonymous" | "signed_in_not_enabled" | "signed_in_no_workbook" | "unknown" }
  | { mode: "lab-connected"; label: string; workbookId: string; notebookName: string };

export type ResonanceSaveActionRequest = {
  state: Record<string, any>;
  action?: string;
  button?: HTMLElement | null;
  setStatus: (text: string) => void;
};

export type ResonanceSaveActionRunner = {
  readResonanceSaveSurface: () => Promise<ResonanceSaveSurface>;
  runResonanceSaveAction: (request: ResonanceSaveActionRequest) => Promise<boolean>;
};
