import type { ModeDetection } from "./resonate_mode_detection.js";
import type { ModeCard } from "./resonate_types.js";
import { analysisBoundaryDefault, type AnalysisBoundary } from "./resonate_analysis_boundary.js";
import { signalBoundaryDefault, type SignalBoundary } from "./resonate_signal_boundary.js";
import { stageDetectModesFromSpectrum } from "./resonate_stage_detect.js";
import { stageRefreshPreRun } from "./resonate_stage_refresh_pre.js";
import { stageRefreshPostApply } from "./resonate_stage_refresh_post.js";
import { emitArtifactEventFromState } from "./resonate_artifact_emit.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
import {
  resonancePolymaxValidationEnabled,
  resonanceSpectrumSmoothingEnabled,
  resonanceSpectrumSmoothingHzResolve,
} from "./resonate_debug_flags.js";
import { polymaxStableCandidatesFromWave } from "./resonate_polymax.js";

const FFT_SMOOTH_HZ = 0.05;

export function tapAveragingAllowedForState(state: Record<string, any>) {
  void state;
  return true;
}

export function refreshSpectrumVariantsBuild(args: {
  analysis: AnalysisBoundary;
  rawSpectrum: { freqs: number[]; mags: number[] };
  displaySpectrum: { freqs: number[]; mags: number[] };
  applyDb: (spectrum: { freqs: number[]; mags: number[] }) => any;
}) {
  const displayMags = spectrumMaybeSmooth(args.analysis, args.displaySpectrum.freqs, args.displaySpectrum.mags);
  return {
    rawSpectrum: args.applyDb(args.rawSpectrum),
    displaySpectrum: args.applyDb({ freqs: args.displaySpectrum.freqs, mags: displayMags }),
  };
}

function spectrumMaybeSmooth(
  analysis: AnalysisBoundary,
  freqsRaw: number[],
  magsRaw: number[],
) {
  if (!resonanceSpectrumSmoothingEnabled()) return magsRaw;
  return analysis.smoothSpectrumFast(freqsRaw, magsRaw, resonanceSpectrumSmoothingHzResolve(FFT_SMOOTH_HZ));
}

export async function refreshFftFromState(deps: {
  state: Record<string, any>;
  setStatus: (text: string) => void;
  modeMeta: Record<string, { label: string }>;
  fftMaxHz: number;
  sliceCurrentWave: () => { wave: Float32Array | number[]; sampleRate: number } | null;
  solveDofFromState?: () => void;
  analysisBoundary?: AnalysisBoundary;
  signalBoundary?: SignalBoundary;
}) {
  const analysis = deps.analysisBoundary ?? analysisBoundaryDefault;
  const signal = deps.signalBoundary ?? signalBoundaryDefault;
  const slice = deps.sliceCurrentWave();
  if (!slice) {
    deps.setStatus("Load or record to view the waveform.");
    return;
  }
  const fftFactory = (window as any).createFftEngine;
  if (typeof fftFactory !== "function") return;
  const { directSpectrum, spectrum } = await stageRefreshPreRun({
    wave: slice.wave,
    sampleRate: slice.sampleRate,
    fftMaxHz: deps.fftMaxHz,
    allowTapAveraging: tapAveragingAllowedForState(deps.state),
    signal,
    fftFactory,
  });
  const spectra = refreshSpectrumVariantsBuild({
    analysis,
    rawSpectrum: {
      freqs: Array.from(directSpectrum.freqs || [], (v) => Number(v)),
      mags: Array.from(directSpectrum.mags || [], (v) => Number(v)),
    },
    displaySpectrum: {
      freqs: Array.from(spectrum.freqs || [], (v) => Number(v)),
      mags: Array.from(spectrum.mags || [], (v) => Number(v)),
    },
    applyDb: (window as any).FFTPlot.applyDb,
  });
  deps.state.lastSpectrumRaw = spectra.rawSpectrum;
  deps.state.lastSpectrum = spectra.displaySpectrum;
  deps.state.lastSpectrumNoteSelection = await secondarySpectrumBuildFromNoteSelectionRange({
    state: deps.state,
    fftMaxHz: deps.fftMaxHz,
    signal,
    fftFactory,
    analysis,
  });
  const freqs = Array.from(spectra.displaySpectrum.freqs || [], (v: number) => Number(v));
  const dbs = Array.from(spectra.displaySpectrum.dbs || spectra.displaySpectrum.mags || [], (v: number) => Number(v));
  const modesDetectedRaw = stageDetectModesFromSpectrum(deps.state, analysis, { freqs, dbs });
  const polymaxCandidates = polymaxCandidatesResolveFromSlice(slice.wave, slice.sampleRate, deps.fftMaxHz);
  deps.state.lastPolymaxCandidates = polymaxCandidates;
  const modesDetected = modesDetectedRaw.map((mode) => {
    const peakFreq = Number(mode.peakFreq);
    const poly = polymaxCandidates.find((candidate) => Number.isFinite(peakFreq) && Math.abs(candidate.freqHz - peakFreq) <= 2.5) || null;
    return { ...mode, polymaxStable: Boolean(poly), polymaxStability: poly?.stability ?? null };
  });
  stageRefreshPostApply({
    state: deps.state,
    analysis,
    modeMeta: deps.modeMeta,
    modesDetected,
    freqs,
    dbs,
  });
  deps.state.rerenderFromLastSpectrum = (options?: { skipDof?: boolean }) => {
    const last = deps.state.lastSpectrum;
    if (!last?.freqs?.length) return;
    const freqs2 = Array.from(last.freqs || [], (v: number) => Number(v));
    const dbs2 = Array.from(last.dbs || last.mags || [], (v: number) => Number(v));
    const detRaw = stageDetectModesFromSpectrum(deps.state, analysis, { freqs: freqs2, dbs: dbs2 });
    if (!detRaw.length) return;
    const polymaxCandidates = Array.isArray(deps.state.lastPolymaxCandidates) ? deps.state.lastPolymaxCandidates : [];
    const det = detRaw.map((mode) => {
      const peakFreq = Number(mode.peakFreq);
      const poly = polymaxCandidates.find((candidate: any) => Number.isFinite(peakFreq) && Math.abs(Number(candidate?.freqHz) - peakFreq) <= 2.5) || null;
      return { ...mode, polymaxStable: Boolean(poly), polymaxStability: poly?.stability ?? null };
    });
    stageRefreshPostApply({
      state: deps.state,
      analysis,
      modeMeta: deps.modeMeta,
      modesDetected: det,
      freqs: freqs2,
      dbs: dbs2,
    });
    if (options?.skipDof) {
      emitArtifactEventFromState(deps.state);
      return;
    }
    deps.solveDofFromState?.();
  };
}

function polymaxCandidatesResolveFromSlice(
  wave: Float32Array | number[],
  sampleRate: number,
  fftMaxHz: number,
) {
  if (!resonancePolymaxValidationEnabled()) return [];
  return polymaxStableCandidatesFromWave(wave, sampleRate, { freqMin: 40, freqMax: fftMaxHz });
}

async function secondarySpectrumBuildFromNoteSelectionRange(args: {
  state: Record<string, any>;
  fftMaxHz: number;
  signal: SignalBoundary;
  fftFactory: any;
  analysis: AnalysisBoundary;
}) {
  if (measureModeNormalize(args.state.measureMode) !== "played_note") return null;
  const range = args.state.noteSelectionRangeMs;
  if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start) return null;
  const source = args.state.currentWave;
  if (!source) return null;
  const slicer = (window as any).FFTWaveform?.sliceWaveRange;
  if (typeof slicer !== "function") return null;
  const noteSlice = slicer(source, range.start, range.end);
  if (!noteSlice?.wave?.length || !Number.isFinite(noteSlice?.sampleRate)) return null;

  const { spectrum } = await stageRefreshPreRun({
    wave: noteSlice.wave,
    sampleRate: noteSlice.sampleRate,
    fftMaxHz: args.fftMaxHz,
    signal: args.signal,
    fftFactory: args.fftFactory,
  });
  const freqsRaw = Array.from(spectrum.freqs || [], (v) => Number(v));
  const magsRaw = Array.from(spectrum.mags || [], (v) => Number(v));
  const magsSmoothed = spectrumMaybeSmooth(args.analysis, freqsRaw, magsRaw);
  const withDb = (window as any).FFTPlot.applyDb({ freqs: freqsRaw, mags: magsSmoothed });
  return {
    freqs: Array.from(withDb.freqs || [], (v: number) => Number(v)),
    mags: Array.from(withDb.dbs || withDb.mags || [], (v: number) => Number(v)),
  };
}
