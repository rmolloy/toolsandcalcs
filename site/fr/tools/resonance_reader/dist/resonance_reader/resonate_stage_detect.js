import { modeOverrideStateApplyToModes, modeOverrideStateGetOrInit } from "./resonate_mode_override_state.js";
import { modeProfileResolveFromState, peakAnalysisSourceMeasureModeResolve, } from "./resonate_mode_config.js";
export function stageDetectModesFromSpectrum(state, analysisBoundary, spectrum) {
    const profile = modeProfileResolveFromState(state);
    const detected = braceStockModesDetect(state, analysisBoundary, spectrum, profile.bands)
        ?? modesDetectWithProfile(analysisBoundary, spectrum, profile.bands);
    return modeOverrideStateApplyToModes(detected, spectrum.freqs, spectrum.dbs, modeOverrideStateGetOrInit(state));
}
function braceStockModesDetect(state, analysisBoundary, spectrum, bands) {
    if (peakAnalysisSourceMeasureModeResolve(state) !== "brace_stock")
        return null;
    if (!analysisBoundary.analyzeModesWithBandsByQAndLevel || !analysisBoundary.estimateQFromDb)
        return null;
    return analysisBoundary.analyzeModesWithBandsByQAndLevel(spectrum, bands, analysisBoundary.estimateQFromDb);
}
function modesDetectWithProfile(analysisBoundary, spectrum, bands) {
    return analysisBoundary.analyzeModesWithBands
        ? analysisBoundary.analyzeModesWithBands(spectrum, bands)
        : analysisBoundary.analyzeModes(spectrum);
}
