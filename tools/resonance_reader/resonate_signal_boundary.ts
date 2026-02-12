import { detectTaps } from "./resonate_transient_detection.js";
import { averageTapSpectra } from "./resonate_tap_spectra.js";

export type SignalBoundary = {
  detectTaps: typeof detectTaps;
  averageTapSpectra: typeof averageTapSpectra;
};

export const signalBoundaryDefault: SignalBoundary = {
  detectTaps,
  averageTapSpectra,
};
