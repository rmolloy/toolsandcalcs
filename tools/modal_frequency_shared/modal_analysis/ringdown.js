"use strict";
(() => {
    const EPS = 1e-12;
    function nextPow2(n) {
        let p = 1;
        while (p < n)
            p <<= 1;
        return p;
    }
    // Radix-2 FFT with optional inverse flag.
    function fftRadix2(real, imag, inverse = false) {
        const n = real.length;
        if ((n & (n - 1)) !== 0)
            throw new Error("FFT length must be power of two");
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
        const sign = inverse ? 1 : -1;
        for (let len = 2; len <= n; len <<= 1) {
            const ang = (sign * 2 * Math.PI) / len;
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
        if (inverse) {
            for (let i = 0; i < n; i += 1) {
                real[i] /= n;
                imag[i] /= n;
            }
        }
    }
    function hilbertEnvelope(signal) {
        const n = nextPow2(signal.length);
        const real = new Float64Array(n);
        const imag = new Float64Array(n);
        real.set(signal);
        fftRadix2(real, imag, false);
        const h = new Float64Array(n).fill(0);
        h[0] = 1;
        if (n % 2 === 0)
            h[n / 2] = 1;
        for (let k = 1; k < n / 2; k += 1)
            h[k] = 2;
        for (let k = 0; k < n; k += 1) {
            real[k] *= h[k];
            imag[k] *= h[k];
        }
        fftRadix2(real, imag, true);
        const env = new Float64Array(signal.length);
        for (let i = 0; i < signal.length; i += 1) {
            env[i] = Math.hypot(real[i], imag[i]);
        }
        return env;
    }
    function movingAverage(arr, windowSamples) {
        const n = arr.length;
        const out = new Float64Array(n);
        const w = Math.max(1, windowSamples);
        let acc = 0;
        for (let i = 0; i < n; i += 1) {
            acc += arr[i];
            if (i >= w)
                acc -= arr[i - w];
            out[i] = acc / Math.min(i + 1, w);
        }
        return out;
    }
    function linearRegression(xs, ys) {
        const n = xs.length;
        if (n === 0)
            return null;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        let sumYY = 0;
        for (let i = 0; i < n; i += 1) {
            const x = xs[i];
            const y = ys[i];
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
            sumYY += y * y;
        }
        const meanX = sumX / n;
        const meanY = sumY / n;
        const denom = sumXX - n * meanX * meanX;
        if (Math.abs(denom) < EPS)
            return null;
        const slope = (sumXY - n * meanX * meanY) / denom;
        const intercept = meanY - slope * meanX;
        const ssTot = sumYY - n * meanY * meanY;
        const ssRes = ys.reduce((acc, y, i) => {
            const diff = y - (slope * xs[i] + intercept);
            return acc + diff * diff;
        }, 0);
        const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
        return { slope, intercept, r2 };
    }
    function findPeakFrequency(spectrum) {
        var _a, _b, _c;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length) || (!spectrum.mags && !spectrum.dbs))
            return null;
        const mags = spectrum.mags || ((_b = spectrum.dbs) === null || _b === void 0 ? void 0 : _b.map((db) => 10 ** (db / 20)));
        if (!(mags === null || mags === void 0 ? void 0 : mags.length))
            return null;
        let maxIdx = 0;
        let maxVal = -Infinity;
        for (let i = 0; i < mags.length; i += 1) {
            if (mags[i] > maxVal) {
                maxVal = mags[i];
                maxIdx = i;
            }
        }
        return (_c = spectrum.freqs[maxIdx]) !== null && _c !== void 0 ? _c : null;
    }
    function findDeltaF(spectrum, f0) {
        var _a, _b;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length) || !Number.isFinite(f0))
            return null;
        const freqs = spectrum.freqs;
        const mags = spectrum.mags || ((_b = spectrum.dbs) === null || _b === void 0 ? void 0 : _b.map((db) => 10 ** (db / 20)));
        if (!(mags === null || mags === void 0 ? void 0 : mags.length))
            return null;
        let peakIdx = 0;
        let peakVal = -Infinity;
        for (let i = 0; i < mags.length; i += 1) {
            if (mags[i] > peakVal) {
                peakVal = mags[i];
                peakIdx = i;
            }
        }
        if (peakIdx < 0)
            return null;
        const target = peakVal / Math.SQRT2; // -3 dB in linear magnitude space
        let left = peakIdx;
        while (left > 0 && mags[left] >= target)
            left -= 1;
        let right = peakIdx;
        while (right < mags.length - 1 && mags[right] >= target)
            right += 1;
        const leftFreq = freqs[Math.max(0, left)];
        const rightFreq = freqs[Math.min(freqs.length - 1, right)];
        return Math.max(EPS, rightFreq - leftFreq);
    }
    function analyzeRingdown({ buffer, sampleRate, f0 = null, spectrum = null, smoothWindowMs = 5, attackSkipMs = 40, }) {
        if (!buffer || !buffer.length || !Number.isFinite(sampleRate)) {
            throw new Error("Ring-down analysis requires audio buffer and sample rate");
        }
        const xs = buffer.length;
        const signal = new Float64Array(xs);
        let mean = 0;
        for (let i = 0; i < xs; i += 1) {
            const v = buffer[i];
            signal[i] = v;
            mean += v;
        }
        mean /= xs;
        for (let i = 0; i < xs; i += 1)
            signal[i] -= mean;
        const env = hilbertEnvelope(signal);
        const smoothSamples = Math.max(1, Math.round((smoothWindowMs / 1000) * sampleRate));
        const smoothed = movingAverage(env, smoothSamples);
        let maxEnv = EPS;
        for (let i = 0; i < smoothed.length; i += 1) {
            if (smoothed[i] > maxEnv)
                maxEnv = smoothed[i];
        }
        const normEnv = smoothed.map((v) => v / maxEnv);
        let peakIdx = 0;
        let peakVal = -Infinity;
        for (let i = 0; i < normEnv.length; i += 1) {
            if (normEnv[i] > peakVal) {
                peakVal = normEnv[i];
                peakIdx = i;
            }
        }
        const peakSkip = Math.round((attackSkipMs / 1000) * sampleRate);
        const startIdx = Math.min(normEnv.length - 1, peakIdx + peakSkip);
        const fitTimes = [];
        const fitVals = [];
        for (let i = startIdx; i < normEnv.length; i += 1) {
            const v = Math.max(normEnv[i], EPS);
            fitTimes.push(i / sampleRate);
            fitVals.push(Math.log(v));
        }
        let tau = null;
        let envelopeR2 = null;
        let slope = null;
        if (fitTimes.length > 8) {
            const reg = linearRegression(fitTimes, fitVals);
            if (reg) {
                slope = reg.slope;
                tau = slope < 0 ? -1 / slope : null;
                envelopeR2 = reg.r2;
            }
        }
        const peak = Number.isFinite(f0) ? f0 : findPeakFrequency(spectrum);
        const deltaF = spectrum ? findDeltaF(spectrum, peak) : null;
        const Q = Number.isFinite(peak) && Number.isFinite(tau) ? Math.PI * peak * tau : null;
        const flags = [];
        if (Number.isFinite(Q) && Q < 150)
            flags.push("low_Q");
        if (Number.isFinite(deltaF) && Number.isFinite(peak) && deltaF > peak * 0.03)
            flags.push("broad_peak");
        if (Number.isFinite(envelopeR2) && envelopeR2 < 0.85)
            flags.push("unstable_decay");
        const downsampleStep = Math.max(1, Math.floor(normEnv.length / 400));
        const envelopePreview = [];
        for (let i = 0; i < normEnv.length; i += downsampleStep)
            envelopePreview.push(normEnv[i]);
        const timeAxis = Array.from(normEnv, (_v, idx) => idx / sampleRate);
        const dt = 1 / sampleRate;
        return {
            f0: peak !== null && peak !== void 0 ? peak : null,
            tau,
            Q,
            deltaF,
            envelopeR2,
            slope,
            flags,
            envelope: envelopePreview,
            envelopeFull: Array.from(normEnv),
            timeAxis,
            dt,
            sampleRate,
            attackSkipMs,
            smoothWindowMs,
        };
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.ModalRingdown = { analyzeRingdown };
})();
