import type { BiquadCoeffs, BiquadState } from "./core_types.js";

export function designBiquadLowpass(cutoffHz: number, sampleRate: number): BiquadCoeffs {
  const { b0, b1, b2, a0, a1, a2 } = designBiquadLowpassRawCoeffs(cutoffHz, sampleRate);
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

export function applyBiquad(input: ArrayLike<number>, coeffs: BiquadCoeffs): Float64Array {
  const { out, state } = initBiquadOutput(input.length);
  return applyBiquadSamples(input, coeffs, state, out);
}

export function demodulatePartial(
  wave: ArrayLike<number>,
  sampleRate: number,
  freq: number,
  bwHz: number,
  envLpHz: number,
): Float64Array {
  const { iSig, qSig } = mixToBaseband(wave, sampleRate, freq);
  const lpCutoff = Math.max(5, bwHz);
  const iLp = lowpassSeries(iSig, lpCutoff, sampleRate);
  const qLp = lowpassSeries(qSig, lpCutoff, sampleRate);
  const envRaw = magnitudeSeries(iLp, qLp);
  return lowpassSeries(envRaw, envLpHz, sampleRate);
}

function designBiquadLowpassRawCoeffs(cutoffHz: number, sampleRate: number) {
  const { cosw0, sinw0 } = computeBiquadAngleTerms(cutoffHz, sampleRate);
  const alpha = computeBiquadLowpassAlpha(sinw0);
  const { b0, b1, b2 } = computeBiquadLowpassB(cosw0);
  const { a0, a1, a2 } = computeBiquadLowpassA(cosw0, alpha);
  return { b0, b1, b2, a0, a1, a2 };
}

function computeBiquadLowpassA(cosw0: number, alpha: number): { a0: number; a1: number; a2: number } {
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return { a0, a1, a2 };
}

function computeBiquadLowpassB(cosw0: number): { b0: number; b1: number; b2: number } {
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  return { b0, b1, b2 };
}

function computeBiquadLowpassAlpha(sinw0: number): number {
  const Q = Math.SQRT1_2;
  return sinw0 / (2 * Q);
}

function computeBiquadAngleTerms(cutoffHz: number, sampleRate: number) {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  return { cosw0, sinw0 };
}

function initBiquadOutput(length: number): { out: Float64Array; state: BiquadState } {
  return { out: new Float64Array(length), state: { z1: 0, z2: 0 } };
}

function applyBiquadSamples(
  input: ArrayLike<number>,
  coeffs: BiquadCoeffs,
  state: BiquadState,
  out: Float64Array,
): Float64Array {
  for (let i = 0; i < input.length; i += 1) {
    out[i] = applyBiquadSample(input[i] as number, coeffs, state);
  }
  return out;
}

function applyBiquadSample(x: number, coeffs: BiquadCoeffs, state: BiquadState): number {
  const y = coeffs.b0 * x + state.z1;
  state.z1 = coeffs.b1 * x - coeffs.a1 * y + state.z2;
  state.z2 = coeffs.b2 * x - coeffs.a2 * y;
  return y;
}

function lowpassSeries(input: ArrayLike<number>, cutoffHz: number, sampleRate: number): Float64Array {
  const coeffs = designBiquadLowpass(cutoffHz, sampleRate);
  return applyBiquad(input, coeffs);
}

function mixToBaseband(wave: ArrayLike<number>, sampleRate: number, freq: number) {
  const { iSig, qSig } = initBasebandMix(wave.length);
  fillBasebandMix(wave, sampleRate, freq, iSig, qSig);
  return { iSig, qSig };
}

function initBasebandMix(length: number): { iSig: Float64Array; qSig: Float64Array } {
  return { iSig: new Float64Array(length), qSig: new Float64Array(length) };
}

function fillBasebandMix(
  wave: ArrayLike<number>,
  sampleRate: number,
  freq: number,
  iSig: Float64Array,
  qSig: Float64Array,
) {
  for (let n = 0; n < wave.length; n += 1) {
    writeBasebandSample(n, wave, sampleRate, freq, iSig, qSig);
  }
}

function writeBasebandSample(
  n: number,
  wave: ArrayLike<number>,
  sampleRate: number,
  freq: number,
  iSig: Float64Array,
  qSig: Float64Array,
) {
  const t = n / sampleRate;
  const w = wave[n] as number;
  const phi = 2 * Math.PI * freq * t;
  iSig[n] = w * Math.cos(phi);
  qSig[n] = -w * Math.sin(phi);
}

function fillMagnitudeEnvelopeFromIQ(
  env: Float64Array,
  iSig: ArrayLike<number>,
  qSig: ArrayLike<number>,
  len: number,
) {
  for (let n = 0; n < len; n += 1) {
    env[n] = Math.hypot(iSig[n] as number, qSig[n] as number);
  }
}

function magnitudeSeries(iSig: ArrayLike<number>, qSig: ArrayLike<number>): Float64Array {
  const len = Math.min(iSig.length, qSig.length);
  const env = new Float64Array(len);
  fillMagnitudeEnvelopeFromIQ(env, iSig, qSig, len);
  return env;
}
