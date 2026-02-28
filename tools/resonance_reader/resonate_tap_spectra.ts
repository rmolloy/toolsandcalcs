import { FFT_MAX_HZ } from "./resonate_spectrum_config.js";
import { resonanceFftWindowResolve, resonanceTapSliceWindowMsResolve } from "./resonate_debug_flags.js";

export async function averageTapSpectra(
  wave: Float32Array | number[],
  sampleRate: number,
  taps: { start: number; end: number }[],
  fft: any,
) {
  if (!taps.length) return null;
  const windowMs = resonanceTapSliceWindowMsResolve(600);
  const windowSamples = Math.round((windowMs / 1000) * sampleRate);
  const spectra: any[] = [];
  for (let t = 0; t < taps.length; t += 1) {
    const slice = wave.slice(taps[t].start, Math.min(wave.length, taps[t].start + windowSamples));
    if (!slice.length) continue;
    spectra.push(fft.magnitude(slice, sampleRate, { window: resonanceFftWindowResolve(), maxFreq: FFT_MAX_HZ }));
  }
  if (!spectra.length) return null;
  const specs = await Promise.all(spectra);
  const base = specs[0];
  const sum = new Array(base.mags.length).fill(0);
  specs.forEach((s) => {
    s.mags.forEach((m: number, idx: number) => { sum[idx] += m; });
  });
  const avgMags = sum.map((s) => s / specs.length);
  return { freqs: base.freqs, mags: avgMags, dbs: (window as any).FFTPlot.applyDb({ freqs: base.freqs, mags: avgMags }).dbs, tapsUsed: specs.length };
}
