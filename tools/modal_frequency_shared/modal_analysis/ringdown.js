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
    function meanRemovedSignalFromBuffer(buffer) {
        const signal = new Float64Array(buffer.length);
        let mean = 0;
        for (let i = 0; i < buffer.length; i += 1) {
            const value = buffer[i];
            signal[i] = value;
            mean += value;
        }
        mean /= Math.max(1, buffer.length);
        for (let i = 0; i < signal.length; i += 1)
            signal[i] -= mean;
        return signal;
    }
    function normalizedEnvelopeFromSignal(signal, sampleRate, smoothWindowMs) {
        const env = hilbertEnvelope(signal);
        const smoothSamples = Math.max(1, Math.round((smoothWindowMs / 1000) * sampleRate));
        const smoothed = movingAverage(env, smoothSamples);
        return normalizedEnvelopeFromSamples(smoothed);
    }
    function normalizedEnvelopeFromSamples(samples) {
        let maxEnv = EPS;
        for (let i = 0; i < samples.length; i += 1) {
            if (samples[i] > maxEnv)
                maxEnv = samples[i];
        }
        const normalized = new Float64Array(samples.length);
        for (let i = 0; i < samples.length; i += 1) {
            normalized[i] = samples[i] / maxEnv;
        }
        return normalized;
    }
    function envelopePeakIndexResolve(envelope) {
        let peakIdx = 0;
        let peakVal = -Infinity;
        for (let i = 0; i < envelope.length; i += 1) {
            if (envelope[i] > peakVal) {
                peakVal = envelope[i];
                peakIdx = i;
            }
        }
        return peakIdx;
    }
    function envelopeFitResultFromDecay(envelope, sampleRate, attackSkipMs, fitFloorDb) {
        const startIdx = fitStartIndexResolve(envelope, sampleRate, attackSkipMs);
        const endIdx = fitEndIndexResolve(envelope, startIdx, fitFloorDb);
        const fitTimes = fitTimesBuild(sampleRate, startIdx, endIdx);
        const fitVals = fitLogEnvelopeBuild(envelope, startIdx, endIdx);
        const fitStartSec = startIdx / sampleRate;
        const fitEndSec = endIdx / sampleRate;
        if (fitTimes.length <= 8) {
            return { tau: null, envelopeR2: null, slope: null, fitStartSec, fitEndSec };
        }
        const reg = linearRegression(fitTimes, fitVals);
        if (!reg) {
            return { tau: null, envelopeR2: null, slope: null, fitStartSec, fitEndSec };
        }
        return {
            slope: reg.slope,
            tau: reg.slope < 0 ? -1 / reg.slope : null,
            envelopeR2: reg.r2,
            fitStartSec,
            fitEndSec,
        };
    }
    function fitStartIndexResolve(envelope, sampleRate, attackSkipMs) {
        const peakIdx = envelopePeakIndexResolve(envelope);
        const peakSkip = Math.round((attackSkipMs / 1000) * sampleRate);
        return Math.min(envelope.length - 1, peakIdx + peakSkip);
    }
    function fitEndIndexResolve(envelope, startIdx, fitFloorDb) {
        const threshold = Math.pow(10, -Math.abs(fitFloorDb) / 20);
        for (let i = envelope.length - 1; i > startIdx; i -= 1) {
            if (envelope[i] >= threshold)
                return i;
        }
        return envelope.length - 1;
    }
    function fitTimesBuild(sampleRate, startIdx, endIdx) {
        const fitTimes = [];
        for (let i = startIdx; i <= endIdx; i += 1)
            fitTimes.push(i / sampleRate);
        return fitTimes;
    }
    function fitLogEnvelopeBuild(envelope, startIdx, endIdx) {
        const fitVals = [];
        for (let i = startIdx; i <= endIdx; i += 1) {
            fitVals.push(Math.log(Math.max(envelope[i], EPS)));
        }
        return fitVals;
    }
    function fitDampedSinusoid({ signal, sampleRate, targetFrequencyHz, fitStartSec, fitEndSec, initialTau, }) {
        const startIndex = Math.max(0, Math.round(fitStartSec * sampleRate));
        const endIndex = Math.min(signal.length - 1, Math.round(fitEndSec * sampleRate));
        if (endIndex - startIndex < 8 || !Number.isFinite(targetFrequencyHz) || targetFrequencyHz <= 0) {
            return { frequencyHz: null, tau: null, r2: null, slope: null };
        }
        const frequencyRadiusHz = Math.max(1, Math.min(6, targetFrequencyHz * 0.03));
        const alphaCenter = Number.isFinite(initialTau) && initialTau > 0
            ? 1 / initialTau
            : 4;
        const initialBest = dampedSinusoidCandidateResolve({
            signal,
            sampleRate,
            startIndex,
            endIndex,
            frequencyCandidates: centeredCandidatesBuild(targetFrequencyHz, frequencyRadiusHz, 17),
            alphaCandidates: scaledCandidatesBuild(alphaCenter),
        });
        const best = dampedSinusoidCandidateRefine({
            signal,
            sampleRate,
            startIndex,
            endIndex,
            initialBest,
            initialFrequencyRadiusHz: frequencyRadiusHz,
        });
        if (!best)
            return { frequencyHz: null, tau: null, r2: null, slope: null };
        return {
            frequencyHz: best.frequencyHz,
            tau: 1 / best.alpha,
            r2: best.r2,
            slope: -best.alpha,
        };
    }
    function centeredCandidatesBuild(center, radius, count) {
        return Array.from({ length: count }, (_value, index) => center - radius + (2 * radius * index) / Math.max(1, count - 1));
    }
    function scaledCandidatesBuild(center) {
        return [0.4, 0.55, 0.7, 0.85, 1, 1.15, 1.35, 1.65, 2.1].map((factor) => center * factor);
    }
    function dampedSinusoidCandidateRefine({ signal, sampleRate, startIndex, endIndex, initialBest, initialFrequencyRadiusHz, }) {
        let best = initialBest;
        let frequencyRadiusHz = initialFrequencyRadiusHz / 4;
        for (let pass = 0; pass < 3 && best; pass += 1) {
            best = dampedSinusoidCandidateResolve({
                signal,
                sampleRate,
                startIndex,
                endIndex,
                frequencyCandidates: centeredCandidatesBuild(best.frequencyHz, frequencyRadiusHz, 13),
                alphaCandidates: centeredCandidatesBuild(best.alpha, best.alpha * 0.25, 13),
            });
            frequencyRadiusHz /= 4;
        }
        return best;
    }
    function dampedSinusoidCandidateResolve({ signal, sampleRate, startIndex, endIndex, frequencyCandidates, alphaCandidates, }) {
        let best = null;
        frequencyCandidates.forEach((frequencyHz) => {
            alphaCandidates.forEach((alpha) => {
                const r2 = dampedSinusoidFitQualityResolve(signal, sampleRate, startIndex, endIndex, frequencyHz, alpha);
                if (r2 === null || !Number.isFinite(r2) || (best && r2 <= best.r2))
                    return;
                best = { frequencyHz, alpha, r2 };
            });
        });
        return best;
    }
    function dampedSinusoidFitQualityResolve(signal, sampleRate, startIndex, endIndex, frequencyHz, alpha) {
        const stride = Math.max(1, Math.floor(sampleRate / 4000));
        const angularFrequency = 2 * Math.PI * frequencyHz;
        let cosineEnergy = 0;
        let sineEnergy = 0;
        let crossEnergy = 0;
        let cosineSignal = 0;
        let sineSignal = 0;
        let signalEnergy = 0;
        for (let index = startIndex; index <= endIndex; index += stride) {
            const timeSec = (index - startIndex) / sampleRate;
            const decay = Math.exp(-alpha * timeSec);
            const cosine = decay * Math.cos(angularFrequency * timeSec);
            const sine = decay * Math.sin(angularFrequency * timeSec);
            const value = Number(signal[index]) || 0;
            cosineEnergy += cosine * cosine;
            sineEnergy += sine * sine;
            crossEnergy += cosine * sine;
            cosineSignal += cosine * value;
            sineSignal += sine * value;
            signalEnergy += value * value;
        }
        const determinant = cosineEnergy * sineEnergy - crossEnergy * crossEnergy;
        if (Math.abs(determinant) < EPS || signalEnergy < EPS)
            return null;
        const cosineCoefficient = (cosineSignal * sineEnergy - sineSignal * crossEnergy) / determinant;
        const sineCoefficient = (sineSignal * cosineEnergy - cosineSignal * crossEnergy) / determinant;
        const explainedEnergy = cosineCoefficient * cosineSignal + sineCoefficient * sineSignal;
        return Math.max(0, Math.min(1, explainedEnergy / signalEnergy));
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
    function localPeakFrequencyNearTarget(spectrum, targetFrequencyHz, searchWidthHz) {
        const peakIdx = localPeakIndexNearTargetResolve(spectrum, targetFrequencyHz, searchWidthHz);
        return peakIdx === null ? null : spectrum.freqs[peakIdx];
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
    function localDeltaFNearTarget(spectrum, targetFrequencyHz, searchWidthHz) {
        var _a;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length))
            return null;
        const mags = magnitudeSeriesResolve(spectrum);
        if (!(mags === null || mags === void 0 ? void 0 : mags.length))
            return null;
        const peakIdx = localPeakIndexNearTargetResolve(spectrum, targetFrequencyHz, searchWidthHz);
        if (peakIdx === null)
            return null;
        const target = mags[peakIdx] / Math.SQRT2;
        const leftBound = lowerIndexForFrequency(spectrum.freqs, targetFrequencyHz - searchWidthHz / 2);
        const rightBound = upperIndexForFrequency(spectrum.freqs, targetFrequencyHz + searchWidthHz / 2);
        let left = peakIdx;
        while (left > leftBound && mags[left] >= target)
            left -= 1;
        let right = peakIdx;
        while (right < rightBound && mags[right] >= target)
            right += 1;
        return Math.max(EPS, spectrum.freqs[right] - spectrum.freqs[left]);
    }
    function localPeakIndexNearTargetResolve(spectrum, targetFrequencyHz, searchWidthHz) {
        var _a;
        if (!((_a = spectrum === null || spectrum === void 0 ? void 0 : spectrum.freqs) === null || _a === void 0 ? void 0 : _a.length))
            return null;
        const mags = magnitudeSeriesResolve(spectrum);
        if (!(mags === null || mags === void 0 ? void 0 : mags.length))
            return null;
        const lowerBound = targetFrequencyHz - searchWidthHz / 2;
        const upperBound = targetFrequencyHz + searchWidthHz / 2;
        let bestIdx = null;
        let bestVal = -Infinity;
        for (let i = 0; i < spectrum.freqs.length; i += 1) {
            const freq = spectrum.freqs[i];
            if (freq < lowerBound || freq > upperBound)
                continue;
            if (mags[i] > bestVal) {
                bestVal = mags[i];
                bestIdx = i;
            }
        }
        return bestIdx;
    }
    function magnitudeSeriesResolve(spectrum) {
        var _a;
        return spectrum.mags || ((_a = spectrum.dbs) === null || _a === void 0 ? void 0 : _a.map((db) => 10 ** (db / 20)));
    }
    function lowerIndexForFrequency(freqs, minimumFreq) {
        for (let i = 0; i < freqs.length; i += 1) {
            if (freqs[i] >= minimumFreq)
                return i;
        }
        return 0;
    }
    function upperIndexForFrequency(freqs, maximumFreq) {
        for (let i = freqs.length - 1; i >= 0; i -= 1) {
            if (freqs[i] <= maximumFreq)
                return i;
        }
        return freqs.length - 1;
    }
    function modeBandwidthResolve(targetFrequencyHz, requestedBandwidthHz) {
        if (Number.isFinite(requestedBandwidthHz) && requestedBandwidthHz > 0) {
            return requestedBandwidthHz;
        }
        return Math.max(12, targetFrequencyHz * 0.08);
    }
    function bandpassSignalAroundTargetFrequency(signal, sampleRate, targetFrequencyHz, bandwidthHz) {
        const n = nextPow2(signal.length);
        const real = new Float64Array(n);
        const imag = new Float64Array(n);
        real.set(signal);
        fftRadix2(real, imag, false);
        const halfWidthHz = bandwidthHz / 2;
        for (let k = 0; k < n; k += 1) {
            const signedFrequencyHz = signedFrequencyResolve(k, n, sampleRate);
            if (Math.abs(Math.abs(signedFrequencyHz) - targetFrequencyHz) <= halfWidthHz)
                continue;
            real[k] = 0;
            imag[k] = 0;
        }
        fftRadix2(real, imag, true);
        return real.slice(0, signal.length);
    }
    function signedFrequencyResolve(binIndex, fftLength, sampleRate) {
        const frequency = (binIndex * sampleRate) / fftLength;
        return binIndex <= fftLength / 2 ? frequency : frequency - sampleRate;
    }
    function ringdownResultBuild(args) {
        var _a, _b;
        const fit = args.fitOverride || envelopeFitResultFromDecay(args.envelope, args.sampleRate, args.attackSkipMs, args.fitFloorDb);
        const qFrequencyHz = Number.isFinite(args.qFrequencyHz)
            ? args.qFrequencyHz
            : args.peakFrequencyHz;
        const Q = Number.isFinite(qFrequencyHz) && Number.isFinite(fit.tau)
            ? Math.PI * qFrequencyHz * fit.tau
            : null;
        const flags = flagsResolve(Q, args.deltaF, args.peakFrequencyHz, fit.envelopeR2);
        const downsampleStep = Math.max(1, Math.floor(args.envelope.length / 400));
        const envelopePreview = previewSeriesBuild(args.envelope, downsampleStep);
        const responsePreview = normalizedResponsePreviewBuild(args.response, downsampleStep);
        const timeAxis = timeAxisPreviewBuild(args.envelope.length, args.sampleRate, downsampleStep);
        return {
            f0: (_a = args.peakFrequencyHz) !== null && _a !== void 0 ? _a : null,
            tau: fit.tau,
            Q,
            deltaF: args.deltaF,
            envelopeR2: fit.envelopeR2,
            slope: fit.slope,
            fitStartSec: fit.fitStartSec,
            fitEndSec: fit.fitEndSec,
            flags,
            response: responsePreview,
            envelope: envelopePreview,
            envelopeFull: Array.from(args.envelope),
            timeAxis,
            dt: 1 / args.sampleRate,
            sampleRate: args.sampleRate,
            attackSkipMs: args.attackSkipMs,
            smoothWindowMs: args.smoothWindowMs,
            fitMethod: args.fitMethod || "envelope",
            isolationBandwidthHz: (_b = args.isolationBandwidthHz) !== null && _b !== void 0 ? _b : null,
        };
    }
    function previewSeriesBuild(series, downsampleStep) {
        const preview = [];
        for (let i = 0; i < series.length; i += downsampleStep)
            preview.push(Number(series[i]) || 0);
        return preview;
    }
    function normalizedResponsePreviewBuild(signal, downsampleStep) {
        const preview = previewSeriesBuild(signal, downsampleStep);
        const maxAbs = preview.reduce((max, value) => Math.max(max, Math.abs(value)), EPS);
        return preview.map((value) => value / maxAbs);
    }
    function timeAxisPreviewBuild(sampleCount, sampleRate, downsampleStep) {
        const preview = [];
        for (let i = 0; i < sampleCount; i += downsampleStep)
            preview.push(i / sampleRate);
        return preview;
    }
    function flagsResolve(Q, deltaF, peak, envelopeR2) {
        const flags = [];
        if (Number.isFinite(Q) && Q < 150)
            flags.push("low_Q");
        if (Number.isFinite(deltaF) && Number.isFinite(peak) && deltaF > peak * 0.03)
            flags.push("broad_peak");
        if (Number.isFinite(envelopeR2) && envelopeR2 < 0.85)
            flags.push("unstable_decay");
        return flags;
    }
    function analyzeRingdown({ buffer, sampleRate, f0 = null, spectrum = null, smoothWindowMs = 5, attackSkipMs = 40, }) {
        if (!buffer || !buffer.length || !Number.isFinite(sampleRate)) {
            throw new Error("Ring-down analysis requires audio buffer and sample rate");
        }
        const signal = meanRemovedSignalFromBuffer(buffer);
        const envelope = normalizedEnvelopeFromSignal(signal, sampleRate, smoothWindowMs);
        const peak = Number.isFinite(f0) ? f0 : findPeakFrequency(spectrum);
        const deltaF = spectrum ? findDeltaF(spectrum, peak) : null;
        return ringdownResultBuild({
            response: signal,
            envelope,
            sampleRate,
            smoothWindowMs,
            attackSkipMs,
            peakFrequencyHz: peak,
            deltaF,
            fitFloorDb: 26,
        });
    }
    function analyzeModeRingdown({ buffer, sampleRate, targetFrequencyHz, spectrum = null, modeBandwidthHz = null, smoothWindowMs = 5, attackSkipMs = 40, fitFloorDb = 26, }) {
        if (!buffer || !buffer.length || !Number.isFinite(sampleRate)) {
            throw new Error("Ring-down analysis requires audio buffer and sample rate");
        }
        if (!Number.isFinite(targetFrequencyHz) || targetFrequencyHz <= 0) {
            throw new Error("Mode ring-down analysis requires a finite, positive target frequency.");
        }
        const signal = meanRemovedSignalFromBuffer(buffer);
        const bandwidthHz = modeBandwidthResolve(targetFrequencyHz, modeBandwidthHz);
        const isolationBandwidthHz = Math.max(12, bandwidthHz * 4);
        const filteredSignal = bandpassSignalAroundTargetFrequency(signal, sampleRate, targetFrequencyHz, isolationBandwidthHz);
        const envelope = normalizedEnvelopeFromSignal(filteredSignal, sampleRate, smoothWindowMs);
        const envelopeFit = envelopeFitResultFromDecay(envelope, sampleRate, attackSkipMs, fitFloorDb);
        const directFit = dampedSinusoidFitFromEnvelopeWindow(filteredSignal, sampleRate, targetFrequencyHz, envelopeFit);
        const peak = spectrum
            ? localPeakFrequencyNearTarget(spectrum, targetFrequencyHz, bandwidthHz)
            : targetFrequencyHz;
        const deltaF = spectrum
            ? localDeltaFNearTarget(spectrum, targetFrequencyHz, bandwidthHz)
            : null;
        return ringdownResultBuild({
            response: filteredSignal,
            envelope,
            sampleRate,
            smoothWindowMs,
            attackSkipMs,
            peakFrequencyHz: peak !== null && peak !== void 0 ? peak : targetFrequencyHz,
            deltaF,
            fitFloorDb,
            fitOverride: directFit,
            qFrequencyHz: directFit ? directFit.frequencyHz : null,
            fitMethod: directFit ? "damped_sinusoid" : "envelope",
            isolationBandwidthHz,
        });
    }
    function dampedSinusoidFitFromEnvelopeWindow(signal, sampleRate, targetFrequencyHz, envelopeFit) {
        if (!Number.isFinite(envelopeFit.fitStartSec) || !Number.isFinite(envelopeFit.fitEndSec))
            return null;
        const fit = fitDampedSinusoid({
            signal,
            sampleRate,
            targetFrequencyHz,
            fitStartSec: envelopeFit.fitStartSec,
            fitEndSec: envelopeFit.fitEndSec,
            initialTau: envelopeFit.tau,
        });
        if (!Number.isFinite(fit.frequencyHz)
            || !Number.isFinite(fit.tau)
            || !Number.isFinite(fit.r2)
            || !Number.isFinite(fit.slope))
            return null;
        return {
            frequencyHz: fit.frequencyHz,
            tau: fit.tau,
            envelopeR2: fit.r2,
            slope: fit.slope,
            fitStartSec: envelopeFit.fitStartSec,
            fitEndSec: envelopeFit.fitEndSec,
        };
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.ModalRingdown = { analyzeRingdown, analyzeModeRingdown, fitDampedSinusoid };
})();
