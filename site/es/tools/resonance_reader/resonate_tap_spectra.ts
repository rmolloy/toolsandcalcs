import { FFT_MAX_HZ } from "./resonate_spectrum_config.js";
import {
  resonanceFftMinSamplesResolve,
  resonanceFftWindowResolve,
  resonanceTapSliceWindowMsResolve,
  resonanceUsePaddedTapWindowResolve,
  resonanceUseTapOnsetAlignmentResolve,
} from "./resonate_debug_flags.js";

export const TAP_ANALYSIS_WINDOW_MS = 400;
export const TAP_PRE_ONSET_MS = 100;
const TAP_CAPTURE_WINDOW_MS = 500;
const TAP_CAPTURE_PRE_ROLL_MS = 200;
const TAP_ONSET_NOISE_ESTIMATE_SAMPLES = 2048;
const TAP_ONSET_THRESHOLD_MULTIPLIER = 10;
const TAP_ONSET_MIN_THRESHOLD = 0.001;
const TAP_ONSET_BACKUP_SAMPLES = 32;
type ResonanceFftWindow = "hann" | "hamming" | "rect";

export async function averageTapSpectra(
  wave: Float32Array | number[],
  sampleRate: number,
  taps: { start: number; end: number }[],
  fft: any,
) {
  return aggregateTapSpectra(wave, sampleRate, taps, fft);
}

export async function aggregateTapSpectra(
  wave: Float32Array | number[],
  sampleRate: number,
  taps: { start: number; end: number }[],
  fft: any,
) {
  if (!taps.length) return null;
  const windowMs = resonanceTapSliceWindowMsResolve(TAP_ANALYSIS_WINDOW_MS);
  const windowSamples = Math.round((windowMs / 1000) * sampleRate);
  const preOnsetSamples = Math.round((TAP_PRE_ONSET_MS / 1000) * sampleRate);
  const spectra: any[] = [];
  for (let t = 0; t < taps.length; t += 1) {
    const slice = tapWaveSliceExtract(wave, sampleRate, taps[t].start, preOnsetSamples, windowSamples);
    if (!slice.length) continue;
    spectra.push(tapSpectrumCalculate(slice, sampleRate, fft));
  }
  if (!spectra.length) return null;
  const specs = await Promise.all(spectra);
  const base = specs[0];
  const avgMags = tapSpectraAggregateMags(specs);
  return { freqs: base.freqs, mags: avgMags, dbs: (window as any).FFTPlot.applyDb({ freqs: base.freqs, mags: avgMags }).dbs, tapsUsed: specs.length };
}

export function tapSpectraAggregateMags(specs: Array<{ mags: number[] }>) {
  return tapSpectraAggregateMagsByPowerMean(specs);
}

export function tapSpectraAggregateMagsByPowerMean(specs: Array<{ mags: number[] }>) {
  const width = specs[0]?.mags?.length || 0;
  return Array.from({ length: width }, (_, index) => tapSpectrumBinPowerMeanResolve(specs, index));
}

export function tapSpectraAggregateMagsByMean(specs: Array<{ mags: number[] }>) {
  const sum = new Array(specs[0]?.mags?.length || 0).fill(0);
  specs.forEach((s) => {
    s.mags.forEach((m: number, idx: number) => { sum[idx] += m; });
  });
  return sum.map((total) => total / specs.length);
}

export function tapSpectraAggregateMagsByMedian(specs: Array<{ mags: number[] }>) {
  const width = specs[0]?.mags?.length || 0;
  return Array.from({ length: width }, (_, index) => tapSpectrumBinMedianResolve(specs, index));
}

function tapSpectrumBinMedianResolve(specs: Array<{ mags: number[] }>, index: number) {
  const sorted = specs
    .map((spec) => Number(spec.mags[index]))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const middleIndex = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middleIndex];
  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

function tapSpectrumBinPowerMeanResolve(specs: Array<{ mags: number[] }>, index: number) {
  const powers = specs
    .map((spec) => Number(spec.mags[index]))
    .filter((magnitude) => Number.isFinite(magnitude))
    .map((magnitude) => magnitude * magnitude);
  if (!powers.length) return 0;
  const totalPower = powers.reduce((total, power) => total + power, 0);
  return Math.sqrt(totalPower / powers.length);
}

function tapWaveSliceExtract(
  wave: Float32Array | number[],
  sampleRate: number,
  tapStart: number,
  preOnsetSamples: number,
  windowSamples: number,
) {
  if (resonanceUseTapOnsetAlignmentResolve()) {
    return tapAlignedWaveSliceExtract(wave, sampleRate, tapStart, preOnsetSamples, windowSamples);
  }
  const sliceStart = Math.max(0, tapStart - preOnsetSamples);
  const sliceEnd = Math.min(wave.length, sliceStart + windowSamples);
  return wave.slice(sliceStart, sliceEnd);
}

function tapAlignedWaveSliceExtract(
  wave: Float32Array | number[],
  sampleRate: number,
  tapStart: number,
  preOnsetSamples: number,
  windowSamples: number,
) {
  const capture = tapCaptureBufferBuild(wave, sampleRate, tapStart);
  if (capture.length < TAP_ONSET_NOISE_ESTIMATE_SAMPLES) {
    const sliceStart = Math.max(0, tapStart - preOnsetSamples);
    const sliceEnd = Math.min(wave.length, sliceStart + windowSamples);
    return wave.slice(sliceStart, sliceEnd);
  }
  return tapCaptureAlignToOnset(capture, preOnsetSamples, windowSamples);
}

function tapCaptureBufferBuild(wave: Float32Array | number[], sampleRate: number, tapStart: number) {
  const captureSamples = Math.round((TAP_CAPTURE_WINDOW_MS / 1000) * sampleRate);
  const preRollSamples = Math.round((TAP_CAPTURE_PRE_ROLL_MS / 1000) * sampleRate);
  const captureStart = Math.max(0, tapStart - preRollSamples);
  const capture = new Float32Array(captureSamples);
  for (let index = 0; index < captureSamples; index += 1) {
    const sourceIndex = captureStart + index;
    if (sourceIndex >= wave.length) break;
    capture[index] = Number(wave[sourceIndex]);
  }
  return capture;
}

function tapCaptureAlignToOnset(capture: Float32Array, preOnsetSamples: number, windowSamples: number) {
  const onsetSample = tapOnsetSampleResolve(capture);
  if (onsetSample === null) return capture.slice(0, windowSamples);
  const extractStart = onsetSample - preOnsetSamples;
  return tapCaptureWindowExtract(capture, extractStart, windowSamples);
}

function tapOnsetSampleResolve(capture: Float32Array) {
  const threshold = tapOnsetThresholdResolve(capture);
  for (let index = 0; index < capture.length; index += 1) {
    if (Math.abs(capture[index]) > threshold) return Math.max(0, index - TAP_ONSET_BACKUP_SAMPLES);
  }
  return null;
}

function tapOnsetThresholdResolve(capture: Float32Array) {
  let totalSquares = 0;
  for (let index = 0; index < TAP_ONSET_NOISE_ESTIMATE_SAMPLES; index += 1) {
    totalSquares += capture[index] * capture[index];
  }
  const noiseRms = Math.sqrt(totalSquares / TAP_ONSET_NOISE_ESTIMATE_SAMPLES);
  return Math.max(noiseRms * TAP_ONSET_THRESHOLD_MULTIPLIER, TAP_ONSET_MIN_THRESHOLD);
}

function tapCaptureWindowExtract(capture: Float32Array, extractStart: number, windowSamples: number) {
  const result = new Float32Array(windowSamples);
  for (let index = 0; index < windowSamples; index += 1) {
    const sourceIndex = extractStart + index;
    if (sourceIndex < 0 || sourceIndex >= capture.length) continue;
    result[index] = capture[sourceIndex];
  }
  return result;
}

function tapSpectrumCalculate(slice: Float32Array | number[], sampleRate: number, fft: any) {
  const minFftSamples = resonanceFftMinSamplesResolve();
  const fftWindow = resonanceFftWindowResolve();
  const input = tapFftInputBuild(slice, fftWindow, minFftSamples);
  return fft.magnitude(input.samples, sampleRate, {
    window: input.window,
    maxFreq: FFT_MAX_HZ,
    minFftSamples: input.minFftSamples,
  });
}

function tapFftInputBuild(slice: Float32Array | number[], fftWindow: ResonanceFftWindow, minFftSamples: number) {
  if (!resonanceUsePaddedTapWindowResolve() || fftWindow === "rect") {
    return { samples: slice, window: fftWindow, minFftSamples };
  }
  const paddedSamples = tapWindowedPaddedSamplesBuild(slice, fftWindow, minFftSamples);
  return { samples: paddedSamples, window: "rect" as const, minFftSamples: paddedSamples.length };
}

function tapWindowedPaddedSamplesBuild(
  slice: Float32Array | number[],
  fftWindow: Exclude<ResonanceFftWindow, "rect">,
  minFftSamples: number,
) {
  const paddedLength = tapFftPaddedLengthResolve(slice.length, minFftSamples);
  const padded = new Float64Array(paddedLength);
  for (let index = 0; index < slice.length; index += 1) {
    padded[index] = Number(slice[index]) * tapWindowCoefficientResolve(fftWindow, index, paddedLength);
  }
  return padded;
}

function tapFftPaddedLengthResolve(inputLength: number, minFftSamples: number) {
  const target = Math.max(1, inputLength, minFftSamples);
  return 1 << Math.ceil(Math.log2(target));
}

function tapWindowCoefficientResolve(windowType: Exclude<ResonanceFftWindow, "rect">, index: number, length: number) {
  const fraction = index / (length - 1 || 1);
  if (windowType === "hann") return 0.5 * (1 - Math.cos(2 * Math.PI * fraction));
  return 0.54 - 0.46 * Math.cos(2 * Math.PI * fraction);
}
