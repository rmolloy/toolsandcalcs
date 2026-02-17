import type { RegressionResult } from "./core_types.js";

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function median(values: number[]): number {
  return values.length
    ? medianFromSorted(values.slice().sort((a, b) => a - b))
    : 0;
}

export function medianFromSorted(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function seriesComputeMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function seriesComputeMeanFromOptional(values: number[], mean?: number): number {
  return Number.isFinite(mean) ? (mean as number) : seriesComputeMean(values);
}

export function seriesComputeVariance(values: number[], mean?: number): number {
  return seriesComputeVarianceFromMean(values, seriesComputeMeanFromOptional(values, mean));
}

export function seriesComputeVarianceFromMean(values: number[], mean: number): number {
  if (!values.length) return 0;
  return seriesComputeVarianceSum(values, mean) / values.length;
}

export function seriesComputeVarianceSum(values: number[], mean: number): number {
  return values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
}

export function seriesComputeMeanSquare(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v * v, 0) / values.length;
}

export function linearRegression(xs: number[], ys: number[]): RegressionResult | null {
  const n = xs.length;
  if (n === 0) return null;
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
  if (Math.abs(denom) < 1e-12) return null;
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
