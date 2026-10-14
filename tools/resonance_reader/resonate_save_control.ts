import {
  readResonanceIdleStatus,
  saveButtonElementGet,
  saveButtonRenderFromState,
  saveStateMarkCleanAndRender,
  saveStateRead,
  saveSurfaceHintWrite,
  saveSurfaceModeWrite,
} from "./resonate_save_button.js";
import type { ResonanceSaveActionRunner } from "./resonate_save_contract.js";
import { renderResonanceSaveHelp } from "./resonate_save_help.js";
import { resonanceSaveRunnerCreate } from "./resonate_save_target.js";
import type { UiBindingsDeps } from "./resonate_ui_bindings_contract.js";

const resonanceSaveRunner = resonanceSaveRunnerCreate();

export function bindSaveAudio(deps: UiBindingsDeps) {
  const btnSave = document.getElementById("btn_save_audio");
  if (!btnSave) return;
  bindSaveAudioClick(btnSave, deps, resonanceSaveRunner);
}

export async function refreshResonanceSaveSurfaceAndRender(
  state: Record<string, any>,
  setStatus?: (text: string) => void,
) {
  const saveSurface = await resonanceSaveRunner.readResonanceSaveSurface();
  saveSurfaceModeWrite(state, saveSurface.mode);
  renderResonanceSaveHelp(saveSurface.mode, document.getElementById("reader_save_help"));
  saveSurfaceHintWrite(state, readResonanceSaveSurfaceHint(saveSurface));
  saveButtonRenderFromState(state);
  renderResonanceIdleStatusWhenAppropriate(state, setStatus);
}

function bindSaveAudioClick(
  button: HTMLElement,
  deps: UiBindingsDeps,
  saveRunner: ResonanceSaveActionRunner,
) {
  button.addEventListener("click", () => {
    if (saveStateRead(deps.state) !== "dirty") return;
    void runResonanceSaveActionAndRenderCleanState(deps, saveRunner);
  });
}

async function runResonanceSaveActionAndRenderCleanState(
  deps: UiBindingsDeps,
  saveRunner: ResonanceSaveActionRunner,
) {
  const button = saveButtonElementGet();
  const saved = await saveRunner.runResonanceSaveAction({
    state: deps.state,
    button,
    setStatus: deps.setStatus,
  });
  if (saved) {
    saveStateMarkCleanAndRender(deps.state);
  }
}

function readResonanceSaveSurfaceHint(
  saveSurface: Awaited<ReturnType<ResonanceSaveActionRunner["readResonanceSaveSurface"]>>,
): string {
  return String(saveSurface && "hint" in saveSurface ? saveSurface.hint || "" : "").trim();
}

function renderResonanceIdleStatusWhenAppropriate(
  state: Record<string, any>,
  setStatus: ((text: string) => void) | undefined,
) {
  if (!setStatus || !shouldRenderResonanceIdleStatus(state)) {
    return;
  }

  setStatus(readResonanceIdleStatus(state));
}

function shouldRenderResonanceIdleStatus(state: Record<string, any>) {
  return saveStateRead(state) === "clean" && !state.currentWave;
}
