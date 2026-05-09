"use strict";
(() => {
    const MIN_SHORT_WINDOW_FFT_SAMPLES = 32768;
    class JsFftFallback {
        static paddedLengthResolveFromInputLength(inputLength, minFftSamples = MIN_SHORT_WINDOW_FFT_SAMPLES) {
            const target = Math.max(1, inputLength, minFftSamples);
            return 1 << Math.ceil(Math.log2(target));
        }
        static applyWindow(buffer, windowType) {
            const n = buffer.length;
            if (windowType === "rect")
                return buffer instanceof Float64Array ? buffer : Float64Array.from(buffer);
            const out = new Float64Array(n);
            for (let i = 0; i < n; i += 1) {
                const frac = i / (n - 1 || 1);
                let w = 1;
                if (windowType === "hann") {
                    w = 0.5 * (1 - Math.cos(2 * Math.PI * frac));
                }
                else if (windowType === "hamming") {
                    w = 0.54 - 0.46 * Math.cos(2 * Math.PI * frac);
                }
                out[i] = buffer[i] * w;
            }
            return out;
        }
        static fftRadix2(real, imag) {
            const n = real.length;
            if ((n & (n - 1)) !== 0)
                return;
            let j = 0;
            for (let i = 0; i < n; i += 1) {
                if (i < j) {
                    [real[i], real[j]] = [real[j], real[i]];
                    [imag[i], imag[j]] = [imag[j], imag[i]];
                }
                let m = n >> 1;
                while (m >= 1 && j >= m) {
                    j -= m;
                    m >>= 1;
                }
                j += m;
            }
            for (let len = 2; len <= n; len <<= 1) {
                const ang = (-2 * Math.PI) / len;
                const wlenCos = Math.cos(ang);
                const wlenSin = Math.sin(ang);
                for (let i = 0; i < n; i += len) {
                    let wCos = 1;
                    let wSin = 0;
                    for (let k = 0; k < len / 2; k += 1) {
                        const uReal = real[i + k];
                        const uImag = imag[i + k];
                        const vReal = real[i + k + len / 2] * wCos - imag[i + k + len / 2] * wSin;
                        const vImag = real[i + k + len / 2] * wSin + imag[i + k + len / 2] * wCos;
                        real[i + k] = uReal + vReal;
                        imag[i + k] = uImag + vImag;
                        real[i + k + len / 2] = uReal - vReal;
                        imag[i + k + len / 2] = uImag - vImag;
                        const nextCos = wCos * wlenCos - wSin * wlenSin;
                        wSin = wCos * wlenSin + wSin * wlenCos;
                        wCos = nextCos;
                    }
                }
            }
        }
        static magnitudeSpectrum(wave, sampleRate, opts = {}) {
            const { window = "hann", maxFreq = 1200, minFftSamples = MIN_SHORT_WINDOW_FFT_SAMPLES } = opts;
            const padded = JsFftFallback.paddedLengthResolveFromInputLength(wave.length, minFftSamples);
            const real = new Float64Array(padded);
            const imag = new Float64Array(padded);
            const windowed = JsFftFallback.applyWindow(wave, window);
            real.set(windowed);
            JsFftFallback.fftRadix2(real, imag);
            const nyquist = sampleRate / 2;
            const limit = Math.min(Math.floor((maxFreq / nyquist) * (padded / 2)), padded / 2);
            const scale = 2 / padded; // normalize positive-frequency magnitudes
            const freqs = new Float64Array(limit - 1);
            const mags = new Float64Array(limit - 1);
            for (let k = 1; k < limit; k += 1) {
                freqs[k - 1] = (k * sampleRate) / padded;
                mags[k - 1] = Math.hypot(real[k], imag[k]) * scale;
            }
            return { freqs, mags };
        }
    }
    class FftEngine {
        async magnitude(wave, sampleRate, opts = {}) {
            return JsFftFallback.magnitudeSpectrum(wave, sampleRate, opts);
        }
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.createFftEngine = function createFftEngine() {
        return new FftEngine();
    };
})();
