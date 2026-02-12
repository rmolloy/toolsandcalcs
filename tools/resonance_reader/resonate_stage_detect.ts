import type { ModeDetection } from "./resonate_mode_detection.js";
import { modeOverrideStateApplyToModes, modeOverrideStateGetOrInit } from "./resonate_mode_override_state.js";
import { modeProfileResolveFromMeasureMode } from "./resonate_mode_config.js";

export function stageDetectModesFromSpectrum(
  state: Record<string, any>,
  analysisBoundary: {
    analyzeModes: (spectrum: { freqs: number[]; dbs: number[] }) => ModeDetection[];
    analyzeModesWithBands?: (
      spectrum: { freqs: number[]; dbs: number[] },
      bands: Record<string, { low: number; high: number }>,
    ) => ModeDetection[];
  },
  spectrum: { freqs: number[]; dbs: number[] },
) {
  const profile = modeProfileResolveFromMeasureMode(state.measureMode);
  const detected = analysisBoundary.analyzeModesWithBands
    ? analysisBoundary.analyzeModesWithBands(spectrum, profile.bands)
    : analysisBoundary.analyzeModes(spectrum);
  return modeOverrideStateApplyToModes(
    detected,
    spectrum.freqs,
    spectrum.dbs,
    modeOverrideStateGetOrInit(state),
  );
}
