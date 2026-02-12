export function sliceCurrentWaveFromState(state) {
    const src = state.currentWave;
    if (!src)
        return null;
    if (state.viewRangeMs) {
        return window.FFTWaveform.sliceWaveRange(src, state.viewRangeMs.start, state.viewRangeMs.end);
    }
    const desired = Math.min(5000, src.fullLengthMs || 5000);
    return window.FFTWaveform.sliceWave(src, desired);
}
export function fullWaveFromState(state) {
    const src = state.currentWave;
    if (!src)
        return null;
    const end = src.fullLengthMs || (src.timeMs?.[src.timeMs.length - 1]) || 0;
    return window.FFTWaveform.sliceWaveRange(src, 0, end);
}
