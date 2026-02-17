import type { LateStats, PreparedEnvelope, RegressionResult } from "./core_types.js";
import { linearRegression, seriesComputeMean, seriesComputeVariance } from "./core_math.js";

const LATE_WINDOW_MS = { start: 200, end: 800 };
const LATE_PERSISTENCE_MIN = 0.08;
const LATE_CV_MAX = 0.6;

export function normalizeEnvelope(env: ArrayLike<number>): number[] {
  const len = env?.length ?? 0;
  if (!len) return [];
  let maxEnv = 1e-9;
  for (let i = 0; i < len; i += 1) {
    const v = env[i] as number;
    if (Number.isFinite(v) && v > maxEnv) maxEnv = v;
  }
  const out = new Array(len);
  for (let i = 0; i < len; i += 1) {
    const v = env[i] as number;
    out[i] = Number.isFinite(v) ? v / maxEnv : 0;
  }
  return out;
}

export function lateWindowIndices(t: number[]) {
  if (!t.length) return { startIdx: 0, endIdx: -1 };
  return lateWindowIndicesFromNonEmptyTimes(t);
}

export function lateTimeStats(env: number[], t: number[]): LateStats {
  return lateStatsFromEnvelopeWindow(env, t);
}

export function lateTimeSlope(env: number[], t: number[]): number | null {
  if (!env.length || !t.length) return null;
  return slopeFromLateSlices(lateWindowSlicesForTimes(env, t));
}

export function prepareEnvelopeForFit(
  envelope: number[],
  dt: number,
  opts: { attackSkipMs?: number; maxAnalysisMs?: number },
): PreparedEnvelope {
  const env = trimmedEnvelopeForFit(envelope, dt, opts);
  const tArr = buildTimeAxis(env.length, dt);
  return { env, tArr };
}

export function timelineDeriveLateWindowDurations(t: number[]) {
  const { startIdx, endIdx } = lateWindowIndices(t);
  const { lateStart, lateEnd } = lateWindowEndpoints(t, startIdx, endIdx);
  const lateDurationSec = Math.max(0, lateEnd - lateStart);
  const lateDurationMs = lateDurationSec * 1000;
  return { lateDurationSec, lateDurationMs };
}

function lateWindowIndicesFromNonEmptyTimes(t: number[]): { startIdx: number; endIdx: number } {
  const { startSec, endSec } = lateWindowSeconds();
  const startIdx = lateWindowStartIndex(t, startSec);
  const endIdx = lateWindowEndIndexAfterStart(t, endSec, startIdx);
  return { startIdx, endIdx };
}

function lateWindowEndIndexAfterStart(t: number[], endSec: number, startIdx: number): number {
  const candidate = lateWindowEndIndex(t, endSec);
  return lateWindowEndIndexAfterStartFromCandidate(candidate, startIdx, t.length);
}

function lateWindowEndIndexAfterStartFromCandidate(
  candidate: number,
  startIdx: number,
  length: number,
): number {
  return candidate <= startIdx ? length - 1 : candidate;
}

function lateWindowEndIndex(t: number[], endSec: number): number {
  const candidate = t.findIndex((v) => v >= endSec);
  return lateWindowEndIndexFromCandidate(candidate, t.length);
}

function lateWindowEndIndexFromCandidate(candidate: number, length: number): number {
  return candidate < 0 ? length - 1 : candidate;
}

function lateWindowStartIndex(t: number[], startSec: number): number {
  const candidate = t.findIndex((v) => v >= startSec);
  return lateWindowStartIndexFromCandidate(candidate, t.length);
}

function lateWindowStartIndexFromCandidate(candidate: number, length: number): number {
  return candidate < 0 ? lateWindowStartFallbackIndex(length) : candidate;
}

function lateWindowStartFallbackIndex(length: number): number {
  return Math.max(0, Math.floor(length * 0.6));
}

function lateWindowSeconds(): { startSec: number; endSec: number } {
  return {
    startSec: LATE_WINDOW_MS.start / 1000,
    endSec: LATE_WINDOW_MS.end / 1000,
  };
}

function lateStatsFallback(): LateStats {
  return { mean: 0, cv: 1, stable: false };
}

function lateStatsFromSlice(slice: number[]): LateStats {
  const mean = seriesComputeMean(slice);
  const variance = seriesComputeVariance(slice, mean);
  const cv = Math.sqrt(variance) / Math.max(1e-9, mean);
  const stable = mean >= LATE_PERSISTENCE_MIN && cv <= LATE_CV_MAX;
  return { mean, cv, stable };
}

function lateWindowIndicesIfOrdered(
  indices: { startIdx: number; endIdx: number },
): { startIdx: number; endIdx: number } | null {
  if (indices.endIdx < indices.startIdx) return null;
  return indices;
}

function lateWindowIndicesFromTimesInner(t: number[]): { startIdx: number; endIdx: number } | null {
  if (!t.length) return null;
  return lateWindowIndicesIfOrdered(lateWindowIndices(t));
}

function lateWindowIndicesFromTimes(t: number[]): { startIdx: number; endIdx: number } | null {
  return lateWindowIndicesFromTimesInner(t);
}

function lateWindowIndicesFromWindow(t: number[]): { startIdx: number; endIdx: number } | null {
  return lateWindowIndicesFromTimes(t);
}

function lateWindowSliceIndices(t: number[]): { startIdx: number; endIdx: number } | null {
  return lateWindowIndicesFromWindow(t);
}

function lateStatsSliceFromWindow(env: number[], t: number[]): number[] | null {
  if (!env.length) return null;
  return lateStatsSliceFromWindowIndices(env, t);
}

function lateStatsSliceFromWindowIndices(env: number[], t: number[]): number[] | null {
  const indices = lateWindowSliceIndices(t);
  return lateStatsSliceFromOptionalIndices(env, indices);
}

function lateStatsSliceFromOptionalIndices(
  env: number[],
  indices: { startIdx: number; endIdx: number } | null,
): number[] | null {
  if (!indices) return null;
  return lateStatsSliceFromIndices(env, indices);
}

function lateStatsSliceFromIndices(
  env: number[],
  indices: { startIdx: number; endIdx: number },
): number[] | null {
  const slice = env.slice(indices.startIdx, indices.endIdx + 1);
  return nonEmptySliceOrNull(slice);
}

function nonEmptySliceOrNull(slice: number[]): number[] | null {
  if (!slice.length) return null;
  return slice;
}

function lateStatsFromOptionalSlice(slice: number[] | null): LateStats {
  if (!slice) return lateStatsFallback();
  return lateStatsFromSlice(slice);
}

function lateStatsFromEnvelopeWindow(env: number[], t: number[]): LateStats {
  const slice = lateStatsSliceFromWindow(env, t);
  return lateStatsFromOptionalSlice(slice);
}

function slopeFromLateSlices(slices: { envSlice: number[]; tSlice: number[] } | null): number | null {
  if (!slices) return null;
  return slopeFromRegression(regressionForLateSlices(slices));
}

function regressionForLateSlices(slices: { envSlice: number[]; tSlice: number[] }): RegressionResult | null {
  const logEnv = logEnvelopeForRegression(slices.envSlice);
  return linearRegression(slices.tSlice, logEnv);
}

function slopeFromRegression(reg: RegressionResult | null): number | null {
  return Number.isFinite(reg?.slope) ? reg?.slope : null;
}

function lateWindowSlicesForTimes(
  env: number[],
  t: number[],
): { envSlice: number[]; tSlice: number[] } | null {
  return lateWindowSlicesForOptionalIndices(env, t, lateWindowIndicesOrNull(t));
}

function lateWindowSlicesForOptionalIndices(
  env: number[],
  t: number[],
  indices: { startIdx: number; endIdx: number } | null,
): { envSlice: number[]; tSlice: number[] } | null {
  if (!indices) return null;
  return lateWindowSlices(env, t, indices.startIdx, indices.endIdx);
}

function lateWindowIndicesOrNull(t: number[]): { startIdx: number; endIdx: number } | null {
  const indices = lateWindowIndices(t);
  return indices.endIdx < indices.startIdx ? null : indices;
}

function logEnvelopeForRegression(envSlice: number[]): number[] {
  return envSlice.map((v) => Math.log(Math.max(v, 1e-9)));
}

function lateWindowSlices(
  env: number[],
  t: number[],
  startIdx: number,
  endIdx: number,
): { envSlice: number[]; tSlice: number[] } | null {
  return lateWindowSlicesFromBounds(env, t, startIdx, endIdx);
}

function lateWindowSlicesFromBounds(
  env: number[],
  t: number[],
  startIdx: number,
  endIdx: number,
): { envSlice: number[]; tSlice: number[] } | null {
  const slices = windowSlicesFromBounds(env, t, startIdx, endIdx);
  return validWindowSlices(slices);
}

function windowSlicesFromBounds(
  env: number[],
  t: number[],
  startIdx: number,
  endIdx: number,
): { envSlice: number[]; tSlice: number[] } {
  return {
    envSlice: env.slice(startIdx, endIdx + 1),
    tSlice: t.slice(startIdx, endIdx + 1),
  };
}

function validWindowSlices(
  slices: { envSlice: number[]; tSlice: number[] },
): { envSlice: number[]; tSlice: number[] } | null {
  if (!slices.envSlice.length || slices.envSlice.length !== slices.tSlice.length) return null;
  return slices;
}

function buildTimeAxis(length: number, dt: number): number[] {
  return Array.from({ length }, (_, i) => i * dt);
}

function trimmedEnvelopeForFit(
  envelope: number[],
  dt: number,
  opts: { attackSkipMs?: number; maxAnalysisMs?: number },
): number[] {
  const { attackSkipMs, maxAnalysisMs } = envelopeFitOptions(opts);
  const attackSkip = attackSkipSamples(envelope.length, attackSkipMs, dt);
  let env = envelope.slice(attackSkip);
  env = trimEnvelopeToMaxAnalysis(env, maxAnalysisMs, dt);
  return trimEnvelopeTail(env);
}

function trimEnvelopeTail(env: number[]): number[] {
  const thresh = envelopeTailThreshold(env);
  const lastIdx = lastIndexAboveThreshold(env, thresh);
  return env.slice(0, envelopeTrimLength(lastIdx));
}

function envelopeTrimLength(lastIdx: number): number {
  return Math.max(lastIdx + 1, 16);
}

function lastIndexAboveThreshold(env: number[], thresh: number): number {
  return lastIndexAboveThresholdFromEnd(env, thresh);
}

function lastIndexAboveThresholdFromEnd(envelope: number[], threshold: number): number {
  return scanLastIndexAboveThresholdFromEnd(envelope, threshold);
}

function scanLastIndexAboveThresholdFromEnd(envelope: number[], threshold: number): number {
  let lastIndex = envelope.length - 1;
  for (let index = envelope.length - 1; index >= 0; index -= 1) {
    if (envelope[index] >= threshold) {
      lastIndex = index;
      break;
    }
  }
  return lastIndex;
}

function envelopeTailThreshold(env: number[]): number {
  const peak = env.reduce((m, v) => Math.max(m, v), 0);
  return peak * 0.05;
}

function trimEnvelopeToMaxAnalysis(env: number[], maxAnalysisMs: number, dt: number): number[] {
  if (!maxAnalysisMs) return env;
  return env.slice(0, envelopeMaxSamples(maxAnalysisMs, dt));
}

function envelopeMaxSamples(maxAnalysisMs: number, dt: number): number {
  return Math.max(8, Math.round((maxAnalysisMs / 1000) / dt));
}

function attackSkipSamples(length: number, attackSkipMs: number, dt: number): number {
  return Math.min(length, Math.round((attackSkipMs / 1000) / dt));
}

function envelopeFitOptions(
  opts: { attackSkipMs?: number; maxAnalysisMs?: number },
): { attackSkipMs: number; maxAnalysisMs: number } {
  return {
    attackSkipMs: opts.attackSkipMs ?? 100,
    maxAnalysisMs: opts.maxAnalysisMs ?? 2000,
  };
}

function lateWindowEndpoints(t: number[], startIdx: number, endIdx: number) {
  const lateStart = safeTimeValue(t, startIdx, LATE_WINDOW_MS.start / 1000);
  const lateEnd = safeTimeValue(t, endIdx, LATE_WINDOW_MS.end / 1000);
  return { lateStart, lateEnd };
}

function safeTimeValue(t: number[], idx: number, fallback: number): number {
  return Number.isFinite(t[idx]) ? t[idx] : fallback;
}
