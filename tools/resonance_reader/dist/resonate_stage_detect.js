import { modeOverrideStateApplyToModes, modeOverrideStateGetOrInit } from "./resonate_mode_override_state.js";
export function stageDetectModesFromSpectrum(state, analysisBoundary, spectrum) {
    const detected = analysisBoundary.analyzeModes(spectrum);
    return modeOverrideStateApplyToModes(detected, spectrum.freqs, spectrum.dbs, modeOverrideStateGetOrInit(state));
}
