import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export type PipelineBusLike = {
  wire: (
    event: string,
    handler: (payload: any, ctx?: { log: (message: string) => void }) => void,
  ) => void;
};

type SaveState = "clean" | "dirty";
type SaveSurfaceMode = "offline" | "lab-disconnected" | "lab-connected";

export function saveButtonElementGet() {
  return document.getElementById("btn_save_audio") as HTMLButtonElement | null;
}

export function saveStateRead(state: Record<string, any>): SaveState {
  return state.saveState === "dirty" ? "dirty" : "clean";
}

function saveSurfaceModeRead(state: Record<string, any>): SaveSurfaceMode {
  return state.saveSurfaceMode || "lab-disconnected";
}

function saveStateWrite(state: Record<string, any>, next: SaveState) {
  state.saveState = next;
}

export function saveSurfaceModeWrite(state: Record<string, any>, next: SaveSurfaceMode) {
  state.saveSurfaceMode = next;
}

function saveSurfaceHintRead(state: Record<string, any>): string {
  return String(state.saveSurfaceHint || "").trim();
}

export function saveSurfaceHintWrite(state: Record<string, any>, next: string) {
  state.saveSurfaceHint = String(next || "").trim();
}

export function saveButtonRenderFromState(state: Record<string, any>) {
  const button = saveButtonElementGet();
  if (!button) return;
  const next = saveStateRead(state);
  const isDirty = next === "dirty";
  button.textContent = isDirty
    ? saveButtonLabelBuild(saveSurfaceModeRead(state))
    : resonanceLocalizedMessages.saveButtonSavedLabel;
  button.disabled = !isDirty;
  button.classList.toggle("save-state-dirty", isDirty);
  button.classList.toggle("save-state-clean", !isDirty);
}

function saveButtonLabelBuild(saveSurfaceMode: SaveSurfaceMode): string {
  if (saveSurfaceMode === "lab-disconnected") {
    return resonanceLocalizedMessages.saveButtonMenuLabel;
  }
  return resonanceLocalizedMessages.saveActionLabel;
}

export function readResonanceIdleStatus(state: Record<string, any>): string {
  const hint = saveSurfaceHintRead(state);

  if (!hint) {
    return resonanceLocalizedMessages.saveIdleStatus;
  }

  return resonanceLocalizedMessages.saveIdleStatusWithHintTemplate.replace("{hint}", hint);
}

export function saveStateMarkDirtyAndRender(state: Record<string, any>) {
  saveStateWrite(state, "dirty");
  saveButtonRenderFromState(state);
}

export function saveStateMarkCleanAndRender(state: Record<string, any>) {
  saveStateWrite(state, "clean");
  saveButtonRenderFromState(state);
}

export function saveStatePipelineDirtySubscriptionAttach(
  bus: PipelineBusLike | undefined,
  state: Record<string, any>,
) {
  if (!bus?.wire) return;
  bus.wire("pipeline.completed", (payload: any) => {
    const trigger = String(payload?.summary?.trigger || "");
    if (trigger !== "import" && trigger !== "record") return;
    saveStateMarkDirtyAndRender(state);
  });
}
