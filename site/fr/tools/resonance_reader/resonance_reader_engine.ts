// The Resonance Reader's analysis of one recording, apart from its page: the taps it finds, the run of taps
// it selects, the spectrum it detects on, and the peak it picks in each band of the measure mode. The steps
// are the ones the page runs on an imported recording before the luthier changes anything, and the result
// is the page's own mode cards, with the Q the page shows for that measure mode. A page that is not the Resonance Reader, such as a Guitar Lab connector panel, calculates
// through this file.

import { analysisBoundaryDefault } from "./resonate_analysis_boundary.js";
import { resonanceCaptureStateJsonBuild, resonanceCaptureWaveBlobBuild } from "./resonate_capture_package.js";
import { measureModeNormalize, modeProfileResolveFromMeasureMode } from "./resonate_mode_config.js";
import { smoothSpectrumFast } from "./resonate_mode_detection.js";
import { restoreResonanceSavedStateDocument } from "./resonate_notebook_connect_draft.js";
import { peakAnalysisRingdownDataBuild } from "./resonate_peak_analysis_panel.js";
import { primaryRangeAutoSelectFromState } from "./resonate_primary_range_auto.js";
import { resonanceSaveTitleBuild } from "./resonate_save_title.js";
import { signalBoundaryDefault } from "./resonate_signal_boundary.js";
import { spectrumFftMaxHzResolve, spectrumViewRangeResolveFromMeasureMode } from "./resonate_spectrum_config.js";
import { refreshSpectrumVariantsBuild } from "./resonate_spectrum_variants.js";
import { stageDetectModesFromSpectrum } from "./resonate_stage_detect.js";
import { stageRefreshPostApply } from "./resonate_stage_refresh_post.js";
import { stageRefreshPreRun } from "./resonate_stage_refresh_pre.js";
import { resonanceSubjectDraftDefaultsFromMeasureMode } from "./resonate_subject_taxonomy.js";

// The brace stock estimate the Reader page shows from a specimen's dimensions, mass and Long mode:
// density, long-grain modulus, section stiffness and sound speed.
export { braceStockMaterialBuildFromMeasurements } from "./resonate_brace_stock_material.js";

export const RESONANCE_RECORDING_MEASURE_MODES = ["guitar", "plate_stock", "brace_stock"] as const;

export type ResonanceRecordingMeasureMode = typeof RESONANCE_RECORDING_MEASURE_MODES[number];

type FftFactory = Parameters<typeof stageRefreshPreRun>[0]["fftFactory"];

export async function resonanceRecordingAnalyze(args: {
  wave: Float32Array | number[];
  sampleRate: number;
  measureMode: ResonanceRecordingMeasureMode;
  fftFactory: FftFactory;
  // The page's own slice of a recording between two times, FFTWaveform.sliceWaveRange.
  sliceWaveRange: (
    src: { wave: Float32Array | Float64Array | number[]; sampleRate: number },
    startMs: number,
    endMs: number,
  ) => { wave: Float32Array | Float64Array | number[]; sampleRate: number } | null;
  applyDb: (spectrum: { freqs: number[]; mags: number[] }) => any;
}) {
  const measureMode = measureModeNormalize(args.measureMode);
  const durationMs = (args.wave.length / args.sampleRate) * 1000;
  const taps = signalBoundaryDefault.detectTaps(args.wave, args.sampleRate) || [];
  // The page selects from the last sample's time, as its waveform slice gives it.
  const analysedRangeMs = primaryRangeAutoSelectFromState(
    { sampleRate: args.sampleRate, timeMs: [((args.wave.length - 1) / args.sampleRate) * 1000] },
    { tapSegments: taps },
  ) ?? { start: 0, end: durationMs };
  const selected = args.sliceWaveRange({ wave: args.wave, sampleRate: args.sampleRate }, analysedRangeMs.start, analysedRangeMs.end);
  if (!selected) throw new Error("The recording has no samples to analyse.");
  const { spectrum } = await stageRefreshPreRun({
    wave: selected.wave as Float32Array | number[],
    sampleRate: selected.sampleRate,
    fftMaxHz: spectrumFftMaxHzResolve(),
    signal: signalBoundaryDefault,
    fftFactory: args.fftFactory,
  });
  const freqs = Array.from(spectrum.freqs || [], (value) => Number(value));
  const detectedOn = refreshSpectrumVariantsBuild({
    analysis: analysisBoundaryDefault,
    rawSpectrum: { freqs, mags: Array.from(spectrum.mags || [], (value) => Number(value)) },
    displaySpectrum: { freqs, mags: Array.from(spectrum.mags || [], (value) => Number(value)) },
    applyDb: args.applyDb,
  }).displaySpectrum;
  const dbs = Array.from(detectedOn.dbs || detectedOn.mags || [], (value: number) => Number(value));
  const profile = modeProfileResolveFromMeasureMode(measureMode);
  // What the page's state holds for this recording when it builds its cards.
  const state: Record<string, any> = {
    measureMode,
    currentWave: { wave: args.wave, sampleRate: args.sampleRate, fullLengthMs: durationMs },
    tapSegments: taps,
    viewRangeMs: analysedRangeMs,
    qAnalysisWindowMs: analysedRangeMs,
    lastSpectrum: detectedOn,
  };
  const detected = stageDetectModesFromSpectrum(state, analysisBoundaryDefault, { freqs, dbs });
  stageRefreshPostApply({
    state,
    analysis: analysisBoundaryDefault,
    modeMeta: profile.meta,
    modesDetected: detected,
    freqs,
    dbs,
    measureDecayQ: peakAnalysisRingdownDataBuild,
  });
  const cardOf = (key: string) => (state.lastModeCards as any[]).find((card) => card.key === key);

  return {
    measureMode,
    sampleRate: args.sampleRate,
    durationSeconds: args.wave.length / args.sampleRate,
    tapCount: taps.length,
    analysedRangeMs,
    // The spectrum the peaks were detected on, and the frequency range the page shows for this measure mode.
    spectrum: { freqs, dbs },
    spectrumViewRange: spectrumViewRangeResolveFromMeasureMode(measureMode),
    modes: detected.map((mode) => ({
      mode: mode.mode,
      label: profile.meta[mode.mode]?.label ?? mode.mode,
      band: profile.bands[mode.mode] ?? null,
      peakFreq: mode.peakFreq,
      peakDb: mode.peakDb,
      prominenceDb: mode.prominenceDb,
      note: cardOf(mode.mode)?.note ?? null,
      cents: cardOf(mode.mode)?.cents ?? null,
      q: cardOf(mode.mode)?.q ?? null,
      // How the page measured that Q: from each tap's decay for stock, from the peak's width otherwise.
      qMethod: cardOf(mode.mode)?.qEvidence?.method ?? "spectral",
      // Set when the band's highest point is only the side of a stronger peak outside the band.
      sideOfPeakHz: Number.isFinite(mode.peakFreq) ? peakSideOfStrongerPeakHz(freqs, dbs, mode.peakIdx as number) : null,
    })),
    // The page's state for this recording, which its own save code writes from.
    pageState: state,
  };
}

// A resonance stands clear of its surroundings: the level falls away on both sides before it rises again.
// The highest point of a band can instead be a ripple on the side of a stronger peak that lies outside the
// band, which is no resonance of its own. This is the frequency of that stronger peak, or null when the
// point at `index` stands clear: walking away from it either way, the level drops this far before it
// climbs above the point's own.
const PEAK_STANDS_CLEAR_DROP_DB = 3;

export function peakSideOfStrongerPeakHz(freqs: number[], dbs: number[], index: number): number | null {
  for (const step of [-1, 1]) {
    for (let at = index + step; at >= 0 && at < dbs.length; at += step) {
      if (dbs[at] <= dbs[index] - PEAK_STANDS_CLEAR_DROP_DB) break;
      if (dbs[at] <= dbs[index]) continue;
      return freqs[peakTopIndexClimbFrom(freqs, dbs, at, step)];
    }
  }
  return null;
}

// Up a peak's side to its top. A side carries ripples, so the climb follows the level averaged over a few
// hertz, and the top is the highest point of the spectrum itself around where that average turns over.
const PEAK_SIDE_RIPPLE_SPAN_HZ = 5;

function peakTopIndexClimbFrom(freqs: number[], dbs: number[], from: number, step: number) {
  const averaged = smoothSpectrumFast(freqs, dbs, PEAK_SIDE_RIPPLE_SPAN_HZ);
  let at = from;
  while (at + step >= 0 && at + step < averaged.length && averaged[at + step] > averaged[at]) at += step;
  let top = at;
  for (let near = 0; near < dbs.length; near += 1) {
    if (Math.abs(freqs[near] - freqs[at]) <= PEAK_SIDE_RIPPLE_SPAN_HZ && dbs[near] > dbs[top]) top = near;
  }
  return top;
}

// The Resonance Reader's own save of an analysed recording: the state document and the recording as a WAV,
// written by the code the page saves with, and the entry title and kind of subject the page's save offers.
// The plot image, the third file of the page's save, is drawn by whoever shows the graph.
export function resonanceRecordingSaveBuild(args: {
  analysis: { measureMode: string; pageState: Record<string, any> };
  recordingLabel: string;
  toolVersion: string;
  savedAtIso: string;
}) {
  const state = { ...args.analysis.pageState, recordingLabel: args.recordingLabel };

  return {
    stateJson: JSON.stringify(resonanceCaptureStateJsonBuild({
      toolVersion: args.toolVersion,
      savedAtIso: args.savedAtIso,
      recordingLabel: args.recordingLabel,
      state,
    }), null, 2),
    wavBlob: resonanceCaptureWaveBlobBuild(state),
    title: resonanceSaveTitleBuild(args.analysis.measureMode),
    newSubjectDefaults: resonanceSubjectDraftDefaultsFromMeasureMode(args.analysis.measureMode),
  };
}

// A saved recording read back by the page's own restore: the recording, what it was called, the measure
// mode it was read in, and the frequency the save holds for each mode, for a caller to analyse again.
// Null when the document is not a Resonance Reader save or holds no recording.
export function resonanceRecordingFromSave(document: Record<string, any> | null | undefined) {
  const state: Record<string, any> = {};
  if (!restoreResonanceSavedStateDocument(state, document) || !state.currentWave?.wave) return null;

  return {
    wave: state.currentWave.wave as Float32Array,
    sampleRate: Number(state.currentWave.sampleRate),
    measureMode: String(state.measureMode || ""),
    recordingLabel: String(state.recordingLabel || ""),
    savedModes: ((state.lastModeCards as any[]) || [])
      .filter((card) => Number.isFinite(card?.freq))
      .map((card) => ({ mode: String(card.key), label: String(card.label ?? card.key), peakFreq: Number(card.freq) })),
  };
}
