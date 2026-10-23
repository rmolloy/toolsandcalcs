import type { RingdownMath } from "./resonate_ringdown_adaptive.js";
import { analyzeObservedRingdown } from "./resonate_ringdown_observed.js";
import type { RingdownFitInput, RingdownFitResult } from "./resonate_ringdown_worker_protocol.js";

export type RingdownWorkerMath = RingdownMath & {
  analyzeModeRingdown: (input: {
    buffer: Float32Array; sampleRate: number; targetFrequencyHz: number;
    spectrum?: RingdownFitInput["spectrum"]; modeBandwidthHz: number | null;
    smoothWindowMs: number; attackSkipMs: number; fitFloorDb: number;
  }) => RingdownFitResult;
};

export function calculateRingdownFromJob(wave: ArrayLike<number>, sampleRate: number, input: RingdownFitInput, math: RingdownWorkerMath): RingdownFitResult {
  const buffer = copyRingdownWindowFromWave(wave, input.startSample, input.sampleCount);
  if (input.method === "legacy") return math.analyzeModeRingdown({
    buffer, sampleRate, targetFrequencyHz: input.targetFrequencyHz,
    spectrum: input.spectrum, modeBandwidthHz: input.spectralWidthHz,
    smoothWindowMs: 5, attackSkipMs: 40, fitFloorDb: 26,
  });
  return analyzeObservedRingdown({ ...input, wave, buffer, sampleRate }, math);
}

function copyRingdownWindowFromWave(wave: ArrayLike<number>, startSample: number, sampleCount: number): Float32Array {
  if (!Number.isInteger(startSample) || !Number.isInteger(sampleCount) || startSample < 0 || sampleCount <= 0 || startSample + sampleCount > wave.length) {
    throw new Error("Invalid ring-down sample window");
  }
  return Float32Array.from({ length: sampleCount }, (_, index) => Number(wave[startSample + index]) || 0);
}
