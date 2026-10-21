import { readResonanceIdleStatus, saveButtonElementGet, saveButtonRenderFromState, saveStateMarkCleanAndRender, saveStateRead, saveSurfaceHintWrite, saveSurfaceModeWrite, } from "./resonate_save_button.js?rev=90c36258c883";
import { renderResonanceSaveHelp } from "./resonate_save_help.js?rev=90c36258c883";
import { resonanceSaveRunnerCreate } from "./resonate_save_target.js?rev=90c36258c883";
const resonanceSaveRunner = resonanceSaveRunnerCreate();
export function bindSaveAudio(deps) {
    const btnSave = document.getElementById("btn_save_audio");
    if (!btnSave)
        return;
    bindSaveAudioClick(btnSave, deps, resonanceSaveRunner);
}
export async function refreshResonanceSaveSurfaceAndRender(state, setStatus) {
    const saveSurface = await resonanceSaveRunner.readResonanceSaveSurface();
    saveSurfaceModeWrite(state, saveSurface.mode);
    renderResonanceSaveHelp(saveSurface.mode, document.getElementById("reader_save_help"));
    saveSurfaceHintWrite(state, readResonanceSaveSurfaceHint(saveSurface));
    saveButtonRenderFromState(state);
    renderResonanceIdleStatusWhenAppropriate(state, setStatus);
}
function bindSaveAudioClick(button, deps, saveRunner) {
    button.addEventListener("click", () => {
        if (saveStateRead(deps.state) !== "dirty")
            return;
        void runResonanceSaveActionAndRenderCleanState(deps, saveRunner);
    });
}
async function runResonanceSaveActionAndRenderCleanState(deps, saveRunner) {
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
function readResonanceSaveSurfaceHint(saveSurface) {
    return String(saveSurface && "hint" in saveSurface ? saveSurface.hint || "" : "").trim();
}
function renderResonanceIdleStatusWhenAppropriate(state, setStatus) {
    if (!setStatus || !shouldRenderResonanceIdleStatus(state)) {
        return;
    }
    setStatus(readResonanceIdleStatus(state));
}
function shouldRenderResonanceIdleStatus(state) {
    return saveStateRead(state) === "clean" && !state.currentWave;
}
