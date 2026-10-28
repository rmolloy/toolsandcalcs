import { resonanceDebugApiInstall } from "./resonate_debug_flags.js?rev=093b6a20873d";
import { spectrumFftMaxHzResolve } from "./resonate_spectrum_config.js?rev=093b6a20873d";
import { measureModeNormalize } from "./resonate_mode_config.js?rev=093b6a20873d";
const spectraByState = new WeakMap();
export function captureSpectrumInputs(state, fftMaxHz = spectrumFftMaxHzResolve()) {
    resonanceDebugApiInstall();
    const source = state.currentWave;
    return { wave: source?.wave || source?.samples, analysis: state.analysisBoundary, signal: state.signalBoundary,
        signature: JSON.stringify({ sampleRate: source?.sampleRate, length: (source?.wave || source?.samples)?.length,
            fullLengthMs: source?.fullLengthMs, timeEndMs: source?.timeMs?.[source.timeMs.length - 1],
            primary: rangeSignature(state.viewRangeMs), note: state.measureMode === "played_note" ? rangeSignature(state.noteSelectionRangeMs) : null,
            class: measureModeNormalize(state.measureMode) === "played_note" ? "played-note" : "tap-analysis", fftMaxHz,
            live: Boolean(state.__livePreviewActive), debug: window.ResonanceDebug.show() }) };
}
export function rememberSpectrumFrame(state, inputs) {
    spectraByState.set(state, { inputs, frame: state.lastSpectrum, rawFrame: state.lastSpectrumRaw });
}
export function spectrumCacheIsCurrent(state) {
    const cached = spectraByState.get(state);
    if (!cached || !state.currentWave || !state.lastSpectrum?.freqs?.length)
        return false;
    const current = captureSpectrumInputs(state);
    return cached.frame === state.lastSpectrum && cached.rawFrame === state.lastSpectrumRaw
        && cached.inputs.wave === current.wave && cached.inputs.analysis === current.analysis
        && cached.inputs.signal === current.signal && cached.inputs.signature === current.signature;
}
export function rerenderFromCachedSpectrumIfCurrent(state, options = {}) {
    if (typeof state.rerenderFromLastSpectrum !== "function" || !spectrumCacheIsCurrent(state))
        return false;
    state.preserveSpectrumRangesOnNextRender = options.preserveRanges ?? true;
    state.rerenderFromLastSpectrum({ skipDof: false });
    return true;
}
function rangeSignature(range) {
    return range ? [Array.isArray(range), range.start ?? range[0], range.end ?? range[1]] : null;
}
