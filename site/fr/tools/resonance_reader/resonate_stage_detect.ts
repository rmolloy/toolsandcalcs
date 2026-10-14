import type { ModeDetection } from "./resonate_mode_detection.js";
import { modeOverrideStateApplyToModes, modeOverrideStateGetOrInit } from "./resonate_mode_override_state.js";
import {
  modeProfileResolveFromState,
  peakAnalysisSourceMeasureModeResolve,
} from "./resonate_mode_config.js";

export function stageDetectModesFromSpectrum(
  state: Record<string, any>,
  analysisBoundary: {
    analyzeModes: (spectrum: { freqs: number[]; dbs: number[] }) => ModeDetection[];
    analyzeModesWithBands?: (
      spectrum: { freqs: number[]; dbs: number[] },
      bands: Record<string, { low: number; high: number }>,
    ) => ModeDetection[];
    analyzeModesWithBandsByQAndLevel?: (
      spectrum: { freqs: number[]; dbs: number[] },
      bands: Record<string, { low: number; high: number }>,
      estimateQ: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null,
    ) => ModeDetection[];
    estimateQFromDb?: (
      freqs: number[],
      dbs: number[],
      peak: { freq: number; db: number },
    ) => number | null;
  },
  spectrum: { freqs: number[]; dbs: number[] },
) {
  const profile = modeProfileResolveFromState(state);
  const detected = braceStockModesDetect(state, analysisBoundary, spectrum, profile.bands)
    ?? modesDetectWithProfile(analysisBoundary, spectrum, profile.bands);
  return modeOverrideStateApplyToModes(
    detected,
    spectrum.freqs,
    spectrum.dbs,
    modeOverrideStateGetOrInit(state),
  );
}

function braceStockModesDetect(
  state: Record<string, any>,
  analysisBoundary: {
    analyzeModesWithBandsByQAndLevel?: (
      spectrum: { freqs: number[]; dbs: number[] },
      bands: Record<string, { low: number; high: number }>,
      estimateQ: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null,
    ) => ModeDetection[];
    estimateQFromDb?: (
      freqs: number[],
      dbs: number[],
      peak: { freq: number; db: number },
    ) => number | null;
  },
  spectrum: { freqs: number[]; dbs: number[] },
  bands: Record<string, { low: number; high: number }>,
) {
  if (peakAnalysisSourceMeasureModeResolve(state) !== "brace_stock") return null;
  if (!analysisBoundary.analyzeModesWithBandsByQAndLevel || !analysisBoundary.estimateQFromDb) return null;
  return analysisBoundary.analyzeModesWithBandsByQAndLevel(
    spectrum,
    bands,
    analysisBoundary.estimateQFromDb,
  );
}

function modesDetectWithProfile(
  analysisBoundary: {
    analyzeModes: (spectrum: { freqs: number[]; dbs: number[] }) => ModeDetection[];
    analyzeModesWithBands?: (
      spectrum: { freqs: number[]; dbs: number[] },
      bands: Record<string, { low: number; high: number }>,
    ) => ModeDetection[];
  },
  spectrum: { freqs: number[]; dbs: number[] },
  bands: Record<string, { low: number; high: number }>,
) {
  return analysisBoundary.analyzeModesWithBands
    ? analysisBoundary.analyzeModesWithBands(spectrum, bands)
    : analysisBoundary.analyzeModes(spectrum);
}
