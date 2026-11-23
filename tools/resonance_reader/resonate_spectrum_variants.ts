// The spectrum the Resonance Reader detects peaks on: smoothed as the page's settings say, then put on its dB scale.
import type { AnalysisBoundary } from "./resonate_analysis_boundary.js";
import {
  resonanceSpectrumSmoothingBinsResolve,
  resonanceSpectrumSmoothingHzResolve,
  resonanceSpectrumSmoothingModeResolve,
} from "./resonate_debug_flags.js";
import { spectrumDbApply } from "./resonate_spectrum_db_scale.js";

const FFT_SMOOTH_GAUSSIAN_BINS = 8;

export function refreshSpectrumVariantsBuild(args: {
  analysis: AnalysisBoundary;
  rawSpectrum: { freqs: number[]; mags: number[] };
  displaySpectrum: { freqs: number[]; mags: number[] };
  applyDb: (spectrum: { freqs: number[]; mags: number[] }) => any;
}) {
  const displayMags = spectrumMaybeSmooth(args.analysis, args.displaySpectrum.freqs, args.displaySpectrum.mags);
  return {
    rawSpectrum: spectrumDbApply(args.rawSpectrum, args.applyDb),
    displaySpectrum: spectrumDbApply({ freqs: args.displaySpectrum.freqs, mags: displayMags }, args.applyDb),
  };
}

export function spectrumMaybeSmooth(
  analysis: AnalysisBoundary,
  freqsRaw: number[],
  magsRaw: number[],
) {
  const smoothingMode = resonanceSpectrumSmoothingModeResolve();
  if (smoothingMode === "off") return magsRaw;
  if (smoothingMode === "triangular-hz") {
    return analysis.smoothSpectrumFast(freqsRaw, magsRaw, resonanceSpectrumSmoothingHzResolve(1));
  }
  return analysis.smoothSpectrumGaussianBins(magsRaw, resonanceSpectrumSmoothingBinsResolve(FFT_SMOOTH_GAUSSIAN_BINS));
}
