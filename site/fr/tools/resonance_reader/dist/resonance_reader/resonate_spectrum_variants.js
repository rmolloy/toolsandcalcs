import { resonanceSpectrumSmoothingBinsResolve, resonanceSpectrumSmoothingHzResolve, resonanceSpectrumSmoothingModeResolve, } from "./resonate_debug_flags.js?rev=dae658f6289e";
import { spectrumDbApply } from "./resonate_spectrum_db_scale.js?rev=dae658f6289e";
const FFT_SMOOTH_GAUSSIAN_BINS = 8;
export function refreshSpectrumVariantsBuild(args) {
    const displayMags = spectrumMaybeSmooth(args.analysis, args.displaySpectrum.freqs, args.displaySpectrum.mags);
    return {
        rawSpectrum: spectrumDbApply(args.rawSpectrum, args.applyDb),
        displaySpectrum: spectrumDbApply({ freqs: args.displaySpectrum.freqs, mags: displayMags }, args.applyDb),
    };
}
export function spectrumMaybeSmooth(analysis, freqsRaw, magsRaw) {
    const smoothingMode = resonanceSpectrumSmoothingModeResolve();
    if (smoothingMode === "off")
        return magsRaw;
    if (smoothingMode === "triangular-hz") {
        return analysis.smoothSpectrumFast(freqsRaw, magsRaw, resonanceSpectrumSmoothingHzResolve(1));
    }
    return analysis.smoothSpectrumGaussianBins(magsRaw, resonanceSpectrumSmoothingBinsResolve(FFT_SMOOTH_GAUSSIAN_BINS));
}
