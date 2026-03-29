import { FFT_MAX_HZ } from "./resonate_spectrum_config.js";
import { resonanceFftWindowResolve, resonanceTapSliceWindowMsResolve } from "./resonate_debug_flags.js";
export async function averageTapSpectra(wave, sampleRate, taps, fft) {
    return aggregateTapSpectra(wave, sampleRate, taps, fft);
}
export async function aggregateTapSpectra(wave, sampleRate, taps, fft) {
    if (!taps.length)
        return null;
    const windowMs = resonanceTapSliceWindowMsResolve(600);
    const windowSamples = Math.round((windowMs / 1000) * sampleRate);
    const spectra = [];
    for (let t = 0; t < taps.length; t += 1) {
        const slice = wave.slice(taps[t].start, Math.min(wave.length, taps[t].start + windowSamples));
        if (!slice.length)
            continue;
        spectra.push(fft.magnitude(slice, sampleRate, { window: resonanceFftWindowResolve(), maxFreq: FFT_MAX_HZ }));
    }
    if (!spectra.length)
        return null;
    const specs = await Promise.all(spectra);
    const base = specs[0];
    const avgMags = tapSpectraAggregateMags(specs);
    return { freqs: base.freqs, mags: avgMags, dbs: window.FFTPlot.applyDb({ freqs: base.freqs, mags: avgMags }).dbs, tapsUsed: specs.length };
}
export function tapSpectraAggregateMags(specs) {
    return tapSpectraAggregateMagsByMean(specs);
}
export function tapSpectraAggregateMagsByMean(specs) {
    const sum = new Array(specs[0]?.mags?.length || 0).fill(0);
    specs.forEach((s) => {
        s.mags.forEach((m, idx) => { sum[idx] += m; });
    });
    return sum.map((total) => total / specs.length);
}
export function tapSpectraAggregateMagsByMedian(specs) {
    const width = specs[0]?.mags?.length || 0;
    return Array.from({ length: width }, (_, index) => tapSpectrumBinMedianResolve(specs, index));
}
function tapSpectrumBinMedianResolve(specs, index) {
    const sorted = specs
        .map((spec) => Number(spec.mags[index]))
        .filter((value) => Number.isFinite(value))
        .sort((left, right) => left - right);
    if (!sorted.length)
        return 0;
    const middleIndex = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1)
        return sorted[middleIndex];
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}
