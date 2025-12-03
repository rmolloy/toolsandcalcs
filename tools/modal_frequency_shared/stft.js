"use strict";
// @ts-nocheck
(() => {
    async function computeSpectrogram(wave, sampleRate, fftEngine, opts = {}) {
        var _a, _b, _c, _d;
        const N = (_a = opts.fftSize) !== null && _a !== void 0 ? _a : 2048;
        const hop = (_b = opts.hopSize) !== null && _b !== void 0 ? _b : (N >> 1);
        const maxFreq = (_c = opts.maxFreq) !== null && _c !== void 0 ? _c : 1000;
        const window = (_d = opts.window) !== null && _d !== void 0 ? _d : "hann";
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
