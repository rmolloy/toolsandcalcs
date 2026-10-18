import { SETTINGS_IDS } from "./resonate_settings_ids.js?rev=957cdb0b4694";
import { settingsAudioInputBind, settingsAudioInputsRefresh, } from "./resonate_audio_input_select.js?rev=957cdb0b4694";
import { settingsBooleanPatchBuild, settingsDebugPatchBuild, settingsProfileValueRead, settingsSmoothingValueRead, } from "./resonate_settings_model.js?rev=957cdb0b4694";
import { settingsPipelineRefresh, } from "./resonate_settings_refresh.js?rev=957cdb0b4694";
export { settingsBooleanPatchBuild, settingsDebugPatchBuild, settingsFiniteNumberPatchBuild, settingsNumberPatchBuild, settingsPositiveNumberPatchBuild, settingsProfilePatchBuild, settingsProfileValueRead, settingsSmoothingPatchBuild, } from "./resonate_settings_model.js?rev=957cdb0b4694";
export function settingsModalBind(deps) {
    const dialog = settingsDialogElementGet();
    const trigger = buttonElementGet(SETTINGS_IDS.trigger);
    if (!dialog || !trigger)
        return;
    trigger.addEventListener("click", () => {
        settingsControlsSyncFromRuntime();
        void settingsAudioInputsRefresh();
        settingsDialogOpen(dialog);
    });
    buttonElementGet(SETTINGS_IDS.audioRefresh)?.addEventListener("click", () => {
        void settingsAudioInputsRefresh();
    });
    settingsAudioInputBind();
    buttonElementGet(SETTINGS_IDS.reset)?.addEventListener("click", () => {
        settingsDebugApiGet()?.reset?.();
        settingsControlsSyncFromRuntime();
        settingsPipelineRefresh(deps);
    });
    buttonElementGet(SETTINGS_IDS.done)?.addEventListener("click", () => {
        settingsPipelineRefresh(deps);
    });
    settingsFftSelectsGet().forEach((select) => {
        select.addEventListener("change", () => {
            settingsDebugApiGet()?.set?.(settingsDebugPatchBuild(select.id, select.value));
            settingsControlsSyncFromRuntime();
            settingsPipelineRefresh(deps);
        });
    });
    settingsFftNumberInputsGet().forEach((input) => {
        input.addEventListener("change", () => {
            settingsDebugApiGet()?.set?.(settingsDebugPatchBuild(input.id, input.value));
            settingsControlsSyncFromRuntime();
            settingsPipelineRefresh(deps);
        });
    });
    settingsFftToggleInputsGet().forEach((input) => {
        input.addEventListener("change", () => {
            settingsDebugApiGet()?.set?.(settingsBooleanPatchBuild(input.id, input.checked));
            settingsControlsSyncFromRuntime();
            settingsPipelineRefresh(deps);
        });
    });
}
function settingsDialogOpen(dialog) {
    if (dialog.open)
        return;
    dialog.showModal();
}
function settingsControlsSyncFromRuntime() {
    const flags = settingsDebugApiGet()?.show?.() || {};
    selectValueWrite(SETTINGS_IDS.profile, settingsProfileValueRead(flags));
    selectValueWrite(SETTINGS_IDS.scope, flags.fftInputScope || "");
    selectValueWrite(SETTINGS_IDS.window, flags.fftWindow || "");
    selectValueWrite(SETTINGS_IDS.resolution, flags.fftResolution || "");
    selectValueWrite(SETTINGS_IDS.smoothing, settingsSmoothingValueRead(flags));
    selectValueWrite(SETTINGS_IDS.averaging, flags.spectrumAveragingMode || "off");
    selectValueWrite(SETTINGS_IDS.displayRange, flags.spectrumDisplayRange || "");
    selectValueWrite(SETTINGS_IDS.dbScale, flags.spectrumDbScale || "");
    selectValueWrite(SETTINGS_IDS.yAxis, flags.spectrumYAxisMode || "");
    selectValueWrite(SETTINGS_IDS.xScale, flags.spectrumXAxisScale || "");
    numberValueWrite(SETTINGS_IDS.xMin, flags.spectrumXAxisMin);
    numberValueWrite(SETTINGS_IDS.xMax, flags.spectrumXAxisMax);
    numberValueWrite(SETTINGS_IDS.yMin, flags.spectrumYAxisMin);
    numberValueWrite(SETTINGS_IDS.yMax, flags.spectrumYAxisMax);
    numberValueWrite(SETTINGS_IDS.smoothingBins, flags.spectrumSmoothingBins);
    numberValueWrite(SETTINGS_IDS.smoothingHz, flags.spectrumSmoothingHz);
    numberValueWrite(SETTINGS_IDS.lineWidth, flags.spectrumLineWidth);
    numberValueWrite(SETTINGS_IDS.tapSliceWindowMs, flags.tapSliceWindowMs);
    numberValueWrite(SETTINGS_IDS.energyBandWidthHz, flags.energyBandWidthHz);
    toggleCheckedWrite(SETTINGS_IDS.tapAveraging, Boolean(flags.useTapAveraging));
    toggleCheckedWrite(SETTINGS_IDS.peakHold, Boolean(flags.usePeakHold));
    toggleCheckedWrite(SETTINGS_IDS.peakRefine, flags.useParabolicPeakRefine !== false);
    toggleCheckedWrite(SETTINGS_IDS.polymaxValidation, Boolean(flags.usePolymaxValidation));
}
function settingsFftSelectsGet() {
    return [
        SETTINGS_IDS.profile,
        SETTINGS_IDS.scope,
        SETTINGS_IDS.window,
        SETTINGS_IDS.resolution,
        SETTINGS_IDS.smoothing,
        SETTINGS_IDS.averaging,
        SETTINGS_IDS.displayRange,
        SETTINGS_IDS.dbScale,
        SETTINGS_IDS.yAxis,
        SETTINGS_IDS.xScale,
    ].map(selectElementGet).filter(Boolean);
}
function settingsFftNumberInputsGet() {
    return [
        SETTINGS_IDS.xMin,
        SETTINGS_IDS.xMax,
        SETTINGS_IDS.yMin,
        SETTINGS_IDS.yMax,
        SETTINGS_IDS.smoothingBins,
        SETTINGS_IDS.smoothingHz,
        SETTINGS_IDS.lineWidth,
        SETTINGS_IDS.tapSliceWindowMs,
        SETTINGS_IDS.energyBandWidthHz,
    ].map(inputElementGet).filter(Boolean);
}
function settingsFftToggleInputsGet() {
    return [
        SETTINGS_IDS.tapAveraging,
        SETTINGS_IDS.peakHold,
        SETTINGS_IDS.peakRefine,
        SETTINGS_IDS.polymaxValidation,
    ].map(inputElementGet).filter(Boolean);
}
function selectValueWrite(id, value) {
    const select = selectElementGet(id);
    if (!select)
        return;
    select.value = value;
}
function numberValueWrite(id, value) {
    const input = inputElementGet(id);
    if (!input)
        return;
    input.value = Number.isFinite(value) ? String(value) : "";
}
function toggleCheckedWrite(id, checked) {
    const input = inputElementGet(id);
    if (!input)
        return;
    input.checked = checked;
}
function settingsDebugApiGet() {
    return window.ResonanceDebug;
}
function settingsDialogElementGet() {
    return document.getElementById(SETTINGS_IDS.dialog);
}
function buttonElementGet(id) {
    return document.getElementById(id);
}
function selectElementGet(id) {
    return document.getElementById(id);
}
function inputElementGet(id) {
    return document.getElementById(id);
}
