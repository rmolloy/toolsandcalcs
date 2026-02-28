export function modeOverrideStateGetOrInit(state) {
    return (state.modePeakOverrides || (state.modePeakOverrides = {}));
}
export function modeOverrideStateSet(state, modeKey, freqHz) {
    const map = modeOverrideStateGetOrInit(state);
    map[modeKey] = freqHz;
}
export function modeOverrideStateReset(state, modeKey) {
    const map = modeOverrideStateGetOrInit(state);
    delete map[modeKey];
}
export function modeOverrideStateApplyToModes(modes, freqs, dbs, overrides) {
    return modes.map((mode) => {
        const overrideHz = overrides[mode.mode];
        if (!Number.isFinite(overrideHz))
            return mode;
        const idx = nearestSpectrumIndexFromFreq(freqs, overrideHz);
        if (!Number.isFinite(idx))
            return mode;
        return {
            ...mode,
            peakFreq: freqs[idx],
            peakDb: dbs[idx],
            peakIdx: idx,
        };
    });
}
function nearestSpectrumIndexFromFreq(freqs, targetHz) {
    if (!freqs.length || !Number.isFinite(targetHz))
        return null;
    let bestIdx = 0;
    for (let i = 1; i < freqs.length; i += 1) {
        if (Math.abs(freqs[i] - targetHz) < Math.abs(freqs[bestIdx] - targetHz))
            bestIdx = i;
    }
    return bestIdx;
}
