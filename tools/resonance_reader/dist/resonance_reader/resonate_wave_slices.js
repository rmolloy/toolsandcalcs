import { measureModeNormalize } from "./resonate_mode_config.js";
import { resonanceFftInputScopeResolve } from "./resonate_debug_flags.js";
export function sliceCurrentWaveFromState(state) {
    const src = state.currentWave;
    if (!src)
        return null;
    if (resonanceFftInputScopeResolve() === "full-file") {
        return fullWaveFromState(state);
    }
    if (state.viewRangeMs) {
        return window.FFTWaveform.sliceWaveRange(src, state.viewRangeMs.start, state.viewRangeMs.end);
    }
    if (measureModeNormalize(state.measureMode) === "played_note") {
        return fullWaveFromState(state);
    }
    const desired = Math.min(5000, src.fullLengthMs || 5000);
    return window.FFTWaveform.sliceWave(src, desired);
}
export function fullWaveFromState(state) {
    const src = state.currentWave;
    if (!src)
        return null;
    const end = fullWaveEndMsResolve(src);
    return window.FFTWaveform.sliceWaveRange(src, 0, end);
}
function fullWaveEndMsResolve(src) {
    const endBySamples = fullWaveEndMsResolveFromSamples(src);
    return src.fullLengthMs || (src.timeMs?.[src.timeMs.length - 1]) || endBySamples;
}
function fullWaveEndMsResolveFromSamples(src) {
    const wave = src.wave || src.samples;
    const sampleRate = Number(src.sampleRate);
    if (!wave?.length || !Number.isFinite(sampleRate) || sampleRate <= 0)
        return 0;
    return (wave.length / sampleRate) * 1000;
}
