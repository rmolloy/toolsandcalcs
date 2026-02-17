import { linearRegression, seriesComputeMean, seriesComputeVariance } from "./core_math.js";
const LATE_WINDOW_MS = { start: 200, end: 800 };
const LATE_PERSISTENCE_MIN = 0.08;
const LATE_CV_MAX = 0.6;
export function normalizeEnvelope(env) {
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
export function lateWindowIndices(t) {
    if (!t.length)
        return { startIdx: 0, endIdx: -1 };
    return lateWindowIndicesFromNonEmptyTimes(t);
}
export function lateTimeStats(env, t) {
    return lateStatsFromEnvelopeWindow(env, t);
}
export function lateTimeSlope(env, t) {
    if (!env.length || !t.length)
        return null;
    return slopeFromLateSlices(lateWindowSlicesForTimes(env, t));
}
export function prepareEnvelopeForFit(envelope, dt, opts) {
    const env = trimmedEnvelopeForFit(envelope, dt, opts);
    const tArr = buildTimeAxis(env.length, dt);
    return { env, tArr };
}
export function timelineDeriveLateWindowDurations(t) {
    const { startIdx, endIdx } = lateWindowIndices(t);
    const { lateStart, lateEnd } = lateWindowEndpoints(t, startIdx, endIdx);
    const lateDurationSec = Math.max(0, lateEnd - lateStart);
    const lateDurationMs = lateDurationSec * 1000;
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
        startSec: LATE_WINDOW_MS.start / 1000,
        endSec: LATE_WINDOW_MS.end / 1000,
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
        tSlice: t.slice(startIdx, endIdx + 1),
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
    return Math.max(8, Math.round((maxAnalysisMs / 1000) / dt));
}
function attackSkipSamples(length, attackSkipMs, dt) {
    return Math.min(length, Math.round((attackSkipMs / 1000) / dt));
}
function envelopeFitOptions(opts) {
    var _a, _b;
    return {
        attackSkipMs: (_a = opts.attackSkipMs) !== null && _a !== void 0 ? _a : 100,
        maxAnalysisMs: (_b = opts.maxAnalysisMs) !== null && _b !== void 0 ? _b : 2000,
    };
}
function lateWindowEndpoints(t, startIdx, endIdx) {
    const lateStart = safeTimeValue(t, startIdx, LATE_WINDOW_MS.start / 1000);
    const lateEnd = safeTimeValue(t, endIdx, LATE_WINDOW_MS.end / 1000);
    return { lateStart, lateEnd };
}
function safeTimeValue(t, idx, fallback) {
    return Number.isFinite(t[idx]) ? t[idx] : fallback;
}
