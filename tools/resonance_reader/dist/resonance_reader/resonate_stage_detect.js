import { modeOverrideStateApplyToModes, modeOverrideStateGetOrInit } from "./resonate_mode_override_state.js";
import { modeProfileResolveFromState } from "./resonate_mode_config.js";
export function stageDetectModesFromSpectrum(state, analysisBoundary, spectrum) {
    const profile = modeProfileResolveFromState(state);
    const detected = analysisBoundary.analyzeModesWithBands
        ? analysisBoundary.analyzeModesWithBands(spectrum, profile.bands)
        : analysisBoundary.analyzeModes(spectrum);
    return modeOverrideStateApplyToModes(detected, spectrum.freqs, spectrum.dbs, modeOverrideStateGetOrInit(state));
}
