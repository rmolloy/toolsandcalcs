export function detectTaps(wave, sampleRate, opts = {}) {
    const windowMs = opts.windowMs ?? 10;
    const thresholdMult = opts.thresholdMult ?? 6;
    const minGapMs = opts.minGapMs ?? 80;
    const minLenMs = opts.minLenMs ?? 40;
    const windowSamples = Math.max(1, Math.round((windowMs / 1000) * sampleRate));
    const smoothed = [];
    let acc = 0;
    for (let i = 0; i < wave.length; i += 1) {
        acc += Math.abs(wave[i]);
        if (i >= windowSamples)
            acc -= Math.abs(wave[i - windowSamples]);
        smoothed.push(acc / windowSamples);
    }
    const base = median(smoothed);
    const thresh = thresholdMult * base;
    const minGapSamples = Math.round((minGapMs / 1000) * sampleRate);
    const minLenSamples = Math.round((minLenMs / 1000) * sampleRate);
    const taps = [];
    let i = 0;
    while (i < smoothed.length) {
        if (smoothed[i] > thresh) {
            const start = i;
            while (i < smoothed.length && smoothed[i] > thresh / 2)
                i += 1;
            const end = i;
            if (end - start >= minLenSamples) {
                taps.push({ start, end });
                i = end + minGapSamples;
                continue;
            }
        }
        i += 1;
    }
    return taps;
}
function median(arr) {
    if (!arr.length)
        return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
