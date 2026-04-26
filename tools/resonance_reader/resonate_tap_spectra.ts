import { FFT_MAX_HZ } from "./resonate_spectrum_config.js";
import { resonanceFftMinSamplesResolve, resonanceFftWindowResolve, resonanceTapSliceWindowMsResolve } from "./resonate_debug_flags.js";

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
  const windowMs = resonanceTapSliceWindowMsResolve(2);
  const windowSamples = Math.round((windowMs / 1000) * sampleRate);
  const spectra: any[] = [];
  for (let t = 0; t < taps.length; t += 1) {
    const slice = wave.slice(taps[t].start, Math.min(wave.length, taps[t].start + windowSamples));
    if (!slice.length) continue;
    spectra.push(fft.magnitude(slice, sampleRate, {
      window: resonanceFftWindowResolve(),
      maxFreq: FFT_MAX_HZ,
      minFftSamples: resonanceFftMinSamplesResolve(),
    }));
  }
  if (!spectra.length) return null;
  const specs = await Promise.all(spectra);
  const base = specs[0];
  const avgMags = tapSpectraAggregateMags(specs);
  return { freqs: base.freqs, mags: avgMags, dbs: (window as any).FFTPlot.applyDb({ freqs: base.freqs, mags: avgMags }).dbs, tapsUsed: specs.length };
}

export function tapSpectraAggregateMags(specs: Array<{ mags: number[] }>) {
  return tapSpectraAggregateMagsByMean(specs);
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
