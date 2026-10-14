import { modeBands } from "./resonate_mode_config.js";
import { median } from "./resonate_mode_metrics.js";
import { resonanceParabolicPeakRefineEnabled } from "./resonate_debug_flags.js";

export type ModeDetection = {
  mode: string;
  peakFreq: number | null;
  peakDb: number | null;
  peakIdx: number | null;
  prominenceDb: number | null;
};

type ModePeakCandidate = {
  idx: number;
  db: number;
  prominence: number;
};

export function smoothSpectrumFast(freqs: number[], mags: number[], smoothHz: number): number[] {
  if (!smoothHz || smoothHz <= 0) return mags;
  if (freqs.length < 3 || mags.length < 3) return mags;
  const bw = Math.abs(freqs[1] - freqs[0]);
  if (!Number.isFinite(bw) || bw <= 0) return mags;
  const r = Math.max(1, Math.round(smoothHz / bw));
  const n = mags.length;
  const prefix = new Float64Array(n + 1);
  const prefixIdx = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) {
    const v = mags[i];
    prefix[i + 1] = prefix[i] + v;
    prefixIdx[i + 1] = prefixIdx[i] + v * i;
  }
  const sumRange = (a: number, b: number) => prefix[b + 1] - prefix[a];
  const sumIdxRange = (a: number, b: number) => prefixIdx[b + 1] - prefixIdx[a];

  const out = new Array<number>(n);
  const denom = r;
  for (let i = 0; i < n; i += 1) {
    const lo = Math.max(0, i - r);
    const hi = Math.min(n - 1, i + r);
    const leftLo = lo;
    const leftHi = Math.max(lo, i - 1);
    const rightLo = Math.min(hi, i + 1);
    const rightHi = hi;

    let acc = mags[i];
    let wSum = 1;

    if (leftHi >= leftLo && i - 1 >= lo) {
      const count = leftHi - leftLo + 1;
      const base = 1 + i / denom;
      const sumV = sumRange(leftLo, leftHi);
      const sumIV = sumIdxRange(leftLo, leftHi);
      acc += base * sumV - (1 / denom) * sumIV;
      wSum += count * base - (1 / denom) * ((leftLo + leftHi) * count / 2);
    }
    if (rightHi >= rightLo && i + 1 <= hi) {
      const count = rightHi - rightLo + 1;
      const base = 1 - i / denom;
      const sumV = sumRange(rightLo, rightHi);
      const sumIV = sumIdxRange(rightLo, rightHi);
      acc += base * sumV + (1 / denom) * sumIV;
      wSum += count * base + (1 / denom) * ((rightLo + rightHi) * count / 2);
    }
    out[i] = wSum > 0 ? acc / wSum : mags[i];
  }
  return out;
}

export function smoothSpectrumGaussianBins(mags: number[], sigmaBins: number): number[] {
  if (!sigmaBins || sigmaBins <= 0) return mags;
  if (mags.length < 3) return mags;
  const kernel = gaussianKernelBuild(sigmaBins);
  const halfSize = Math.floor(kernel.length / 2);
  const out = new Array<number>(mags.length);
  for (let i = 0; i < mags.length; i += 1) {
    let value = 0;
    for (let j = -halfSize; j <= halfSize; j += 1) {
      const index = i + j;
      if (index >= 0 && index < mags.length) value += mags[index] * kernel[j + halfSize];
    }
    out[i] = value;
  }
  return out;
}

function gaussianKernelBuild(sigmaBins: number) {
  const kernelSize = (Math.ceil(sigmaBins * 3) * 2) + 1;
  const kernel = new Array<number>(kernelSize);
  const halfSize = Math.floor(kernelSize / 2);
  let sum = 0;
  for (let i = -halfSize; i <= halfSize; i += 1) {
    const value = Math.exp(-(i * i) / (2 * sigmaBins * sigmaBins));
    kernel[i + halfSize] = value;
    sum += value;
  }
  return kernel.map((value) => value / sum);
}

function refineParabolicPeak(freqs: number[], ys: number[], idx: number): { freq: number; y: number; delta: number } | null {
  if (idx <= 0 || idx >= ys.length - 1) return null;
  const a = ys[idx - 1];
  const b = ys[idx];
  const c = ys[idx + 1];
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
  const bw = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
  if (!bw || !Number.isFinite(bw) || bw <= 0) return null;
  const denom = a - (2 * b) + c;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
  const delta = 0.5 * (a - c) / denom;
  if (!Number.isFinite(delta)) return null;
  const clamped = Math.max(-1, Math.min(1, delta));
  const freq = freqs[idx] + clamped * bw;
  const y = b - ((a - c) * clamped) / 4;
  return { freq, y, delta: clamped };
}

export function analyzeModes(spectrum: { freqs: number[]; dbs: number[] }): ModeDetection[] {
  return analyzeModesWithBands(spectrum, modeBands);
}

export function analyzeModesWithBands(
  spectrum: { freqs: number[]; dbs: number[] },
  bands: Record<string, { low: number; high: number }>,
): ModeDetection[] {
  return Object.entries(bands).map(([key, band]) => {
    const primary = modePeakCandidatesBuild(spectrum, band)
      .sort((left, right) => right.db - left.db)[0] || null;
    return modeDetectionBuildFromCandidate(key, spectrum, primary);
  });
}

export function analyzeModesWithBandsByQAndLevel(
  spectrum: { freqs: number[]; dbs: number[] },
  bands: Record<string, { low: number; high: number }>,
  estimateQ: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null,
): ModeDetection[] {
  return Object.entries(bands).map(([key, band]) => {
    const primary = modePeakCandidatesBuild(spectrum, band)
      .sort((left, right) => modePeakQAndLevelCompare(spectrum, estimateQ, left, right))[0] || null;
    return modeDetectionBuildFromCandidate(key, spectrum, primary);
  });
}

function modePeakQAndLevelCompare(
  spectrum: { freqs: number[]; dbs: number[] },
  estimateQ: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null,
  left: ModePeakCandidate,
  right: ModePeakCandidate,
) {
  const leftScore = modePeakQAndLevelScoreResolve(spectrum, estimateQ, left);
  const rightScore = modePeakQAndLevelScoreResolve(spectrum, estimateQ, right);
  if (leftScore !== null && rightScore !== null && leftScore !== rightScore) return rightScore - leftScore;
  if (leftScore !== null && rightScore === null) return -1;
  if (leftScore === null && rightScore !== null) return 1;
  return right.db - left.db;
}

function modePeakQAndLevelScoreResolve(
  spectrum: { freqs: number[]; dbs: number[] },
  estimateQ: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null,
  candidate: ModePeakCandidate,
) {
  const frequencyHz = spectrum.freqs[candidate.idx];
  const q = estimateQ(spectrum.freqs, spectrum.dbs, { freq: frequencyHz, db: candidate.db });
  if (!Number.isFinite(q) || (q as number) <= 0) return null;
  const linearAmplitude = 10 ** (candidate.db / 20);
  return (q as number) * linearAmplitude;
}

function modePeakCandidatesBuild(
  spectrum: { freqs: number[]; dbs: number[] },
  band: { low: number; high: number },
) {
  const { freqs, dbs } = spectrum;
  const peaks: ModePeakCandidate[] = [];
  for (let index = 1; index < freqs.length - 1; index += 1) {
    if (!(dbs[index] > dbs[index - 1] && dbs[index] > dbs[index + 1])) continue;
    if (freqs[index] < band.low || freqs[index] > band.high) continue;
    peaks.push({
      idx: index,
      db: dbs[index],
      prominence: modePeakProminenceResolve(dbs, index),
    });
  }
  return peaks;
}

function modePeakProminenceResolve(dbs: number[], index: number) {
  const start = Math.max(0, index - 6);
  const end = Math.min(dbs.length - 1, index + 6);
  const neighbors = dbs.slice(start, end + 1);
  neighbors.splice(index - start, 1);
  const baseline = neighbors.length ? median(neighbors) : dbs[index];
  return dbs[index] - baseline;
}

function modeDetectionBuildFromCandidate(
  mode: string,
  spectrum: { freqs: number[]; dbs: number[] },
  candidate: ModePeakCandidate | null,
): ModeDetection {
  if (!candidate) return { mode, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
  const refined = resonanceParabolicPeakRefineEnabled()
    ? refineParabolicPeak(spectrum.freqs, spectrum.dbs, candidate.idx)
    : null;
  return {
    mode,
    peakFreq: refined?.freq ?? spectrum.freqs[candidate.idx],
    peakDb: refined?.y ?? candidate.db,
    peakIdx: candidate.idx,
    prominenceDb: candidate.prominence,
  };
}
