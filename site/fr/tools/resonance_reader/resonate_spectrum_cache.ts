import { resonanceDebugApiInstall } from "./resonate_debug_flags.js";
import { spectrumFftMaxHzResolve } from "./resonate_spectrum_config.js";
import { measureModeNormalize } from "./resonate_mode_config.js";

type SpectrumInputs = { wave: unknown; analysis: unknown; signal: unknown; signature: string };
type CachedSpectrum = { inputs: SpectrumInputs; frame: unknown; rawFrame: unknown };
const spectraByState = new WeakMap<object, CachedSpectrum>();

export function captureSpectrumInputs(state: Record<string, any>, fftMaxHz = spectrumFftMaxHzResolve()): SpectrumInputs {
  resonanceDebugApiInstall();
  const source = state.currentWave;
  return { wave: source?.wave || source?.samples, analysis: state.analysisBoundary, signal: state.signalBoundary,
    signature: JSON.stringify({ sampleRate: source?.sampleRate, length: (source?.wave || source?.samples)?.length,
      fullLengthMs: source?.fullLengthMs, timeEndMs: source?.timeMs?.[source.timeMs.length - 1],
      primary: rangeSignature(state.viewRangeMs), note: state.measureMode === "played_note" ? rangeSignature(state.noteSelectionRangeMs) : null,
      class: measureModeNormalize(state.measureMode) === "played_note" ? "played-note" : "tap-analysis", fftMaxHz,
      live: Boolean(state.__livePreviewActive), debug: (window as any).ResonanceDebug.show() }) };
}

export function rememberSpectrumFrame(state: Record<string, any>, inputs: SpectrumInputs): void {
  spectraByState.set(state, { inputs, frame: state.lastSpectrum, rawFrame: state.lastSpectrumRaw });
}

export function spectrumCacheIsCurrent(state: Record<string, any>): boolean {
  const cached = spectraByState.get(state);
  if (!cached || !state.currentWave || !state.lastSpectrum?.freqs?.length) return false;
  const current = captureSpectrumInputs(state);
  return cached.frame === state.lastSpectrum && cached.rawFrame === state.lastSpectrumRaw
    && cached.inputs.wave === current.wave && cached.inputs.analysis === current.analysis
    && cached.inputs.signal === current.signal && cached.inputs.signature === current.signature;
}

export function rerenderFromCachedSpectrumIfCurrent(state: Record<string, any>, options: { preserveRanges?: boolean } = {}): boolean {
  if (typeof state.rerenderFromLastSpectrum !== "function" || !spectrumCacheIsCurrent(state)) return false;
  state.preserveSpectrumRangesOnNextRender = options.preserveRanges ?? true;
  state.rerenderFromLastSpectrum({ skipDof: false });
  return true;
}

function rangeSignature(range: Record<string, any> | null | undefined) {
  return range ? [Array.isArray(range), range.start ?? range[0], range.end ?? range[1]] : null;
}
