// tools/wolf_note_analyzer/dist/core_dsp.js
function designBiquadLowpass(cutoffHz, sampleRate) {
  const { b0, b1, b2, a0, a1, a2 } = designBiquadLowpassRawCoeffs(cutoffHz, sampleRate);
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0
  };
}
function applyBiquad(input, coeffs) {
  const { out, state } = initBiquadOutput(input.length);
  return applyBiquadSamples(input, coeffs, state, out);
}
function demodulatePartial(wave, sampleRate, freq, bwHz, envLpHz) {
  const { iSig, qSig } = mixToBaseband(wave, sampleRate, freq);
  const lpCutoff = Math.max(5, bwHz);
  const iLp = lowpassSeries(iSig, lpCutoff, sampleRate);
  const qLp = lowpassSeries(qSig, lpCutoff, sampleRate);
  const envRaw = magnitudeSeries(iLp, qLp);
  return lowpassSeries(envRaw, envLpHz, sampleRate);
}
function designBiquadLowpassRawCoeffs(cutoffHz, sampleRate) {
  const { cosw0, sinw0 } = computeBiquadAngleTerms(cutoffHz, sampleRate);
  const alpha = computeBiquadLowpassAlpha(sinw0);
  const { b0, b1, b2 } = computeBiquadLowpassB(cosw0);
  const { a0, a1, a2 } = computeBiquadLowpassA(cosw0, alpha);
  return { b0, b1, b2, a0, a1, a2 };
}
function computeBiquadLowpassA(cosw0, alpha) {
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return { a0, a1, a2 };
}
function computeBiquadLowpassB(cosw0) {
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  return { b0, b1, b2 };
}
function computeBiquadLowpassAlpha(sinw0) {
  const Q = Math.SQRT1_2;
  return sinw0 / (2 * Q);
}
function computeBiquadAngleTerms(cutoffHz, sampleRate) {
  const w0 = 2 * Math.PI * cutoffHz / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  return { cosw0, sinw0 };
}
function initBiquadOutput(length) {
  return { out: new Float64Array(length), state: { z1: 0, z2: 0 } };
}
function applyBiquadSamples(input, coeffs, state, out) {
  for (let i = 0; i < input.length; i += 1) {
    out[i] = applyBiquadSample(input[i], coeffs, state);
  }
  return out;
}
function applyBiquadSample(x, coeffs, state) {
  const y = coeffs.b0 * x + state.z1;
  state.z1 = coeffs.b1 * x - coeffs.a1 * y + state.z2;
  state.z2 = coeffs.b2 * x - coeffs.a2 * y;
  return y;
}
function lowpassSeries(input, cutoffHz, sampleRate) {
  const coeffs = designBiquadLowpass(cutoffHz, sampleRate);
  return applyBiquad(input, coeffs);
}
function mixToBaseband(wave, sampleRate, freq) {
  const { iSig, qSig } = initBasebandMix(wave.length);
  fillBasebandMix(wave, sampleRate, freq, iSig, qSig);
  return { iSig, qSig };
}
function initBasebandMix(length) {
  return { iSig: new Float64Array(length), qSig: new Float64Array(length) };
}
function fillBasebandMix(wave, sampleRate, freq, iSig, qSig) {
  for (let n = 0; n < wave.length; n += 1) {
    writeBasebandSample(n, wave, sampleRate, freq, iSig, qSig);
  }
}
function writeBasebandSample(n, wave, sampleRate, freq, iSig, qSig) {
  const t = n / sampleRate;
  const w = wave[n];
  const phi = 2 * Math.PI * freq * t;
  iSig[n] = w * Math.cos(phi);
  qSig[n] = -w * Math.sin(phi);
}
function fillMagnitudeEnvelopeFromIQ(env, iSig, qSig, len) {
  for (let n = 0; n < len; n += 1) {
    env[n] = Math.hypot(iSig[n], qSig[n]);
  }
}
function magnitudeSeries(iSig, qSig) {
  const len = Math.min(iSig.length, qSig.length);
  const env = new Float64Array(len);
  fillMagnitudeEnvelopeFromIQ(env, iSig, qSig, len);
  return env;
}

// tools/wolf_note_analyzer/dist/core_math.js
function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}
function median(values) {
  return values.length ? medianFromSorted(values.slice().sort((a, b) => a - b)) : 0;
}
function medianFromSorted(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function seriesComputeMean(values) {
  if (!values.length)
    return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}
function seriesComputeMeanFromOptional(values, mean) {
  return Number.isFinite(mean) ? mean : seriesComputeMean(values);
}
function seriesComputeVariance(values, mean) {
  return seriesComputeVarianceFromMean(values, seriesComputeMeanFromOptional(values, mean));
}
function seriesComputeVarianceFromMean(values, mean) {
  if (!values.length)
    return 0;
  return seriesComputeVarianceSum(values, mean) / values.length;
}
function seriesComputeVarianceSum(values, mean) {
  return values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
}
function seriesComputeMeanSquare(values) {
  if (!values.length)
    return 0;
  return values.reduce((acc, v) => acc + v * v, 0) / values.length;
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
  if (Math.abs(denom) < 1e-12)
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

// tools/wolf_note_analyzer/dist/core_peaks.js
function refineParabolicPeak(freqs, ys, idx) {
  if (idx <= 0 || idx >= ys.length - 1)
    return null;
  const a = ys[idx - 1];
  const b = ys[idx];
  const c = ys[idx + 1];
  const bw = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
  if (!bw || !Number.isFinite(bw) || bw <= 0)
    return null;
  const denom = a - 2 * b + c;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12)
    return null;
  const delta = 0.5 * (a - c) / denom;
  const clamped = Math.max(-1, Math.min(1, delta));
  const freq = freqs[idx] + clamped * bw;
  const y = b - (a - c) * clamped / 4;
  return { freq, y, delta: clamped };
}
function analyzeModes(spectrum, bands) {
  const { freqs, dbs } = spectrum;
  return Object.entries(bands).map(([key, band]) => modeResultFromBand(key, band, freqs, dbs));
}
function estimateQFromDb(freqs, dbs, peak) {
  return qFromPeakDbIfAvailable(freqs, dbs, peakFrequencyAndDb(peak));
}
function modeBandWidth(freq) {
  return Math.max(40, freq * 0.03);
}
function partialBandWidth(partialKey, freq) {
  if (partialKey === "h2" || partialKey === "h3")
    return Math.max(40, freq * 0.04);
  return Math.max(40, freq * 0.03);
}
function bandOverlapRatio(f1, bw1, f2, bw2) {
  const [half1, half2] = [bw1 / 2, bw2 / 2];
  const left = Math.max(f1 - half1, f2 - half2);
  const right = Math.min(f1 + half1, f2 + half2);
  const overlap = Math.max(0, right - left);
  const denom = Math.max(1e-6, Math.min(bw1, bw2));
  return overlap / denom;
}
function collectBandPeaks(freqs, dbs, band) {
  const peaks = [];
  for (let i = 1; i < freqs.length - 1; i += 1) {
    if (!(dbs[i] > dbs[i - 1] && dbs[i] > dbs[i + 1]))
      continue;
    const f = freqs[i];
    if (f < band.low || f > band.high)
      continue;
    const start = Math.max(0, i - 6);
    const end = Math.min(dbs.length - 1, i + 6);
    const neighbors = dbs.slice(start, end + 1);
    neighbors.splice(i - start, 1);
    const baseline = neighbors.length ? median(neighbors) : dbs[i];
    const prominence = dbs[i] - baseline;
    peaks.push({ idx: i, db: dbs[i], prominence });
  }
  return peaks;
}
function pickPeakByDbReducer(best, peak) {
  return peak.db > best.db ? peak : best;
}
function pickPeakByDb(peaks) {
  if (!peaks.length)
    return null;
  return peaks.reduce(pickPeakByDbReducer, peaks[0]);
}
function modeResultFromPeak(mode, freqs, dbs, peak) {
  const refined = refineParabolicPeak(freqs, dbs, peak.idx);
  return refined ? {
    mode,
    peakFreq: refined.freq,
    peakDb: refined.y,
    peakIdx: peak.idx,
    prominenceDb: peak.prominence
  } : {
    mode,
    peakFreq: freqs[peak.idx],
    peakDb: dbs[peak.idx],
    peakIdx: peak.idx,
    prominenceDb: peak.prominence
  };
}
function modeResultFromBand(modeKey, band, freqs, dbs) {
  const peaks = collectBandPeaks(freqs, dbs, band);
  const primary = pickPeakByDb(peaks);
  return modeResultFromPrimaryPeak(modeKey, freqs, dbs, primary);
}
function modeResultFromPrimaryPeak(modeKey, freqs, dbs, primary) {
  return primary ? modeResultFromPeak(modeKey, freqs, dbs, primary) : { mode: modeKey, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
}
function findNearestIndex(values, target) {
  return scanNearestIndex(values, target);
}
function scanNearestIndex(values, target) {
  return scanNearestIndexState(values, target).idx;
}
function scanNearestIndexState(values, target) {
  return reduceNearestState(values, target, { idx: 0, bestDist: Infinity });
}
function reduceNearestState(values, target, state) {
  for (let i = 0; i < values.length; i += 1) {
    state = updateNearestState(state, values[i], i, target);
  }
  return state;
}
function updateNearestState(state, value, idx, target) {
  const dist = Math.abs(value - target);
  if (dist >= state.bestDist)
    return state;
  return { idx, bestDist: dist };
}
function findLeftCrossing(freqs, dbs, idx, cutoff) {
  const left = scanLeftIndexForCutoff(dbs, idx, cutoff);
  return left === idx ? null : interpolateDbCrossing(freqs, dbs, cutoff, left, Math.min(left + 1, freqs.length - 1));
}
function scanLeftIndexForCutoff(dbs, startIdx, cutoff) {
  let left = startIdx;
  for (; left > 0 && dbs[left] > cutoff; left -= 1) {
  }
  return left;
}
function findRightCrossing(freqs, dbs, idx, cutoff) {
  const right = scanRightIndexForCutoff(dbs, idx, cutoff);
  return right === idx ? null : interpolateDbCrossing(freqs, dbs, cutoff, Math.max(0, right - 1), right);
}
function scanRightIndexForCutoff(dbs, startIdx, cutoff) {
  let right = startIdx;
  for (; right < dbs.length - 1 && dbs[right] > cutoff; right += 1) {
  }
  return right;
}
function interpolateDbCrossing(freqs, dbs, cutoff, i0, i1) {
  const sample = crossingSamples(freqs, dbs, i0, i1);
  if (!sample)
    return null;
  const t = interpolationFraction(cutoff, sample.yA, sample.yB);
  return t === null ? null : interpolateSample(sample, t);
}
function interpolateSample(sample, t) {
  const tt = Math.max(0, Math.min(1, t));
  return sample.fA + tt * (sample.fB - sample.fA);
}
function crossingSamples(freqs, dbs, i0, i1) {
  const fA = freqs[i0];
  const fB = freqs[i1];
  const yA = dbs[i0];
  const yB = dbs[i1];
  return finiteCrossingSamples(fA, fB, yA, yB);
}
function finiteCrossingSamples(fA, fB, yA, yB) {
  if (!Number.isFinite(fA) || !Number.isFinite(fB) || !Number.isFinite(yA) || !Number.isFinite(yB))
    return null;
  return { fA, fB, yA, yB };
}
function interpolationFraction(cutoff, yA, yB) {
  const t = (cutoff - yA) / (yB - yA);
  return Number.isFinite(t) ? t : null;
}
function qFromPeakDbIfAvailable(freqs, dbs, peakValues) {
  if (!peakValues)
    return null;
  return qFromPeakDb(freqs, dbs, peakValues.f0, peakValues.peakDb);
}
function peakFrequencyAndDb(peak) {
  const { freq: f0, db: peakDb } = peak;
  return peakFrequencyAndDbIfFinite(f0, peakDb);
}
function peakFrequencyAndDbIfFinite(f0, peakDb) {
  if (!Number.isFinite(f0) || !Number.isFinite(peakDb))
    return null;
  return peakFrequencyAndDbFromValues(f0, peakDb);
}
function peakFrequencyAndDbFromValues(f0, peakDb) {
  return { f0, peakDb };
}
function qFromPeakDb(freqs, dbs, f0, peakDb) {
  const cutoff = cutoffDbFromPeak(peakDb);
  const idx = peakIndexFromFrequency(freqs, f0);
  const crossings = crossingFrequenciesForCutoff(freqs, dbs, idx, cutoff);
  return qFromCrossingsIfAvailable(f0, crossings);
}
function qFromCrossingsIfAvailable(f0, crossings) {
  if (!crossings)
    return null;
  return qFromCrossings(f0, crossings.leftF, crossings.rightF);
}
function cutoffDbFromPeak(peakDb) {
  return peakDb - 3;
}
function peakIndexFromFrequency(freqs, f0) {
  return findNearestIndex(freqs, f0);
}
function crossingFrequenciesForCutoff(freqs, dbs, idx, cutoff) {
  const leftF = findLeftCrossing(freqs, dbs, idx, cutoff);
  const rightF = findRightCrossing(freqs, dbs, idx, cutoff);
  return crossingsFromOptionalFrequencies(leftF, rightF);
}
function crossingsFromOptionalFrequencies(leftF, rightF) {
  if (!Number.isFinite(leftF) || !Number.isFinite(rightF))
    return null;
  return { leftF, rightF };
}
function qFromCrossings(f0, leftF, rightF) {
  const bw = Math.max(1e-6, Math.abs(rightF - leftF));
  return qFromBandwidth(f0, bw);
}
function qFromBandwidth(f0, bw) {
  return qFromValidatedValue(qFromBandwidthValue(f0, bw));
}
function qFromBandwidthValue(f0, bw) {
  return f0 / bw;
}
function qFromValidatedValue(q) {
  if (!Number.isFinite(q) || q <= 0)
    return null;
  return q;
}

// tools/wolf_note_analyzer/dist/core_envelope.js
var LATE_WINDOW_MS = { start: 200, end: 800 };
var LATE_PERSISTENCE_MIN = 0.08;
var LATE_CV_MAX = 0.6;
function normalizeEnvelope(env) {
  var _a;
  const len = (_a = env === null || env === void 0 ? void 0 : env.length) !== null && _a !== void 0 ? _a : 0;
  if (!len)
    return [];
  let maxEnv = 1e-9;
  for (let i = 0; i < len; i += 1) {
    const v = env[i];
    if (Number.isFinite(v) && v > maxEnv)
      maxEnv = v;
  }
  const out = new Array(len);
  for (let i = 0; i < len; i += 1) {
    const v = env[i];
    out[i] = Number.isFinite(v) ? v / maxEnv : 0;
  }
  return out;
}
function lateWindowIndices(t) {
  if (!t.length)
    return { startIdx: 0, endIdx: -1 };
  return lateWindowIndicesFromNonEmptyTimes(t);
}
function lateTimeStats(env, t) {
  return lateStatsFromEnvelopeWindow(env, t);
}
function lateTimeSlope(env, t) {
  if (!env.length || !t.length)
    return null;
  return slopeFromLateSlices(lateWindowSlicesForTimes(env, t));
}
function prepareEnvelopeForFit(envelope, dt, opts) {
  const env = trimmedEnvelopeForFit(envelope, dt, opts);
  const tArr = buildTimeAxis(env.length, dt);
  return { env, tArr };
}
function timelineDeriveLateWindowDurations(t) {
  const { startIdx, endIdx } = lateWindowIndices(t);
  const { lateStart, lateEnd } = lateWindowEndpoints(t, startIdx, endIdx);
  const lateDurationSec = Math.max(0, lateEnd - lateStart);
  const lateDurationMs = lateDurationSec * 1e3;
  return { lateDurationSec, lateDurationMs };
}
function lateWindowIndicesFromNonEmptyTimes(t) {
  const { startSec, endSec } = lateWindowSeconds();
  const startIdx = lateWindowStartIndex(t, startSec);
  const endIdx = lateWindowEndIndexAfterStart(t, endSec, startIdx);
  return { startIdx, endIdx };
}
function lateWindowEndIndexAfterStart(t, endSec, startIdx) {
  const candidate = lateWindowEndIndex(t, endSec);
  return lateWindowEndIndexAfterStartFromCandidate(candidate, startIdx, t.length);
}
function lateWindowEndIndexAfterStartFromCandidate(candidate, startIdx, length) {
  return candidate <= startIdx ? length - 1 : candidate;
}
function lateWindowEndIndex(t, endSec) {
  const candidate = t.findIndex((v) => v >= endSec);
  return lateWindowEndIndexFromCandidate(candidate, t.length);
}
function lateWindowEndIndexFromCandidate(candidate, length) {
  return candidate < 0 ? length - 1 : candidate;
}
function lateWindowStartIndex(t, startSec) {
  const candidate = t.findIndex((v) => v >= startSec);
  return lateWindowStartIndexFromCandidate(candidate, t.length);
}
function lateWindowStartIndexFromCandidate(candidate, length) {
  return candidate < 0 ? lateWindowStartFallbackIndex(length) : candidate;
}
function lateWindowStartFallbackIndex(length) {
  return Math.max(0, Math.floor(length * 0.6));
}
function lateWindowSeconds() {
  return {
    startSec: LATE_WINDOW_MS.start / 1e3,
    endSec: LATE_WINDOW_MS.end / 1e3
  };
}
function lateStatsFallback() {
  return { mean: 0, cv: 1, stable: false };
}
function lateStatsFromSlice(slice) {
  const mean = seriesComputeMean(slice);
  const variance = seriesComputeVariance(slice, mean);
  const cv = Math.sqrt(variance) / Math.max(1e-9, mean);
  const stable = mean >= LATE_PERSISTENCE_MIN && cv <= LATE_CV_MAX;
  return { mean, cv, stable };
}
function lateWindowIndicesIfOrdered(indices) {
  if (indices.endIdx < indices.startIdx)
    return null;
  return indices;
}
function lateWindowIndicesFromTimesInner(t) {
  if (!t.length)
    return null;
  return lateWindowIndicesIfOrdered(lateWindowIndices(t));
}
function lateWindowIndicesFromTimes(t) {
  return lateWindowIndicesFromTimesInner(t);
}
function lateWindowIndicesFromWindow(t) {
  return lateWindowIndicesFromTimes(t);
}
function lateWindowSliceIndices(t) {
  return lateWindowIndicesFromWindow(t);
}
function lateStatsSliceFromWindow(env, t) {
  if (!env.length)
    return null;
  return lateStatsSliceFromWindowIndices(env, t);
}
function lateStatsSliceFromWindowIndices(env, t) {
  const indices = lateWindowSliceIndices(t);
  return lateStatsSliceFromOptionalIndices(env, indices);
}
function lateStatsSliceFromOptionalIndices(env, indices) {
  if (!indices)
    return null;
  return lateStatsSliceFromIndices(env, indices);
}
function lateStatsSliceFromIndices(env, indices) {
  const slice = env.slice(indices.startIdx, indices.endIdx + 1);
  return nonEmptySliceOrNull(slice);
}
function nonEmptySliceOrNull(slice) {
  if (!slice.length)
    return null;
  return slice;
}
function lateStatsFromOptionalSlice(slice) {
  if (!slice)
    return lateStatsFallback();
  return lateStatsFromSlice(slice);
}
function lateStatsFromEnvelopeWindow(env, t) {
  const slice = lateStatsSliceFromWindow(env, t);
  return lateStatsFromOptionalSlice(slice);
}
function slopeFromLateSlices(slices) {
  if (!slices)
    return null;
  return slopeFromRegression(regressionForLateSlices(slices));
}
function regressionForLateSlices(slices) {
  const logEnv = logEnvelopeForRegression(slices.envSlice);
  return linearRegression(slices.tSlice, logEnv);
}
function slopeFromRegression(reg) {
  return Number.isFinite(reg === null || reg === void 0 ? void 0 : reg.slope) ? reg === null || reg === void 0 ? void 0 : reg.slope : null;
}
function lateWindowSlicesForTimes(env, t) {
  return lateWindowSlicesForOptionalIndices(env, t, lateWindowIndicesOrNull(t));
}
function lateWindowSlicesForOptionalIndices(env, t, indices) {
  if (!indices)
    return null;
  return lateWindowSlices(env, t, indices.startIdx, indices.endIdx);
}
function lateWindowIndicesOrNull(t) {
  const indices = lateWindowIndices(t);
  return indices.endIdx < indices.startIdx ? null : indices;
}
function logEnvelopeForRegression(envSlice) {
  return envSlice.map((v) => Math.log(Math.max(v, 1e-9)));
}
function lateWindowSlices(env, t, startIdx, endIdx) {
  return lateWindowSlicesFromBounds(env, t, startIdx, endIdx);
}
function lateWindowSlicesFromBounds(env, t, startIdx, endIdx) {
  const slices = windowSlicesFromBounds(env, t, startIdx, endIdx);
  return validWindowSlices(slices);
}
function windowSlicesFromBounds(env, t, startIdx, endIdx) {
  return {
    envSlice: env.slice(startIdx, endIdx + 1),
    tSlice: t.slice(startIdx, endIdx + 1)
  };
}
function validWindowSlices(slices) {
  if (!slices.envSlice.length || slices.envSlice.length !== slices.tSlice.length)
    return null;
  return slices;
}
function buildTimeAxis(length, dt) {
  return Array.from({ length }, (_, i) => i * dt);
}
function trimmedEnvelopeForFit(envelope, dt, opts) {
  const { attackSkipMs, maxAnalysisMs } = envelopeFitOptions(opts);
  const attackSkip = attackSkipSamples(envelope.length, attackSkipMs, dt);
  let env = envelope.slice(attackSkip);
  env = trimEnvelopeToMaxAnalysis(env, maxAnalysisMs, dt);
  return trimEnvelopeTail(env);
}
function trimEnvelopeTail(env) {
  const thresh = envelopeTailThreshold(env);
  const lastIdx = lastIndexAboveThreshold(env, thresh);
  return env.slice(0, envelopeTrimLength(lastIdx));
}
function envelopeTrimLength(lastIdx) {
  return Math.max(lastIdx + 1, 16);
}
function lastIndexAboveThreshold(env, thresh) {
  return lastIndexAboveThresholdFromEnd(env, thresh);
}
function lastIndexAboveThresholdFromEnd(envelope, threshold) {
  return scanLastIndexAboveThresholdFromEnd(envelope, threshold);
}
function scanLastIndexAboveThresholdFromEnd(envelope, threshold) {
  let lastIndex = envelope.length - 1;
  for (let index = envelope.length - 1; index >= 0; index -= 1) {
    if (envelope[index] >= threshold) {
      lastIndex = index;
      break;
    }
  }
  return lastIndex;
}
function envelopeTailThreshold(env) {
  const peak = env.reduce((m, v) => Math.max(m, v), 0);
  return peak * 0.05;
}
function trimEnvelopeToMaxAnalysis(env, maxAnalysisMs, dt) {
  if (!maxAnalysisMs)
    return env;
  return env.slice(0, envelopeMaxSamples(maxAnalysisMs, dt));
}
function envelopeMaxSamples(maxAnalysisMs, dt) {
  return Math.max(8, Math.round(maxAnalysisMs / 1e3 / dt));
}
function attackSkipSamples(length, attackSkipMs, dt) {
  return Math.min(length, Math.round(attackSkipMs / 1e3 / dt));
}
function envelopeFitOptions(opts) {
  var _a, _b;
  return {
    attackSkipMs: (_a = opts.attackSkipMs) !== null && _a !== void 0 ? _a : 100,
    maxAnalysisMs: (_b = opts.maxAnalysisMs) !== null && _b !== void 0 ? _b : 2e3
  };
}
function lateWindowEndpoints(t, startIdx, endIdx) {
  const lateStart = safeTimeValue(t, startIdx, LATE_WINDOW_MS.start / 1e3);
  const lateEnd = safeTimeValue(t, endIdx, LATE_WINDOW_MS.end / 1e3);
  return { lateStart, lateEnd };
}
function safeTimeValue(t, idx, fallback) {
  return Number.isFinite(t[idx]) ? t[idx] : fallback;
}

// tools/wolf_note_analyzer/dist/core_two_mode_fit_wobble_metrics_and_instability.js
var BEAT_RATE_MIN = 0.8;
var COUPLING_CENTS_STRONG = 25;
var COUPLING_CENTS_POSSIBLE = 50;
var DOMINANCE_OVERLAP_MAX = 0.45;
var WOBBLE_DEPTH_MIN = 0.08;
var DETRENDED_VARIANCE_MIN = 1e-7;
var WOBBLE_DEPTH_SCORE_SCALE = 0.4;
var BEAT_RATE_SCORE_SCALE_HZ = 4;
var WOLF_MIN_DURATION_MS = 220;
var WOLF_MIN_CYCLES = 1.5;
function hannWeight(i, n) {
  if (n <= 1)
    return 1;
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
}
function applyHannExpWindow(values, decay) {
  const n = values.length;
  return values.map((v, i) => {
    const t = i / Math.max(1, n - 1);
    return v * hannWeight(i, n) * Math.exp(-decay * t);
  });
}
function centerSeries(values) {
  const mean = seriesComputeMean(values);
  return { centered: values.map((v) => v - mean), mean };
}
function estimateDeltaF(detEnv, dt, minHz = 0.5) {
  const n = detEnv.length;
  if (n < 8)
    return 0;
  const maxHz = 12;
  const step = 0.01;
  let bestF = 0;
  let bestMag = -Infinity;
  for (let f = minHz; f <= maxHz; f += step) {
    let re = 0;
    let im = 0;
    const w = 2 * Math.PI * f;
    for (let i = 0; i < n; i += 1) {
      const t = i * dt;
      const ang = w * t;
      re += detEnv[i] * Math.cos(ang);
      im -= detEnv[i] * Math.sin(ang);
    }
    const mag = Math.sqrt(re * re + im * im);
    if (mag > bestMag) {
      bestMag = mag;
      bestF = f;
    }
  }
  return bestF;
}
function seriesTrailingMean(arr, win) {
  const n = arr.length;
  const out = new Array(n).fill(0);
  return fillTrailingMeanSamples(arr, win, out);
}
function fillTrailingMeanSamples(arr, win, out) {
  const state = { acc: 0 };
  arr.forEach((_, i) => {
    const step = trailingMeanStep(state.acc, arr, i, win);
    state.acc = step.acc;
    out[i] = step.mean;
  });
  return out;
}
function trailingMeanStep(acc, arr, i, win) {
  const nextAcc = i >= win ? acc + arr[i] - arr[i - win] : acc + arr[i];
  return { acc: nextAcc, mean: nextAcc / Math.min(i + 1, win) };
}
function fitDecayFromEnvelope(env, tArr) {
  const logEnv = buildLogEnvelope(env);
  const reg = linearRegression(tArr, logEnv);
  const alpha = decayAlphaFromRegression(reg);
  const A0 = decayAmplitudeFromRegression(reg, env);
  const detrended = env.map((v, i) => v * Math.exp(alpha * tArr[i]) / A0);
  return { alpha, A0, detrended };
}
function buildLogEnvelope(env) {
  return env.map((v) => Math.log(Math.max(v, 1e-12)));
}
function decayAlphaFromRegression(reg) {
  return (reg === null || reg === void 0 ? void 0 : reg.slope) ? -Math.min(reg.slope, 0) : 0;
}
function decayAmplitudeFromRegression(reg, env) {
  return reg ? Math.exp(reg.intercept) : Math.max(env[0] || 1, 1e-6);
}
function trimWobbleWindow(env, tArr, detrended) {
  const peakDet = detrended.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const wobbleEnd = wobbleEndIndex(detrended, peakDet);
  return {
    env: env.slice(0, wobbleEnd + 1),
    tArr: tArr.slice(0, wobbleEnd + 1),
    detrended: detrended.slice(0, wobbleEnd + 1),
    peakDet
  };
}
function wobbleEndIndex(detrended, peakDet) {
  const wobbleThresh = peakDet * 0.05;
  const wobbleEnd = findWobbleEndIndex(detrended, wobbleThresh);
  return Math.max(wobbleEnd, 15);
}
function findWobbleEndIndex(detrended, wobbleThresh) {
  for (let index = detrended.length - 1; index >= 0; index -= 1) {
    if (Math.abs(detrended[index]) >= wobbleThresh)
      return index;
  }
  return detrended.length - 1;
}
function estimateWobbleFrequency(detrended, dt, peakDet) {
  const n = detrended.length;
  const envWeight = applyHannExpWindow(detrended, 3);
  const windowSec = n * dt;
  const dynamicMinHz = wobbleMinFrequencyHz(windowSec, peakDet);
  const { resVar, resWeight } = wobbleResidualStats(detrended, dt);
  return selectDeltaFFromResidualAndEnv(resVar, resWeight, envWeight, dt, dynamicMinHz);
}
function selectDeltaFFromResidualAndEnv(resVar, resWeight, envWeight, dt, dynamicMinHz) {
  const deltaFResidual = residualDeltaF(resVar, resWeight, dt);
  const deltaFEnv = estimateDeltaF(envWeight, dt, dynamicMinHz);
  return deltaFResidual > 0 ? deltaFResidual : deltaFEnv;
}
function residualDeltaF(resVar, resWeight, dt) {
  return resVar > 1e-7 ? estimateDeltaF(resWeight, dt, 2) : 0;
}
function wobbleMinFrequencyHz(windowSec, peakDet) {
  return windowSec <= 1.5 && peakDet > 0.01 ? 1.5 : 0.5;
}
function wobbleResidualStats(detrended, dt) {
  const smoothWin = Math.max(3, Math.round(0.05 / dt));
  const slowTrend = seriesTrailingMean(detrended, smoothWin);
  const residual = detrended.map((v, i) => v - slowTrend[i]);
  const centered = centerSeries(residual).centered;
  return {
    resVar: seriesComputeMeanSquare(centered),
    resWeight: applyHannExpWindow(centered, 3)
  };
}
function fitWobbleSinusoid(detrended, tArr, deltaF) {
  const w = 2 * Math.PI * deltaF;
  const sums = wobbleSinusoidSums(detrended, tArr, w);
  const { r, phi } = wobbleSinusoidParams(sums);
  return { w, r, phi };
}
function wobbleSinusoidParams(sums) {
  const { A, B } = wobbleSinusoidCoefficients(sums);
  const amplitude = Math.sqrt(A * A + B * B);
  const phi = Math.atan2(-B, A);
  const r = Math.max(0, amplitude);
  return { r, phi };
}
function wobbleSinusoidCoefficients(sums) {
  const det = sums.cosSquaredSum * sums.sinSquaredSum - sums.sinCosSum * sums.sinCosSum || 1e-9;
  const A = (sums.yCosSum * sums.sinSquaredSum - sums.ySinSum * sums.sinCosSum) / det;
  const B = (sums.ySinSum * sums.cosSquaredSum - sums.yCosSum * sums.sinCosSum) / det;
  return { A, B };
}
function wobbleSinusoidSums(detrended, tArr, w) {
  let { cosSquaredSum, sinSquaredSum, sinCosSum, yCosSum, ySinSum } = wobbleSinusoidSumsInit();
  return wobbleSinusoidSumsFromLoop(detrended, tArr, w, {
    cosSquaredSum,
    sinSquaredSum,
    sinCosSum,
    yCosSum,
    ySinSum
  });
}
function wobbleSinusoidSumsFromLoop(detrended, tArr, w, state) {
  return wobbleSinusoidSumsFromLoopState(detrended, tArr, w, state);
}
function wobbleSinusoidSumsFromLoopState(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopData(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopData(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromIterations(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromIterations(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopCore(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopCore(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopCoreInner(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopCoreInner(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterations(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterations(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterationsBody(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterationsBody(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterationsCore(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterationsCore(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreInner(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterationsCoreInner(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreBody(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterationsCoreBody(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInner(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInner(detrended, tArr, w, state) {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInnerLoop(detrended, tArr, w, state);
}
function wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInnerLoop(detrended, tArr, w, state) {
  for (let i = 0; i < detrended.length; i += 1) {
    state = wobbleSinusoidSumsStateStep(state, detrended, tArr, w, i);
  }
  return wobbleSinusoidSumsFromState(state.cosSquaredSum, state.sinSquaredSum, state.sinCosSum, state.yCosSum, state.ySinSum);
}
function wobbleSinusoidSumsStateStep(state, detrended, tArr, w, i) {
  return wobbleSinusoidSumsStep(state.cosSquaredSum, state.sinSquaredSum, state.sinCosSum, state.yCosSum, state.ySinSum, detrended, tArr, w, i);
}
function wobbleSinusoidSumsInit() {
  return {
    cosSquaredSum: 0,
    sinSquaredSum: 0,
    sinCosSum: 0,
    yCosSum: 0,
    ySinSum: 0
  };
}
function wobbleSinusoidSumsFromState(cosSquaredSum, sinSquaredSum, sinCosSum, yCosSum, ySinSum) {
  return { cosSquaredSum, sinSquaredSum, sinCosSum, yCosSum, ySinSum };
}
function wobbleSinusoidSumsStep(cosSquaredSum, sinSquaredSum, sinCosSum, yCosSum, ySinSum, detrended, tArr, w, i) {
  const t = tArr[i];
  const c = Math.cos(w * t);
  const s = Math.sin(w * t);
  const y = detrended[i];
  return {
    cosSquaredSum: cosSquaredSum + c * c,
    sinSquaredSum: sinSquaredSum + s * s,
    sinCosSum: sinCosSum + c * s,
    yCosSum: yCosSum + y * c,
    ySinSum: ySinSum + y * s
  };
}
function buildFittedEnvelope(env, tArr, A0, alpha, w, r, phi) {
  return env.map((_, i) => {
    const t = tArr[i];
    return A0 * Math.exp(-alpha * t) * (1 + r * Math.cos(w * t + phi));
  });
}
function scoreEnvelopeFit(env, fitted) {
  const maxEnv = env.reduce((m, v) => Math.max(m, v), 1e-9);
  const envNorm = normalizeSeriesByMax(env, maxEnv);
  const fitNorm = normalizeSeriesByMax(fitted, maxEnv);
  const meanY = seriesComputeMean(envNorm);
  const { ssTot, ssRes } = envelopeFitSums(envNorm, fitNorm, meanY);
  return envelopeFitStats(ssTot, ssRes, envNorm.length);
}
function normalizeSeriesByMax(values, maxValue) {
  return values.map((v) => v / maxValue);
}
function envelopeFitStats(ssTot, ssRes, sampleCount) {
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const residualVar = ssRes / Math.max(1, sampleCount);
  return { r2, residualVar };
}
function envelopeFitSums(envNorm, fitNorm, meanY) {
  const totals = { ssTot: 0, ssRes: 0 };
  envNorm.forEach((envValue, i) => {
    const next = envelopeFitSumsStep(envValue, fitNorm[i], meanY, totals.ssTot, totals.ssRes);
    totals.ssTot = next.ssTot;
    totals.ssRes = next.ssRes;
  });
  return totals;
}
function envelopeFitSumsStep(envValue, fitValue, meanY, ssTot, ssRes) {
  const diffTot = envValue - meanY;
  const diffRes = envValue - fitValue;
  return {
    ssTot: ssTot + diffTot * diffTot,
    ssRes: ssRes + diffRes * diffRes
  };
}
function categorizeWolfScore(score) {
  if (score < 0.1)
    return "None";
  return categorizeWolfScoreFromMild(score);
}
function categorizeWolfScoreFromMild(score) {
  if (score < 0.25)
    return "Mild";
  return categorizeWolfScoreFromModerate(score);
}
function categorizeWolfScoreFromModerate(score) {
  if (score < 0.45)
    return "Moderate";
  return categorizeWolfScoreFromStrong(score);
}
function categorizeWolfScoreFromStrong(score) {
  return score < 0.7 ? "Strong" : "Severe";
}
function detrendedVarianceFromWobbleWindow(wobble) {
  return seriesComputeVariance(wobble.detrended);
}
function lowSignalTwoModeFitResult(alpha, detrendedVariance) {
  return {
    deltaF: 0,
    wobbleDepth: 0,
    alpha,
    r2: 0,
    residualVar: detrendedVariance || 0,
    wolfScore: 0,
    category: "None"
  };
}
function wobbleParamsFromWindow(wobble, dt) {
  const deltaF = estimateWobbleFrequency(wobble.detrended, dt, wobble.peakDet);
  const { w, r, phi } = fitWobbleSinusoid(wobble.detrended, wobble.tArr, deltaF);
  return { deltaF, w, wobbleDepth: r, phi };
}
function fittedEnvelopeFromDecayAndWobbleParams(wobble, decay, wobbleParams) {
  return buildFittedEnvelope(wobble.env, wobble.tArr, decay.A0, decay.alpha, wobbleParams.w, wobbleParams.wobbleDepth, wobbleParams.phi);
}
function wolfMetricsFromFit(deltaF, wobbleDepth, r2) {
  const wobbleDepthScore = clamp01(wobbleDepth / WOBBLE_DEPTH_SCORE_SCALE);
  const beatRateScore = clamp01(deltaF / BEAT_RATE_SCORE_SCALE_HZ);
  const wolfScore = wobbleDepthScore * beatRateScore * r2;
  const category = categorizeWolfScore(wolfScore);
  return { wolfScore, category };
}
function prepareTwoModeFitInputs(envelope, dt, opts) {
  const prepared = prepareEnvelopeForFit(envelope, dt, opts);
  const decay = fitDecayFromEnvelope(prepared.env, prepared.tArr);
  const wobble = trimWobbleWindow(prepared.env, prepared.tArr, decay.detrended);
  const detrendedVariance = detrendedVarianceFromWobbleWindow(wobble);
  return { prepared, decay, wobble, detrendedVariance };
}
function fitTwoModeEnvelopeAndComputeWolfMetrics(envelope, dt, opts = {}) {
  ensureNonEmptyEnvelope(envelope);
  const inputs = prepareTwoModeFitInputs(envelope, dt, opts);
  return deriveTwoModeFitResult(inputs, dt);
}
function fitTwoModeWolfMetricsFromInputs(inputs, dt) {
  const wobbleParams = wobbleParamsFromWindow(inputs.wobble, dt);
  const fitted = fittedEnvelopeFromDecayAndWobbleParams(inputs.wobble, inputs.decay, wobbleParams);
  const { r2, residualVar } = scoreEnvelopeFit(inputs.wobble.env, fitted);
  const { wolfScore, category } = wolfMetricsFromFit(wobbleParams.deltaF, wobbleParams.wobbleDepth, r2);
  return { wobbleParams, r2, residualVar, wolfScore, category };
}
function deriveTwoModeFitResult(inputs, dt) {
  return isLowSignalTwoModeFit(inputs) ? lowSignalTwoModeFitResultFromInputs(inputs) : buildFitTwoModeResult(fitTwoModeWolfMetricsFromInputs(inputs, dt), inputs.decay.alpha);
}
function isLowSignalTwoModeFit(inputs) {
  return inputs.detrendedVariance < DETRENDED_VARIANCE_MIN || !Number.isFinite(inputs.detrendedVariance);
}
function lowSignalTwoModeFitResultFromInputs(inputs) {
  return lowSignalTwoModeFitResult(inputs.decay.alpha, inputs.detrendedVariance);
}
function ensureNonEmptyEnvelope(envelope) {
  if (!(envelope === null || envelope === void 0 ? void 0 : envelope.length))
    throw new Error("Empty envelope");
}
function buildFitTwoModeResult(metrics, alpha) {
  return {
    deltaF: metrics.wobbleParams.deltaF,
    wobbleDepth: metrics.wobbleParams.wobbleDepth,
    alpha,
    r2: metrics.r2,
    residualVar: metrics.residualVar,
    wolfScore: metrics.wolfScore,
    category: metrics.category
  };
}
function fitTwoMode(envelope, dt, opts = {}) {
  return fitTwoModeEnvelopeAndComputeWolfMetrics(envelope, dt, opts);
}
function couplingTier(centsAbs) {
  return couplingTierFromCentsAbs(centsAbs);
}
function couplingTierFromCentsAbs(centsAbs) {
  if (!Number.isFinite(centsAbs))
    return "none";
  return couplingTierFromFiniteCents(centsAbs);
}
function couplingTierFromFiniteCents(centsAbs) {
  if (centsAbs <= COUPLING_CENTS_STRONG)
    return "strong";
  return couplingTierFromPossibleCents(centsAbs);
}
function couplingTierFromPossibleCents(centsAbs) {
  return centsAbs <= COUPLING_CENTS_POSSIBLE ? "possible" : "none";
}
function confidenceFrom(centsAbs, lateStable, overlapRatio, source) {
  if (!Number.isFinite(centsAbs))
    return "Low";
  const strong = centsAbs <= COUPLING_CENTS_STRONG;
  const possible = centsAbs <= COUPLING_CENTS_POSSIBLE;
  const overlapOk = Number.isFinite(overlapRatio) ? overlapRatio <= DOMINANCE_OVERLAP_MAX : true;
  let confidence = "Low";
  if (strong && lateStable && overlapOk)
    confidence = "High";
  else if (strong && lateStable || possible && lateStable && overlapOk)
    confidence = "Medium";
  if (source === "Inferred") {
    if (confidence === "High")
      confidence = "Medium";
    else if (confidence === "Medium")
      confidence = "Low";
  }
  return confidence;
}
function analyzePartialInstability(env, dt, lateDurationSec, lateDurationMs) {
  return env.length ? instabilityFromEnvelope(env, dt, lateDurationSec, lateDurationMs) : { unstable: false, beatRate: null, wobbleDepth: null, stability: null };
}
function instabilityFromEnvelope(env, dt, lateDurationSec, lateDurationMs) {
  const res = fitTwoMode(env, dt, { attackSkipMs: 40, maxAnalysisMs: 2e3 });
  const unstable = instabilityFromFit(res, lateDurationSec, lateDurationMs);
  return buildPartialInstabilityEntry(res, unstable);
}
function instabilityFromFit(res, lateDurationSec, lateDurationMs) {
  const beatUnstable = beatInstabilityFromFit(res, lateDurationSec, lateDurationMs);
  return beatUnstable !== null && beatUnstable !== void 0 ? beatUnstable : wobbleInstabilityFromFit(res, lateDurationMs);
}
function buildPartialInstabilityEntry(res, unstable) {
  return {
    unstable,
    beatRate: res.deltaF,
    wobbleDepth: res.wobbleDepth,
    stability: res.r2
  };
}
function beatInstabilityFromFit(res, lateDurationSec, lateDurationMs) {
  const cycles = beatCyclesFromFit(res, lateDurationSec);
  return cycles !== null ? cycles >= WOLF_MIN_CYCLES && lateDurationMs >= WOLF_MIN_DURATION_MS : null;
}
function wobbleInstabilityFromFit(res, lateDurationMs) {
  if (Number.isFinite(res.wobbleDepth) && res.wobbleDepth >= WOBBLE_DEPTH_MIN) {
    return lateDurationMs >= WOLF_MIN_DURATION_MS;
  }
  return false;
}
function beatCyclesFromFit(res, lateDurationSec) {
  return Number.isFinite(res.deltaF) && res.deltaF >= BEAT_RATE_MIN ? res.deltaF * lateDurationSec : null;
}
function timelineDeriveDeltaT(t) {
  if (t.length <= 1)
    return null;
  return Math.max(1e-6, t[1] - t[0]);
}
function partialInstabilityTimelineFromDeltaT(t, dt) {
  return partialInstabilityTimelineFromOptionalDeltaT(t, dt);
}
function partialInstabilityTimelineFromOptionalDeltaT(t, dt) {
  return partialInstabilityTimelineFromOptionalDeltaTChecked(t, dt);
}
function partialInstabilityTimelineFromOptionalDeltaTChecked(t, dt) {
  if (!Number.isFinite(dt) || dt <= 0)
    return null;
  return partialInstabilityTimelineFromValidDeltaT(t, dt);
}
function partialInstabilityTimelineFromValidDeltaT(t, dt) {
  const { lateDurationSec, lateDurationMs } = timelineDeriveLateWindowDurations(t);
  return { dt, lateDurationSec, lateDurationMs };
}
function partialInstabilityTimeline(t) {
  if (!t.length)
    return null;
  return partialInstabilityTimelineFromDeltaT(t, timelineDeriveDeltaT(t));
}
function partialInstabilityMapFromKeys(keys, partialNorm, dt, lateDurationSec, lateDurationMs) {
  const out = {};
  keys.forEach((key) => {
    const env = partialNorm[key] || [];
    out[key] = analyzePartialInstability(env, dt, lateDurationSec, lateDurationMs);
  });
  return out;
}
function partialInstabilityMapFromTimeline(partialNorm, timeline) {
  const keys = ["f0", "h2", "h3"];
  return partialInstabilityMapFromKeys(keys, partialNorm, timeline.dt, timeline.lateDurationSec, timeline.lateDurationMs);
}
function partialInstabilityMapFromOptionalTimeline(partialNorm, timeline) {
  if (!timeline)
    return {};
  return partialInstabilityMapFromTimeline(partialNorm, timeline);
}
function partialInstabilityInputsFromSeries(series) {
  return {
    partialNorm: (series === null || series === void 0 ? void 0 : series.partialNorm) || {},
    t: (series === null || series === void 0 ? void 0 : series.t) || []
  };
}
function isUnstableDecay(result) {
  if (!result)
    return false;
  return unstableDecayFromMetrics(result);
}
function unstableDecayFromMetrics(result) {
  const beatUnstable = unstableBeatRate(result.beatRate);
  return beatUnstable !== null ? beatUnstable : unstableWobbleDepth(result.wobbleDepth);
}
function unstableBeatRate(value) {
  return Number.isFinite(value) ? value >= BEAT_RATE_MIN : null;
}
function unstableWobbleDepth(value) {
  return Number.isFinite(value) ? value >= WOBBLE_DEPTH_MIN : false;
}
function computePartialInstabilityMap(series) {
  const { partialNorm, t } = partialInstabilityInputsFromSeries(series);
  return partialInstabilityMapFromOptionalTimeline(partialNorm, partialInstabilityTimeline(t));
}

// tools/wolf_note_analyzer/dist/core_driver.js
var DOMINANCE_OVERLAP_MAX2 = 0.45;
var DECAY_SLOPE_DIFF_MIN = 0.15;
var BODY_SLOPE_MIN_NEG = -0.08;
function centsBetween(freq, ref) {
  if (!Number.isFinite(freq) || !Number.isFinite(ref) || freq <= 0 || ref <= 0)
    return Infinity;
  return 1200 * Math.log2(freq / ref);
}
function buildBodyModeStats(modes, bodyNorm, t) {
  const [bodyLate, bodySlopeByMode] = [{}, {}];
  modes.forEach((mode) => {
    const env = bodyNorm[mode.id] || [];
    bodyLate[mode.id] = lateTimeStats(env, t);
    bodySlopeByMode[mode.id] = lateTimeSlope(env, t);
  });
  return { bodyLate, bodySlopeByMode };
}
function buildPartialSlopeMap(partials, partialNorm, t) {
  const partialSlope = {};
  partials.forEach((partial) => {
    partialSlope[partial.key] = lateTimeSlope(partialNorm[partial.key] || [], t);
  });
  return partialSlope;
}
function buildModeCandidates(partial, modes, bodyLate, bodySlopeByMode, partialSlope) {
  return modeCandidatesFromPartial(partial, modes, bodyLate, bodySlopeByMode, partialSlope);
}
function modeCandidatesFromPartial(partial, modes, bodyLate, bodySlopeByMode, partialSlope) {
  return modeCandidatesFromModes(partial, modes, bodyLate, bodySlopeByMode, partialSlope);
}
function modeCandidatesFromModes(partial, modes, bodyLate, bodySlopeByMode, partialSlope) {
  const partialBw = partialBandwidthForCandidate(partial);
  return modeCandidatesFromModesWithBandwidth(partial, modes, partialBw, bodyLate, bodySlopeByMode, partialSlope);
}
function modeCandidatesFromModesWithBandwidth(partial, modes, partialBw, bodyLate, bodySlopeByMode, partialSlope) {
  let nearest = null;
  const candidates = modes.map((mode) => {
    const entry = modeCandidateForPartial(partial, mode, partialBw, bodyLate, bodySlopeByMode, partialSlope);
    nearest = nearestCandidateByCentsAbs(nearest, entry);
    return entry;
  });
  return { candidates, nearest };
}
function partialBandwidthForCandidate(partial) {
  return partialBandWidth(partial.key, partial.freq);
}
function nearestCandidateByCentsAbs(nearest, entry) {
  return !nearest || entry.centsAbs < nearest.centsAbs ? entry : nearest;
}
function modeCandidateForPartial(partial, mode, partialBw, bodyLate, bodySlopeByMode, partialSlope) {
  const { cents, centsAbs } = centsAndAbsForModePartial(mode, partial);
  const tier = couplingTier(centsAbs);
  const overlap = overlapRatioForPartialMode(partial, mode, partialBw);
  const late = lateStatsForMode(bodyLate, mode);
  const slopeIndependent = slopeIndependentForModePartial(mode, partial, bodySlopeByMode, partialSlope);
  return { mode, cents, centsAbs, tier, overlap, late, slopeIndependent };
}
function centsAndAbsForModePartial(mode, partial) {
  const cents = centsBetween(mode.peakFreq, partial.freq);
  return { cents, centsAbs: Math.abs(cents) };
}
function lateStatsForMode(bodyLate, mode) {
  return bodyLate[mode.id] || { mean: 0, cv: 1, stable: false };
}
function slopeIndependentForModePartial(mode, partial, bodySlopeByMode, partialSlope) {
  const slopeDiff = slopeDiffForModePartial(mode, partial, bodySlopeByMode, partialSlope);
  return Number.isFinite(slopeDiff) ? slopeDiff >= DECAY_SLOPE_DIFF_MIN : false;
}
function slopeDiffForModePartial(mode, partial, bodySlopeByMode, partialSlope) {
  return Number.isFinite(bodySlopeByMode[mode.id]) && Number.isFinite(partialSlope[partial.key]) ? Math.abs(bodySlopeByMode[mode.id] - partialSlope[partial.key]) : null;
}
function overlapRatioForPartialMode(partial, mode, partialBw) {
  return bandOverlapRatio(partial.freq, partialBw, mode.peakFreq, modeBandWidth(mode.peakFreq));
}
function selectDriverCandidate(candidates) {
  return bestEligibleCandidate(candidates);
}
function bestEligibleCandidate(candidates) {
  const eligible = candidates.filter((c) => isStrongStableCandidate(c)).sort(compareCandidatePriority);
  return eligible[0] || null;
}
function isStrongStableCandidate(candidate) {
  var _a;
  return candidate.tier === "strong" && ((_a = candidate.late) === null || _a === void 0 ? void 0 : _a.stable);
}
function compareCandidatePriority(a, b) {
  var _a, _b;
  return (_b = (_a = compareCandidateCentsAbs(a, b)) !== null && _a !== void 0 ? _a : compareCandidateLateMean(a, b)) !== null && _b !== void 0 ? _b : compareCandidateQ(a, b);
}
function compareCandidateCentsAbs(a, b) {
  return a.centsAbs !== b.centsAbs ? a.centsAbs - b.centsAbs : null;
}
function compareCandidateLateMean(a, b) {
  var _a, _b;
  const meanA = ((_a = a.late) === null || _a === void 0 ? void 0 : _a.mean) || 0;
  const meanB = ((_b = b.late) === null || _b === void 0 ? void 0 : _b.mean) || 0;
  return meanA !== meanB ? meanB - meanA : null;
}
function compareCandidateQ(a, b) {
  return candidateQValue(b) - candidateQValue(a);
}
function candidateQValue(candidate) {
  var _a;
  return Number.isFinite((_a = candidate.mode) === null || _a === void 0 ? void 0 : _a.q) ? candidate.mode.q : 0;
}
function dominanceTimeForDriver(driver, sharedBand, t, bodyShares, partialShares, partialKey) {
  if (!driver || sharedBand || !driver.slopeIndependent)
    return null;
  return dominanceTimeFromShares(t, bodyShares[driver.mode.id] || [], partialShares[partialKey] || []);
}
function dominanceTimeFromShares(t, bodyShare, partialShare) {
  const idx = bodyShare.findIndex((v, i) => {
    var _a, _b;
    return v > ((_a = partialShare[i]) !== null && _a !== void 0 ? _a : 0) && ((_b = t[i]) !== null && _b !== void 0 ? _b : 0) > 0.1;
  });
  return idx >= 0 ? t[idx] : null;
}
function exchangeDepthDbForDriver(driver, bodyRaw, partialRaw, partialKey) {
  return driver ? exchangeDepthDbForDriverArrays(driver, bodyRaw, partialRaw, partialKey) : null;
}
function exchangeDepthDbForDriverArrays(driver, bodyRaw, partialRaw, partialKey) {
  const bodyArr = bodyRaw[driver.mode.id] || [];
  const partialArr = partialRaw[partialKey] || [];
  const maxBody = maxOfSeries(bodyArr);
  const maxPartial = maxOfSeries(partialArr);
  return exchangeDepthDbFromMax(maxBody, maxPartial);
}
function maxOfSeries(values) {
  return values.length ? Math.max(...values) : 0;
}
function exchangeDepthDbFromMax(maxBody, maxPartial) {
  if (maxBody > 0 && maxPartial > 0) {
    return Math.max(0, 20 * Math.log10(maxBody / maxPartial));
  }
  return null;
}
function driverSharedBandOverlap(driver) {
  return Boolean(driver && Number.isFinite(driver.overlap) && driver.overlap > DOMINANCE_OVERLAP_MAX2);
}
function deriveDriverSlopeContext(driver, partialKey, bodySlopeByMode, partialSlope) {
  const { bodySlopeVal, partialSlopeVal } = slopeValuesForDriver(driver, partialKey, bodySlopeByMode, partialSlope);
  const slopeInversion = slopeInversionFromValues(bodySlopeVal, partialSlopeVal);
  const directionalSink = directionalSinkFromSlopeValues(driver, bodySlopeVal, slopeInversion);
  return {
    bodySlope: bodySlopeVal,
    partialSlope: partialSlopeVal !== null && partialSlopeVal !== void 0 ? partialSlopeVal : null,
    slopeInversion,
    directionalSink
  };
}
function slopeValuesForDriver(driver, partialKey, bodySlopeByMode, partialSlope) {
  const bodySlopeVal = driver ? bodySlopeByMode[driver.mode.id] : null;
  const partialSlopeVal = partialSlope[partialKey];
  return { bodySlopeVal, partialSlopeVal };
}
function slopeInversionFromValues(bodySlopeVal, partialSlopeVal) {
  return Number.isFinite(bodySlopeVal) && Number.isFinite(partialSlopeVal) ? partialSlopeVal < bodySlopeVal - DECAY_SLOPE_DIFF_MIN : false;
}
function directionalSinkFromSlopeValues(driver, bodySlopeVal, slopeInversion) {
  const bodySlopeOk = Number.isFinite(bodySlopeVal) ? bodySlopeVal <= BODY_SLOPE_MIN_NEG : false;
  return Boolean(driver) && slopeInversion && bodySlopeOk;
}
function derivePartialState(driver, directionalSink, instability) {
  if (!driver)
    return "normal";
  return derivePartialStateForDriver(directionalSink, instability);
}
function derivePartialStateForDriver(directionalSink, instability) {
  if (instability)
    return "wolf";
  return sinkOrNormalState(directionalSink);
}
function sinkOrNormalState(directionalSink) {
  return directionalSink ? "sink" : "normal";
}
function sinkFlavorFromSharedBand(sharedBand) {
  return sharedBand ? "shared-band" : "clean";
}
function deriveSinkFlavor(state, sharedBand) {
  if (state !== "sink")
    return null;
  return sinkFlavorFromSharedBand(sharedBand);
}
function deriveConfidenceFromCandidate(reportCandidate) {
  var _a, _b, _c, _d, _e;
  if (!reportCandidate)
    return "Low";
  return confidenceFrom(reportCandidate.centsAbs, (_b = (_a = reportCandidate.late) === null || _a === void 0 ? void 0 : _a.stable) !== null && _b !== void 0 ? _b : false, (_c = reportCandidate.overlap) !== null && _c !== void 0 ? _c : null, (_e = (_d = reportCandidate.mode) === null || _d === void 0 ? void 0 : _d.source) !== null && _e !== void 0 ? _e : null);
}
function buildDriverEntry(partial, ctx) {
  const { candidates, nearest } = buildModeCandidates(partial, ctx.modesWithFreq, ctx.bodyLate, ctx.bodySlopeByMode, ctx.partialSlope);
  const derived = buildDriverEntryDerivedFields(partial, ctx, candidates, nearest);
  return {
    partial,
    ...derived
  };
}
function buildDriverEntryDerivedFields(partial, ctx, candidates, nearest) {
  var _a;
  const { driver, sharedBand } = selectDriverAndSharedBand(candidates);
  const slopes = deriveDriverSlopeContext(driver, partial.key, ctx.bodySlopeByMode, ctx.partialSlope);
  const dominanceTime = dominanceTimeForDriver(driver, sharedBand, ctx.t, ctx.bodyShares, ctx.partialShares, partial.key);
  const exchangeDepthDb = exchangeDepthDbForDriver(driver, ctx.bodyRaw, ctx.partialRaw, partial.key);
  const signals = buildDriverEntrySignals(driver, nearest, sharedBand, slopes, ctx, partial.key);
  return {
    driver,
    nearest,
    confidence: signals.confidence,
    dominanceTime,
    exchangeDepthDb,
    sharedBand,
    slopeIndependent: (_a = driver === null || driver === void 0 ? void 0 : driver.slopeIndependent) !== null && _a !== void 0 ? _a : false,
    instability: signals.instability,
    state: signals.state,
    sinkFlavor: signals.sinkFlavor,
    bodySlope: slopes.bodySlope,
    partialSlope: slopes.partialSlope
  };
}
function selectDriverAndSharedBand(candidates) {
  const driver = selectDriverCandidate(candidates);
  const sharedBand = driverSharedBandOverlap(driver);
  return { driver, sharedBand };
}
function buildDriverEntrySignals(driver, nearest, sharedBand, slopes, ctx, partialKey) {
  var _a, _b, _c;
  const reportCandidate = driver || nearest;
  const confidence = deriveConfidenceFromCandidate(reportCandidate);
  const instability = (_c = (_b = (_a = ctx.partialInstability) === null || _a === void 0 ? void 0 : _a[partialKey]) === null || _b === void 0 ? void 0 : _b.unstable) !== null && _c !== void 0 ? _c : false;
  const state = derivePartialState(driver, slopes.directionalSink, instability);
  const sinkFlavor = deriveSinkFlavor(state, sharedBand);
  return {
    confidence,
    instability,
    state,
    sinkFlavor
  };
}
function buildPartialDriverMap(partials, modes, series, partialInstability = {}) {
  if (!(partials === null || partials === void 0 ? void 0 : partials.length) || !series)
    return [];
  return buildPartialDriverMapFromContext(partials, buildDriverContextFromSeries(partials, modes, series, partialInstability));
}
function buildPartialDriverMapFromContext(partials, driverContext) {
  return partials.map((partial) => buildDriverEntry(partial, driverContext));
}
function buildDriverContextFromSeries(partials, modes, series, partialInstability) {
  const { t, partialShares, partialRaw, partialNorm, bodyShares, bodyRaw, bodyNorm } = energySeriesSlices(series);
  const modesWithFreq = modesWithFrequency(modes);
  const { bodyLate, bodySlopeByMode } = buildBodyModeStats(modesWithFreq, bodyNorm, t);
  const partialSlope = buildPartialSlopeMap(partials, partialNorm, t);
  return {
    t,
    bodyShares,
    bodyRaw,
    partialShares,
    partialRaw,
    partialInstability,
    modesWithFreq,
    bodyLate,
    bodySlopeByMode,
    partialSlope
  };
}
function energySeriesSlices(series) {
  return {
    t: series.t || [],
    partialShares: series.partialShares || {},
    partialRaw: series.partialRaw || {},
    partialNorm: series.partialNorm || {},
    bodyShares: series.bodyShares || {},
    bodyRaw: series.bodyRaw || {},
    bodyNorm: series.bodyNorm || {}
  };
}
function modesWithFrequency(modes) {
  return (modes || []).filter((mode) => Number.isFinite(mode === null || mode === void 0 ? void 0 : mode.peakFreq));
}
function pickPrimaryDriver(drivers) {
  return (drivers === null || drivers === void 0 ? void 0 : drivers.length) ? primaryDriverFromCandidates(driverCandidates(drivers), confidenceRankMap()) : null;
}
function driverCandidates(drivers) {
  return drivers.filter((d) => d.driver);
}
function compareDriverEntries(a, b, rank) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
  const ra = (_a = rank[a.confidence]) !== null && _a !== void 0 ? _a : 2;
  const rb = (_b = rank[b.confidence]) !== null && _b !== void 0 ? _b : 2;
  if (ra !== rb)
    return ra - rb;
  const ca = (_d = (_c = a.driver) === null || _c === void 0 ? void 0 : _c.centsAbs) !== null && _d !== void 0 ? _d : Infinity;
  const cb = (_f = (_e = b.driver) === null || _e === void 0 ? void 0 : _e.centsAbs) !== null && _f !== void 0 ? _f : Infinity;
  if (ca !== cb)
    return ca - cb;
  const ma = (_j = (_h = (_g = a.driver) === null || _g === void 0 ? void 0 : _g.late) === null || _h === void 0 ? void 0 : _h.mean) !== null && _j !== void 0 ? _j : 0;
  const mb = (_m = (_l = (_k = b.driver) === null || _k === void 0 ? void 0 : _k.late) === null || _l === void 0 ? void 0 : _l.mean) !== null && _m !== void 0 ? _m : 0;
  if (ma !== mb)
    return mb - ma;
  const qA = Number.isFinite((_p = (_o = a.driver) === null || _o === void 0 ? void 0 : _o.mode) === null || _p === void 0 ? void 0 : _p.q) ? a.driver.mode.q : 0;
  const qB = Number.isFinite((_r = (_q = b.driver) === null || _q === void 0 ? void 0 : _q.mode) === null || _r === void 0 ? void 0 : _r.q) ? b.driver.mode.q : 0;
  return qB - qA;
}
function primaryDriverFromCandidates(candidates, rank) {
  return candidates.length ? sortDriverCandidates(candidates, rank)[0] : null;
}
function sortDriverCandidates(candidates, rank) {
  candidates.sort((a, b) => compareDriverEntries(a, b, rank));
  return candidates;
}
function confidenceRankMap() {
  return { High: 0, Medium: 1, Low: 2 };
}
function pickNearestCandidate(drivers) {
  if (!(drivers === null || drivers === void 0 ? void 0 : drivers.length))
    return null;
  return nearestCandidateFromDrivers(drivers);
}
function nearestCandidateFromDrivers(drivers) {
  let best = null;
  drivers.forEach((entry) => {
    best = chooseNearestCandidate(best, entry);
  });
  return best;
}
function chooseNearestCandidate(best, entry) {
  if (!(entry === null || entry === void 0 ? void 0 : entry.nearest) || entry.nearest.tier === "none")
    return best;
  return pickBetterCandidate(best, entry);
}
function pickBetterCandidate(best, entry) {
  return isNearestCandidateBetter(best, entry) ? entry : best;
}
function isNearestCandidateBetter(best, entry) {
  var _a, _b, _c;
  return !best || ((_a = entry.nearest.centsAbs) !== null && _a !== void 0 ? _a : Infinity) < ((_c = (_b = best.nearest) === null || _b === void 0 ? void 0 : _b.centsAbs) !== null && _c !== void 0 ? _c : Infinity);
}

// tools/wolf_note_analyzer/dist/core.js
var WolfNoteCore = /* @__PURE__ */ (() => {
  function classifyWolfRisk(score) {
    const val = Number.isFinite(score) ? score : 0;
    return classifyWolfRiskFromValue(val);
  }
  function classifyWolfRiskFromValue(val) {
    if (val < 0.1)
      return "None";
    return classifyWolfRiskFromMild(val);
  }
  function classifyWolfRiskFromMild(val) {
    if (val < 0.25)
      return "Mild";
    return classifyWolfRiskFromModerate(val);
  }
  function classifyWolfRiskFromModerate(val) {
    return val < 0.45 ? "Moderate" : "High";
  }
  return {
    analyzeModes,
    bandOverlapRatio,
    buildPartialDriverMap,
    centsBetween,
    demodulatePartial,
    estimateQFromDb,
    classifyWolfRisk,
    computePartialInstabilityMap,
    confidenceFrom,
    couplingTier,
    fitTwoModeEnvelopeAndComputeWolfMetrics,
    fitTwoMode,
    isUnstableDecay,
    lateTimeSlope,
    lateTimeStats,
    lateWindowIndices,
    modeBandWidth,
    normalizeEnvelope,
    partialBandWidth,
    pickNearestCandidate,
    pickPrimaryDriver,
    refineParabolicPeak
  };
})();
if (typeof window !== "undefined") {
  window.WolfNoteCore = WolfNoteCore;
}
export {
  WolfNoteCore
};
