import type {
  ConfidenceTier,
  CouplingTier,
  DecayFit,
  EnergySeries,
  FitScore,
  FitTwoModeResult,
  InstabilityInput,
  PartialInstabilityEntry,
  PreparedEnvelope,
  RegressionResult,
  WobbleWindow,
} from "./core_types.js";
import {
  clamp01,
  linearRegression,
  seriesComputeMean,
  seriesComputeMeanSquare,
  seriesComputeVariance,
} from "./core_math.js";
import { prepareEnvelopeForFit, timelineDeriveLateWindowDurations } from "./core_envelope.js";

const BEAT_RATE_MIN = 0.8;
const COUPLING_CENTS_STRONG = 25;
const COUPLING_CENTS_POSSIBLE = 50;
const DOMINANCE_OVERLAP_MAX = 0.45;
const WOBBLE_DEPTH_MIN = 0.08;
const DETRENDED_VARIANCE_MIN = 1e-7;
const WOBBLE_DEPTH_SCORE_SCALE = 0.4;
const BEAT_RATE_SCORE_SCALE_HZ = 4;
const WOLF_MIN_DURATION_MS = 220;
const WOLF_MIN_CYCLES = 1.5;

function hannWeight(i: number, n: number): number {
  if (n <= 1) return 1;
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
}

function applyHannExpWindow(values: number[], decay: number): number[] {
  const n = values.length;
  return values.map((v, i) => {
    const t = i / Math.max(1, n - 1);
    return v * hannWeight(i, n) * Math.exp(-decay * t);
  });
}

function centerSeries(values: number[]) {
  const mean = seriesComputeMean(values);
  return { centered: values.map((v) => v - mean), mean };
}

function estimateDeltaF(detEnv: number[], dt: number, minHz = 0.5): number {
  const n = detEnv.length;
  if (n < 8) return 0;
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

function seriesTrailingMean(arr: number[], win: number): number[] {
  const n = arr.length;
  const out = new Array(n).fill(0);
  return fillTrailingMeanSamples(arr, win, out);
}

function fillTrailingMeanSamples(arr: number[], win: number, out: number[]): number[] {
  const state = { acc: 0 };
  arr.forEach((_, i) => {
    const step = trailingMeanStep(state.acc, arr, i, win);
    state.acc = step.acc;
    out[i] = step.mean;
  });
  return out;
}

function trailingMeanStep(acc: number, arr: number[], i: number, win: number): { acc: number; mean: number } {
  const nextAcc = i >= win ? acc + arr[i] - arr[i - win] : acc + arr[i];
  return { acc: nextAcc, mean: nextAcc / Math.min(i + 1, win) };
}

function fitDecayFromEnvelope(env: number[], tArr: number[]): DecayFit {
  const logEnv = buildLogEnvelope(env);
  const reg = linearRegression(tArr, logEnv);
  const alpha = decayAlphaFromRegression(reg);
  const A0 = decayAmplitudeFromRegression(reg, env);
  const detrended = env.map((v, i) => (v * Math.exp(alpha * tArr[i])) / A0);
  return { alpha, A0, detrended };
}

function buildLogEnvelope(env: number[]): number[] {
  return env.map((v) => Math.log(Math.max(v, 1e-12)));
}

function decayAlphaFromRegression(reg: RegressionResult | null): number {
  return reg?.slope ? -Math.min(reg.slope, 0) : 0;
}

function decayAmplitudeFromRegression(reg: RegressionResult | null, env: number[]): number {
  return reg ? Math.exp(reg.intercept) : Math.max(env[0] || 1, 1e-6);
}

function trimWobbleWindow(env: number[], tArr: number[], detrended: number[]): WobbleWindow {
  const peakDet = detrended.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const wobbleEnd = wobbleEndIndex(detrended, peakDet);
  return {
    env: env.slice(0, wobbleEnd + 1),
    tArr: tArr.slice(0, wobbleEnd + 1),
    detrended: detrended.slice(0, wobbleEnd + 1),
    peakDet,
  };
}

function wobbleEndIndex(detrended: number[], peakDet: number): number {
  const wobbleThresh = peakDet * 0.05;
  const wobbleEnd = findWobbleEndIndex(detrended, wobbleThresh);
  return Math.max(wobbleEnd, 15);
}

function findWobbleEndIndex(detrended: number[], wobbleThresh: number): number {
  for (let index = detrended.length - 1; index >= 0; index -= 1) {
    if (Math.abs(detrended[index]) >= wobbleThresh) return index;
  }
  return detrended.length - 1;
}

function estimateWobbleFrequency(detrended: number[], dt: number, peakDet: number): number {
  const n = detrended.length;
  const envWeight = applyHannExpWindow(detrended, 3);
  const windowSec = n * dt;
  const dynamicMinHz = wobbleMinFrequencyHz(windowSec, peakDet);
  const { resVar, resWeight } = wobbleResidualStats(detrended, dt);
  return selectDeltaFFromResidualAndEnv(resVar, resWeight, envWeight, dt, dynamicMinHz);
}

function selectDeltaFFromResidualAndEnv(
  resVar: number,
  resWeight: number[],
  envWeight: number[],
  dt: number,
  dynamicMinHz: number,
): number {
  const deltaFResidual = residualDeltaF(resVar, resWeight, dt);
  const deltaFEnv = estimateDeltaF(envWeight, dt, dynamicMinHz);
  return deltaFResidual > 0 ? deltaFResidual : deltaFEnv;
}

function residualDeltaF(resVar: number, resWeight: number[], dt: number): number {
  return resVar > 1e-7 ? estimateDeltaF(resWeight, dt, 2) : 0;
}

function wobbleMinFrequencyHz(windowSec: number, peakDet: number): number {
  return windowSec <= 1.5 && peakDet > 0.01 ? 1.5 : 0.5;
}

function wobbleResidualStats(detrended: number[], dt: number): { resVar: number; resWeight: number[] } {
  const smoothWin = Math.max(3, Math.round(0.05 / dt));
  const slowTrend = seriesTrailingMean(detrended, smoothWin);
  const residual = detrended.map((v, i) => v - slowTrend[i]);
  const centered = centerSeries(residual).centered;
  return {
    resVar: seriesComputeMeanSquare(centered),
    resWeight: applyHannExpWindow(centered, 3),
  };
}

function fitWobbleSinusoid(detrended: number[], tArr: number[], deltaF: number) {
  const w = 2 * Math.PI * deltaF;
  const sums = wobbleSinusoidSums(detrended, tArr, w);
  const { r, phi } = wobbleSinusoidParams(sums);
  return { w, r, phi };
}

function wobbleSinusoidParams(sums: {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
}): { r: number; phi: number } {
  const { A, B } = wobbleSinusoidCoefficients(sums);
  const amplitude = Math.sqrt(A * A + B * B);
  const phi = Math.atan2(-B, A);
  const r = Math.max(0, amplitude);
  return { r, phi };
}

function wobbleSinusoidCoefficients(sums: {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
}): { A: number; B: number } {
  const det = (sums.cosSquaredSum * sums.sinSquaredSum) - (sums.sinCosSum * sums.sinCosSum) || 1e-9;
  const A = ((sums.yCosSum * sums.sinSquaredSum) - (sums.ySinSum * sums.sinCosSum)) / det;
  const B = ((sums.ySinSum * sums.cosSquaredSum) - (sums.yCosSum * sums.sinCosSum)) / det;
  return { A, B };
}

function wobbleSinusoidSums(
  detrended: number[],
  tArr: number[],
  w: number,
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  let { cosSquaredSum, sinSquaredSum, sinCosSum, yCosSum, ySinSum } = wobbleSinusoidSumsInit();
  return wobbleSinusoidSumsFromLoop(detrended, tArr, w, {
    cosSquaredSum,
    sinSquaredSum,
    sinCosSum,
    yCosSum,
    ySinSum,
  });
}

function wobbleSinusoidSumsFromLoop(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsFromLoopState(detrended, tArr, w, state);
}

function wobbleSinusoidSumsFromLoopState(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopData(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopData(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromIterations(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromIterations(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopCore(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopCore(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopCoreInner(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopCoreInner(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterations(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterations(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterationsBody(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterationsBody(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterationsCore(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterationsCore(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreInner(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterationsCoreInner(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreBody(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterationsCoreBody(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInner(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInner(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInnerLoop(detrended, tArr, w, state);
}

function wobbleSinusoidSumsStateFromLoopIterationsCoreBodyInnerLoop(
  detrended: number[],
  tArr: number[],
  w: number,
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  for (let i = 0; i < detrended.length; i += 1) {
    state = wobbleSinusoidSumsStateStep(state, detrended, tArr, w, i);
  }
  return wobbleSinusoidSumsFromState(
    state.cosSquaredSum,
    state.sinSquaredSum,
    state.sinCosSum,
    state.yCosSum,
    state.ySinSum,
  );
}

function wobbleSinusoidSumsStateStep(
  state: {
    cosSquaredSum: number;
    sinSquaredSum: number;
    sinCosSum: number;
    yCosSum: number;
    ySinSum: number;
  },
  detrended: number[],
  tArr: number[],
  w: number,
  i: number,
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return wobbleSinusoidSumsStep(
    state.cosSquaredSum,
    state.sinSquaredSum,
    state.sinCosSum,
    state.yCosSum,
    state.ySinSum,
    detrended,
    tArr,
    w,
    i,
  );
}

function wobbleSinusoidSumsInit(): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return {
    cosSquaredSum: 0,
    sinSquaredSum: 0,
    sinCosSum: 0,
    yCosSum: 0,
    ySinSum: 0,
  };
}

function wobbleSinusoidSumsFromState(
  cosSquaredSum: number,
  sinSquaredSum: number,
  sinCosSum: number,
  yCosSum: number,
  ySinSum: number,
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  return { cosSquaredSum, sinSquaredSum, sinCosSum, yCosSum, ySinSum };
}

function wobbleSinusoidSumsStep(
  cosSquaredSum: number,
  sinSquaredSum: number,
  sinCosSum: number,
  yCosSum: number,
  ySinSum: number,
  detrended: number[],
  tArr: number[],
  w: number,
  i: number,
): {
  cosSquaredSum: number;
  sinSquaredSum: number;
  sinCosSum: number;
  yCosSum: number;
  ySinSum: number;
} {
  const t = tArr[i];
  const c = Math.cos(w * t);
  const s = Math.sin(w * t);
  const y = detrended[i];
  return {
    cosSquaredSum: cosSquaredSum + c * c,
    sinSquaredSum: sinSquaredSum + s * s,
    sinCosSum: sinCosSum + c * s,
    yCosSum: yCosSum + y * c,
    ySinSum: ySinSum + y * s,
  };
}

function buildFittedEnvelope(env: number[], tArr: number[], A0: number, alpha: number, w: number, r: number, phi: number) {
  return env.map((_, i) => {
    const t = tArr[i];
    return A0 * Math.exp(-alpha * t) * (1 + r * Math.cos(w * t + phi));
  });
}

function scoreEnvelopeFit(env: number[], fitted: number[]): FitScore {
  const maxEnv = env.reduce((m, v) => Math.max(m, v), 1e-9);
  const envNorm = normalizeSeriesByMax(env, maxEnv);
  const fitNorm = normalizeSeriesByMax(fitted, maxEnv);
  const meanY = seriesComputeMean(envNorm);
  const { ssTot, ssRes } = envelopeFitSums(envNorm, fitNorm, meanY);
  return envelopeFitStats(ssTot, ssRes, envNorm.length);
}

function normalizeSeriesByMax(values: number[], maxValue: number): number[] {
  return values.map((v) => v / maxValue);
}

function envelopeFitStats(ssTot: number, ssRes: number, sampleCount: number): FitScore {
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const residualVar = ssRes / Math.max(1, sampleCount);
  return { r2, residualVar };
}

function envelopeFitSums(envNorm: number[], fitNorm: number[], meanY: number): { ssTot: number; ssRes: number } {
  const totals = { ssTot: 0, ssRes: 0 };
  envNorm.forEach((envValue, i) => {
    const next = envelopeFitSumsStep(envValue, fitNorm[i], meanY, totals.ssTot, totals.ssRes);
    totals.ssTot = next.ssTot;
    totals.ssRes = next.ssRes;
  });
  return totals;
}

function envelopeFitSumsStep(
  envValue: number,
  fitValue: number,
  meanY: number,
  ssTot: number,
  ssRes: number,
): { ssTot: number; ssRes: number } {
  const diffTot = envValue - meanY;
  const diffRes = envValue - fitValue;
  return {
    ssTot: ssTot + diffTot * diffTot,
    ssRes: ssRes + diffRes * diffRes,
  };
}

function categorizeWolfScore(score: number): FitTwoModeResult["category"] {
  if (score < 0.10) return "None";
  return categorizeWolfScoreFromMild(score);
}

function categorizeWolfScoreFromMild(score: number): FitTwoModeResult["category"] {
  if (score < 0.25) return "Mild";
  return categorizeWolfScoreFromModerate(score);
}

function categorizeWolfScoreFromModerate(score: number): FitTwoModeResult["category"] {
  if (score < 0.45) return "Moderate";
  return categorizeWolfScoreFromStrong(score);
}

function categorizeWolfScoreFromStrong(score: number): FitTwoModeResult["category"] {
  return score < 0.70 ? "Strong" : "Severe";
}

function detrendedVarianceFromWobbleWindow(wobble: WobbleWindow): number {
  return seriesComputeVariance(wobble.detrended);
}

function lowSignalTwoModeFitResult(alpha: number, detrendedVariance: number): FitTwoModeResult {
  return {
    deltaF: 0,
    wobbleDepth: 0,
    alpha,
    r2: 0,
    residualVar: detrendedVariance || 0,
    wolfScore: 0,
    category: "None",
  };
}

function wobbleParamsFromWindow(wobble: WobbleWindow, dt: number) {
  const deltaF = estimateWobbleFrequency(wobble.detrended, dt, wobble.peakDet);
  const { w, r, phi } = fitWobbleSinusoid(wobble.detrended, wobble.tArr, deltaF);
  return { deltaF, w, wobbleDepth: r, phi };
}

function fittedEnvelopeFromDecayAndWobbleParams(
  wobble: WobbleWindow,
  decay: DecayFit,
  wobbleParams: { w: number; wobbleDepth: number; phi: number },
) {
  return buildFittedEnvelope(wobble.env, wobble.tArr, decay.A0, decay.alpha, wobbleParams.w, wobbleParams.wobbleDepth, wobbleParams.phi);
}

function wolfMetricsFromFit(deltaF: number, wobbleDepth: number, r2: number) {
  const wobbleDepthScore = clamp01(wobbleDepth / WOBBLE_DEPTH_SCORE_SCALE);
  const beatRateScore = clamp01(deltaF / BEAT_RATE_SCORE_SCALE_HZ);
  const wolfScore = wobbleDepthScore * beatRateScore * r2;
  const category = categorizeWolfScore(wolfScore);
  return { wolfScore, category };
}

type TwoModeFitInputs = {
  prepared: PreparedEnvelope;
  decay: DecayFit;
  wobble: WobbleWindow;
  detrendedVariance: number;
};

function prepareTwoModeFitInputs(
  envelope: number[],
  dt: number,
  opts: { attackSkipMs?: number; maxAnalysisMs?: number },
): TwoModeFitInputs {
  const prepared = prepareEnvelopeForFit(envelope, dt, opts);
  const decay = fitDecayFromEnvelope(prepared.env, prepared.tArr);
  const wobble = trimWobbleWindow(prepared.env, prepared.tArr, decay.detrended);
  const detrendedVariance = detrendedVarianceFromWobbleWindow(wobble);
  return { prepared, decay, wobble, detrendedVariance };
}

/**
 * Fits a two-mode envelope model and derives wolf metrics (`wolfScore`, `category`).
 *
 * Contract: throws if `envelope` is empty (callers must guard upstream).
 */
export function fitTwoModeEnvelopeAndComputeWolfMetrics(
  envelope: number[],
  dt: number,
  opts: { attackSkipMs?: number; maxAnalysisMs?: number } = {},
): FitTwoModeResult {
  ensureNonEmptyEnvelope(envelope);
  const inputs = prepareTwoModeFitInputs(envelope, dt, opts);
  return deriveTwoModeFitResult(inputs, dt);
}

function fitTwoModeWolfMetricsFromInputs(inputs: TwoModeFitInputs, dt: number) {
  const wobbleParams = wobbleParamsFromWindow(inputs.wobble, dt);
  const fitted = fittedEnvelopeFromDecayAndWobbleParams(inputs.wobble, inputs.decay, wobbleParams);
  const { r2, residualVar } = scoreEnvelopeFit(inputs.wobble.env, fitted);
  const { wolfScore, category } = wolfMetricsFromFit(wobbleParams.deltaF, wobbleParams.wobbleDepth, r2);
  return { wobbleParams, r2, residualVar, wolfScore, category };
}

function deriveTwoModeFitResult(inputs: TwoModeFitInputs, dt: number): FitTwoModeResult {
  return isLowSignalTwoModeFit(inputs)
    ? lowSignalTwoModeFitResultFromInputs(inputs)
    : buildFitTwoModeResult(fitTwoModeWolfMetricsFromInputs(inputs, dt), inputs.decay.alpha);
}

function isLowSignalTwoModeFit(inputs: TwoModeFitInputs): boolean {
  return inputs.detrendedVariance < DETRENDED_VARIANCE_MIN || !Number.isFinite(inputs.detrendedVariance);
}

function lowSignalTwoModeFitResultFromInputs(inputs: TwoModeFitInputs): FitTwoModeResult {
  return lowSignalTwoModeFitResult(inputs.decay.alpha, inputs.detrendedVariance);
}

function ensureNonEmptyEnvelope(envelope: number[]) {
  if (!envelope?.length) throw new Error("Empty envelope");
}

function buildFitTwoModeResult(
  metrics: {
    wobbleParams: { deltaF: number; wobbleDepth: number };
    r2: number;
    residualVar: number;
    wolfScore: number;
    category: FitTwoModeResult["category"];
  },
  alpha: number,
): FitTwoModeResult {
  return {
    deltaF: metrics.wobbleParams.deltaF,
    wobbleDepth: metrics.wobbleParams.wobbleDepth,
    alpha,
    r2: metrics.r2,
    residualVar: metrics.residualVar,
    wolfScore: metrics.wolfScore,
    category: metrics.category,
  };
}

// Legacy alias kept to avoid breaking the UI glue code and tests.
export function fitTwoMode(
  envelope: number[],
  dt: number,
  opts: { attackSkipMs?: number; maxAnalysisMs?: number } = {},
): FitTwoModeResult {
  return fitTwoModeEnvelopeAndComputeWolfMetrics(envelope, dt, opts);
}

export function couplingTier(centsAbs: number): CouplingTier {
  return couplingTierFromCentsAbs(centsAbs);
}

function couplingTierFromCentsAbs(centsAbs: number): CouplingTier {
  if (!Number.isFinite(centsAbs)) return "none";
  return couplingTierFromFiniteCents(centsAbs);
}

function couplingTierFromFiniteCents(centsAbs: number): CouplingTier {
  if (centsAbs <= COUPLING_CENTS_STRONG) return "strong";
  return couplingTierFromPossibleCents(centsAbs);
}

function couplingTierFromPossibleCents(centsAbs: number): CouplingTier {
  return centsAbs <= COUPLING_CENTS_POSSIBLE ? "possible" : "none";
}

export function confidenceFrom(
  centsAbs: number | null,
  lateStable: boolean,
  overlapRatio: number | null,
  source: string | null,
): ConfidenceTier {
  if (!Number.isFinite(centsAbs)) return "Low";
  const strong = (centsAbs as number) <= COUPLING_CENTS_STRONG;
  const possible = (centsAbs as number) <= COUPLING_CENTS_POSSIBLE;
  const overlapOk = Number.isFinite(overlapRatio) ? (overlapRatio as number) <= DOMINANCE_OVERLAP_MAX : true;
  let confidence: ConfidenceTier = "Low";
  if (strong && lateStable && overlapOk) confidence = "High";
  else if ((strong && lateStable) || (possible && lateStable && overlapOk)) confidence = "Medium";
  if (source === "Inferred") {
    if (confidence === "High") confidence = "Medium";
    else if (confidence === "Medium") confidence = "Low";
  }
  return confidence;
}


function analyzePartialInstability(
  env: number[],
  dt: number,
  lateDurationSec: number,
  lateDurationMs: number,
): PartialInstabilityEntry {
  return env.length
    ? instabilityFromEnvelope(env, dt, lateDurationSec, lateDurationMs)
    : { unstable: false, beatRate: null, wobbleDepth: null, stability: null };
}

function instabilityFromEnvelope(
  env: number[],
  dt: number,
  lateDurationSec: number,
  lateDurationMs: number,
): PartialInstabilityEntry {
  const res = fitTwoMode(env, dt, { attackSkipMs: 40, maxAnalysisMs: 2000 });
  const unstable = instabilityFromFit(res, lateDurationSec, lateDurationMs);
  return buildPartialInstabilityEntry(res, unstable);
}

function instabilityFromFit(res: FitTwoModeResult, lateDurationSec: number, lateDurationMs: number): boolean {
  const beatUnstable = beatInstabilityFromFit(res, lateDurationSec, lateDurationMs);
  return beatUnstable ?? wobbleInstabilityFromFit(res, lateDurationMs);
}

function buildPartialInstabilityEntry(res: FitTwoModeResult, unstable: boolean): PartialInstabilityEntry {
  return {
    unstable,
    beatRate: res.deltaF,
    wobbleDepth: res.wobbleDepth,
    stability: res.r2,
  };
}

function beatInstabilityFromFit(
  res: FitTwoModeResult,
  lateDurationSec: number,
  lateDurationMs: number,
): boolean | null {
  const cycles = beatCyclesFromFit(res, lateDurationSec);
  return cycles !== null ? cycles >= WOLF_MIN_CYCLES && lateDurationMs >= WOLF_MIN_DURATION_MS : null;
}

function wobbleInstabilityFromFit(res: FitTwoModeResult, lateDurationMs: number): boolean {
  if (Number.isFinite(res.wobbleDepth) && res.wobbleDepth >= WOBBLE_DEPTH_MIN) {
    return lateDurationMs >= WOLF_MIN_DURATION_MS;
  }
  return false;
}

function beatCyclesFromFit(res: FitTwoModeResult, lateDurationSec: number): number | null {
  return Number.isFinite(res.deltaF) && res.deltaF >= BEAT_RATE_MIN
    ? (res.deltaF as number) * lateDurationSec
    : null;
}

function timelineDeriveDeltaT(t: number[]): number | null {
  if (t.length <= 1) return null;
  return Math.max(1e-6, t[1] - t[0]);
}

function partialInstabilityTimelineFromDeltaT(
  t: number[],
  dt: number | null,
): { dt: number; lateDurationSec: number; lateDurationMs: number } | null {
  return partialInstabilityTimelineFromOptionalDeltaT(t, dt);
}

function partialInstabilityTimelineFromOptionalDeltaT(
  t: number[],
  dt: number | null,
): { dt: number; lateDurationSec: number; lateDurationMs: number } | null {
  return partialInstabilityTimelineFromOptionalDeltaTChecked(t, dt);
}

function partialInstabilityTimelineFromOptionalDeltaTChecked(
  t: number[],
  dt: number | null,
): { dt: number; lateDurationSec: number; lateDurationMs: number } | null {
  if (!Number.isFinite(dt) || (dt as number) <= 0) return null;
  return partialInstabilityTimelineFromValidDeltaT(t, dt as number);
}

function partialInstabilityTimelineFromValidDeltaT(
  t: number[],
  dt: number,
): { dt: number; lateDurationSec: number; lateDurationMs: number } {
  const { lateDurationSec, lateDurationMs } = timelineDeriveLateWindowDurations(t);
  return { dt, lateDurationSec, lateDurationMs };
}

function partialInstabilityTimeline(
  t: number[],
): { dt: number; lateDurationSec: number; lateDurationMs: number } | null {
  if (!t.length) return null;
  return partialInstabilityTimelineFromDeltaT(t, timelineDeriveDeltaT(t));
}

function partialInstabilityMapFromKeys(
  keys: string[],
  partialNorm: Record<string, number[]>,
  dt: number,
  lateDurationSec: number,
  lateDurationMs: number,
): Record<string, PartialInstabilityEntry> {
  const out: Record<string, PartialInstabilityEntry> = {};
  keys.forEach((key) => {
    const env = partialNorm[key] || [];
    out[key] = analyzePartialInstability(env, dt, lateDurationSec, lateDurationMs);
  });
  return out;
}

function partialInstabilityMapFromTimeline(
  partialNorm: Record<string, number[]>,
  timeline: { dt: number; lateDurationSec: number; lateDurationMs: number },
): Record<string, PartialInstabilityEntry> {
  const keys = ["f0", "h2", "h3"];
  return partialInstabilityMapFromKeys(
    keys,
    partialNorm,
    timeline.dt,
    timeline.lateDurationSec,
    timeline.lateDurationMs,
  );
}

function partialInstabilityMapFromOptionalTimeline(
  partialNorm: Record<string, number[]>,
  timeline: { dt: number; lateDurationSec: number; lateDurationMs: number } | null,
): Record<string, PartialInstabilityEntry> {
  if (!timeline) return {};
  return partialInstabilityMapFromTimeline(partialNorm, timeline);
}

function partialInstabilityInputsFromSeries(series: EnergySeries): {
  partialNorm: Record<string, number[]>;
  t: number[];
} {
  return {
    partialNorm: series?.partialNorm || {},
    t: series?.t || [],
  };
}

export function isUnstableDecay(result: InstabilityInput): boolean {
  if (!result) return false;
  return unstableDecayFromMetrics(result);
}

function unstableDecayFromMetrics(result: InstabilityInput): boolean {
  const beatUnstable = unstableBeatRate(result.beatRate);
  return beatUnstable !== null ? beatUnstable : unstableWobbleDepth(result.wobbleDepth);
}

function unstableBeatRate(value?: number | null): boolean | null {
  return Number.isFinite(value) ? (value as number) >= BEAT_RATE_MIN : null;
}

function unstableWobbleDepth(value?: number | null): boolean {
  return Number.isFinite(value) ? (value as number) >= WOBBLE_DEPTH_MIN : false;
}

export function computePartialInstabilityMap(series: EnergySeries): Record<string, PartialInstabilityEntry> {
  const { partialNorm, t } = partialInstabilityInputsFromSeries(series);
  return partialInstabilityMapFromOptionalTimeline(partialNorm, partialInstabilityTimeline(t));
}
