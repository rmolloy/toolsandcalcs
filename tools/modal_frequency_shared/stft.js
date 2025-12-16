"use strict";
// @ts-nocheck
(() => {
    async function computeSpectrogram(wave, sampleRate, fftEngine, opts = {}) {
        var _a, _b, _c, _d, _e;
        const N = (_a = opts.fftSize) !== null && _a !== void 0 ? _a : 2048;
        const overlap = Math.max(0, Math.min(0.95, (_b = opts.overlap) !== null && _b !== void 0 ? _b : 0.5));
        const hop = (_c = opts.hopSize) !== null && _c !== void 0 ? _c : Math.max(1, Math.round(N * (1 - overlap)));
        const maxFreq = (_d = opts.maxFreq) !== null && _d !== void 0 ? _d : 1000;
        const window = (_e = opts.window) !== null && _e !== void 0 ? _e : "hann";
        const frames = [];
        const times = [];
        let freqs = null;
        for (let start = 0; start + N <= wave.length; start += hop) {
            const slice = wave.slice(start, start + N);
            // fftEngine.magnitude is async; honor that to keep behavior consistent.
            const spec = await fftEngine.magnitude(slice, sampleRate, { maxFreq, window });
            if (!freqs)
                freqs = spec.freqs;
            frames.push(spec.mags);
            times.push(start / sampleRate);
        }
        return {
            freqs: freqs !== null && freqs !== void 0 ? freqs : new Float64Array(),
            times: new Float64Array(times),
            mags: frames,
        };
    }
    window.ModalSpectrogram = {
        computeSpectrogram,
    };
})();
