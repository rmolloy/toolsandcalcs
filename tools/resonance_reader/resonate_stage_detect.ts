import type { ModeDetection } from "./resonate_mode_detection.js";
import { modeOverrideStateApplyToModes, modeOverrideStateGetOrInit } from "./resonate_mode_override_state.js";

export function stageDetectModesFromSpectrum(
  state: Record<string, any>,
  analysisBoundary: { analyzeModes: (spectrum: { freqs: number[]; dbs: number[] }) => ModeDetection[] },
  spectrum: { freqs: number[]; dbs: number[] },
) {
  const detected = analysisBoundary.analyzeModes(spectrum);
  return modeOverrideStateApplyToModes(
    detected,
    spectrum.freqs,
    spectrum.dbs,
    modeOverrideStateGetOrInit(state),
  );
}
