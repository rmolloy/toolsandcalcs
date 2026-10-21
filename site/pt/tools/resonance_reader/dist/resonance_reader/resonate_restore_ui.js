import { measureModeNormalize } from "./resonate_mode_config.js?rev=4a9544c40f78";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=4a9544c40f78";
import { consumeResonanceNotebookConnectDraft, restoreResonanceNotebookConnectDraftState, } from "./resonate_notebook_connect_draft.js?rev=4a9544c40f78";
import { restoreResonanceNotebookEventIntoState } from "./resonate_notebook_restore.js?rev=4a9544c40f78";
import { perTabSessionResolve } from "./resonate_per_tab_persistence.js?rev=4a9544c40f78";
import { recordingMenuLabelSet } from "./resonate_recording_menu.js?rev=4a9544c40f78";
import { saveStateMarkDirtyAndRender } from "./resonate_save_button.js?rev=4a9544c40f78";
import { takeOverlayControlsRender } from "./resonate_take_overlay_controls.js?rev=4a9544c40f78";
export async function restorePerTabSessionIntoUi(deps) {
    if (!await perTabSessionResolve(deps)?.restoreIntoState(deps.state)) {
        return false;
    }
    restoreNotebookConnectDraftControls(deps.state);
    renderNotebookConnectDraftIntoUi(deps);
    takeOverlayControlsRender(deps);
    saveStateMarkDirtyAndRender(deps.state);
    await refreshRestoredPerTabSession(deps);
    return true;
}
export function restoreNotebookConnectDraftIntoUi(deps) {
    const draft = consumeResonanceNotebookConnectDraft(window);
    if (!restoreResonanceNotebookConnectDraftState(deps.state, draft)) {
        return false;
    }
    restoreNotebookConnectDraftControls(deps.state);
    renderNotebookConnectDraftIntoUi(deps);
    return true;
}
export async function restoreNotebookEventIntoUi(deps) {
    const restored = await restoreResonanceNotebookEventIntoState({
        runtime: window,
        state: deps.state,
    });
    if (!restored) {
        return false;
    }
    restoreNotebookConnectDraftControls(deps.state);
    renderNotebookConnectDraftIntoUi(deps);
    return true;
}
async function refreshRestoredPerTabSession(deps) {
    if (!deps.state.currentWave?.wave?.length)
        return;
    await deps.runResonatePipeline("per-tab-restore");
}
function restoreNotebookConnectDraftControls(state) {
    writeMeasureModeSelectValue(state.measureMode);
    recordingMenuLabelSet(String(state.recordingLabel || resonanceLocalizedMessages.restoreNotebookDraftLabel), state);
}
function writeMeasureModeSelectValue(measureMode) {
    const select = measureModeSelectElementGet();
    const normalized = measureModeNormalize(measureMode);
    if (!select || !normalized) {
        return;
    }
    select.value = normalized;
}
function renderNotebookConnectDraftIntoUi(deps) {
    renderNotebookConnectDraftSpectrum(deps);
    renderNotebookConnectDraftModes(deps);
    renderNotebookConnectDraftWaveform(deps);
}
function renderNotebookConnectDraftSpectrum(deps) {
    const spectrum = deps.state.lastSpectrum;
    if (!spectrum?.freqs?.length || !spectrum?.dbs?.length) {
        return;
    }
    deps.renderSpectrum({
        freqs: spectrum.freqs,
        mags: spectrum.dbs,
        overlay: Array.isArray(deps.state.lastOverlay) ? deps.state.lastOverlay : undefined,
        modes: Array.isArray(deps.state.lastModesDetected) ? deps.state.lastModesDetected : [],
    });
}
function renderNotebookConnectDraftModes(deps) {
    deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
}
function renderNotebookConnectDraftWaveform(deps) {
    if (!deps.state.currentWave) {
        return;
    }
    deps.renderWaveform(deps.state.currentWave);
}
function measureModeSelectElementGet() {
    return document.getElementById("measure_mode");
}
