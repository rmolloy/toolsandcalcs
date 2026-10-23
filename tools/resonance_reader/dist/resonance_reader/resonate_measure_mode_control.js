import { customMeasurementKeyIsCustom } from "./resonate_custom_measurements.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
import { rerenderFromLastSpectrumIfPossible } from "./resonate_spectrum_rerender.js";
import { rerenderFromCachedSpectrumIfCurrent } from "./resonate_spectrum_cache.js";
export function bindMeasureMode(deps) {
    measureModeStateSeedFromSelect(deps.state);
    energyTransferPanelSyncFromState(deps.state);
    const select = measureModeSelectElementGet();
    if (!select)
        return;
    select.addEventListener("change", () => measureModeChangeHandle(deps));
}
export function measureModeChangeApply(nextMode, deps) {
    peakAnalysisSourceMeasureModeSync(deps.state, nextMode);
    deps.state.measureMode = nextMode;
    deps.state.lastOverlay = undefined;
    measureModeViewRangesReset(deps.state);
    if (measureModeChangeShouldReseedDemoWave()) {
        measureModeStateResetForDemoWave(deps.state);
    }
    measureModeStatePreserveCustomCardsOnly(deps.state);
    energyTransferPanelSyncFromState(deps.state);
    deps.renderModes(Array.isArray(deps.state.lastModeCards) ? deps.state.lastModeCards : []);
    if (measureModeChangeShouldRunPipelineForDemoWave()) {
        runMeasureModePipelineRefresh(deps);
        return;
    }
    if (measureModeChangeShouldRenderMock(deps.state)) {
        deps.renderMock();
        deps.setStatus(resonanceLocalizedMessages.saveIdleStatus);
        return;
    }
    if (rerenderFromCachedSpectrumIfCurrent(deps.state, { preserveRanges: false })) {
        void window.ResonatePerTabState?.persist?.();
        return;
    }
    rerenderFromLastSpectrumIfPossible(deps.state);
    runMeasureModePipelineRefresh(deps);
}
export function peakAnalysisSourceMeasureModeSync(state, nextMode) {
    if (nextMode !== "peak_analysis") {
        state.peakAnalysisSourceMeasureMode = nextMode;
        return;
    }
    const previousMode = measureModeNormalize(state.measureMode);
    if (previousMode !== "peak_analysis") {
        state.peakAnalysisSourceMeasureMode = previousMode;
    }
}
export function measureModeChangeShouldRenderMock(state) {
    return !state?.currentWave;
}
export function measureModeChangeShouldReseedDemoWave() {
    return !String(window.FFTState?.recordingLabel || "").trim();
}
export function measureModeChangeShouldRunPipelineForDemoWave() {
    return measureModeChangeShouldReseedDemoWave();
}
export function measureModeStatePreserveCustomCardsOnly(state) {
    const cards = Array.isArray(state?.lastModeCards) ? state.lastModeCards : [];
    state.lastModeCards = cards.filter((card) => customMeasurementKeyIsCustom(String(card?.key || "")));
    state.lastModesDetected = [];
}
export function measureModeStateResetForDemoWave(state) {
    state.viewRangeMs = null;
    state.currentWave = null;
    state.lastSpectrum = null;
    state.lastSpectrumRaw = null;
    state.lastSpectrumNoteSelection = null;
}
export function measureModeViewRangesReset(state) {
    state.noteSelectionRangeMs = null;
    state.lastPrimaryRangePipelineFingerprint = null;
    state.lastNoteRangePipelineFingerprint = null;
}
function measureModeSelectElementGet() {
    return document.getElementById("measure_mode");
}
function measureModeStateSeedFromSelect(state) {
    const select = measureModeSelectElementGet();
    state.measureMode = measureModeNormalize(select?.value);
    peakAnalysisSourceMeasureModeSync(state, state.measureMode);
}
function energyTransferPanelSyncFromState(state) {
    const render = window.ResonateUiRender?.renderEnergyTransferFromState;
    if (typeof render !== "function")
        return;
    render(state);
}
function measureModeChangeHandle(deps) {
    const select = measureModeSelectElementGet();
    if (!select)
        return;
    const nextMode = measureModeNormalize(select.value);
    measureModeChangeApply(nextMode, deps);
}
function runMeasureModePipelineRefresh(deps) {
    deps.runResonatePipeline("measure-mode-change").catch(() => rerenderFromLastSpectrumIfPossible(deps.state));
}
