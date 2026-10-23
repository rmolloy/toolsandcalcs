import type { ComplexTransform } from "./resonate_ringdown_isolation.js";

export type DecayNeighborPeak = { frequencyHz: number; relativeDb: number; prominenceDb: number };
export type DecayNeighborEvidence = {
  method: "hann-decay-window-v1";
  sampleCount: number;
  sampleRate: number;
  durationSec: number;
  binWidthHz: number | null;
  targetToleranceHz: number | null;
  relativeFloorDb: number;
  targetPeakFrequencyHz: number | null;
  peaks: DecayNeighborPeak[];
  status: "measured" | "insufficient_observation" | "no_peak" | "target_not_observed";
};

const DECAY_FIT_DYNAMIC_RANGE_DB = 26;
const MIN_NEIGHBOR_PROMINENCE_DB = 4.5;

export function measureDecayNeighborEvidence(samples: ArrayLike<number>, sampleRate: number, targetFrequencyHz: number, transform: ComplexTransform): DecayNeighborEvidence {
  const evidence = emptyNeighborEvidence(samples.length, sampleRate);
  if (!neighborObservationIsValid(samples, sampleRate, targetFrequencyHz)) return evidence;
  const magnitudes = calculateWindowedMagnitudes(samples, transform);
  const binWidthHz = sampleRate / (magnitudes.length * 2);
  const indices = findSpectralPeakIndices(magnitudes);
  const nearestIndex = findNearestPeakIndex(indices, binWidthHz, targetFrequencyHz);
  if (nearestIndex === null) return { ...evidence, binWidthHz, status: "no_peak" };
  const targetToleranceHz = 1 / evidence.durationSec + binWidthHz / 2;
  const targetIndex = Math.abs(nearestIndex * binWidthHz - targetFrequencyHz) <= targetToleranceHz ? nearestIndex : null;
  return { ...evidence, binWidthHz, targetToleranceHz,
    status: targetIndex === null ? "target_not_observed" : "measured",
    targetPeakFrequencyHz: targetIndex === null ? null : targetIndex * binWidthHz,
    peaks: measureNeighborPeaks(magnitudes, indices, nearestIndex, targetIndex, binWidthHz) };
}

function emptyNeighborEvidence(sampleCount: number, sampleRate: number): DecayNeighborEvidence {
  return { method: "hann-decay-window-v1", sampleCount, sampleRate,
    durationSec: sampleRate > 0 ? sampleCount / sampleRate : 0, binWidthHz: null, targetToleranceHz: null,
    relativeFloorDb: DECAY_FIT_DYNAMIC_RANGE_DB, targetPeakFrequencyHz: null, peaks: [], status: "insufficient_observation" };
}

function neighborObservationIsValid(samples: ArrayLike<number>, sampleRate: number, frequencyHz: number): boolean {
  return Number.isFinite(sampleRate) && sampleRate > 0 && Number.isFinite(frequencyHz)
    && frequencyHz > 0 && frequencyHz < sampleRate / 2 && samples.length >= 4
    && samples.length * frequencyHz / sampleRate >= 6 && Array.from(samples).every(Number.isFinite);
}

function calculateWindowedMagnitudes(samples: ArrayLike<number>, transform: ComplexTransform): Float64Array {
  const length = 2 ** Math.ceil(Math.log2(samples.length));
  const real = new Float64Array(length);
  const imaginary = new Float64Array(length);
  const mean = Array.from(samples).reduce((sum, value) => sum + value, 0) / samples.length;
  for (let index = 0; index < samples.length; index += 1) {
    real[index] = (samples[index] - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * index / (samples.length - 1)));
  }
  transform(real, imaginary);
  return Float64Array.from({ length: length / 2 }, (_, index) => Math.hypot(real[index], imaginary[index]));
}

function findSpectralPeakIndices(magnitudes: Float64Array): number[] {
  const peaks: number[] = [];
  for (let index = 1; index < magnitudes.length - 1; index += 1) {
    if (magnitudes[index] > magnitudes[index - 1] && magnitudes[index] > magnitudes[index + 1]) peaks.push(index);
  }
  return peaks;
}

function findNearestPeakIndex(indices: number[], binWidthHz: number, targetFrequencyHz: number): number | null {
  return indices.reduce<number | null>((nearest, index) => nearest === null
    || Math.abs(index * binWidthHz - targetFrequencyHz) < Math.abs(nearest * binWidthHz - targetFrequencyHz) ? index : nearest, null);
}

function measureNeighborPeaks(magnitudes: Float64Array, indices: number[], referenceIndex: number, targetIndex: number | null, binWidthHz: number): DecayNeighborPeak[] {
  return indices.filter((index) => index !== targetIndex).map((index) => ({
    frequencyHz: index * binWidthHz,
    relativeDb: 20 * Math.log10(magnitudes[index] / magnitudes[referenceIndex]),
    prominenceDb: measurePeakProminenceDb(magnitudes, index),
  })).filter((peak) => peak.relativeDb >= -DECAY_FIT_DYNAMIC_RANGE_DB && peak.prominenceDb >= MIN_NEIGHBOR_PROMINENCE_DB);
}

function measurePeakProminenceDb(magnitudes: Float64Array, index: number): number {
  const trough = Math.max(findAdjacentTrough(magnitudes, index, -1), findAdjacentTrough(magnitudes, index, 1));
  return 20 * Math.log10(magnitudes[index] / Math.max(trough, Number.MIN_VALUE));
}

function findAdjacentTrough(magnitudes: Float64Array, index: number, direction: number): number {
  let trough = magnitudes[index];
  for (let next = index + direction; next >= 0 && next < magnitudes.length && magnitudes[next] <= trough; next += direction) trough = magnitudes[next];
  return trough;
}
