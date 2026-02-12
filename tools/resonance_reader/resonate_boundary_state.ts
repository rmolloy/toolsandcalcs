import type { AnalysisBoundary } from "./resonate_analysis_boundary.js";
import type { SignalBoundary } from "./resonate_signal_boundary.js";
import type { OverlayBoundary } from "./resonate_overlay_boundary.js";

export type NoteSliceState = {
  id: number;
  startMs: number;
  endMs: number;
  samples?: Float32Array;
  sampleRate?: number;
};

export type NoteResultState = {
  id: number;
  f0: number | null;
};

export type ResonanceBoundaryState = {
  analysisBoundary?: AnalysisBoundary;
  signalBoundary?: SignalBoundary;
  overlayBoundary?: OverlayBoundary;
  noteSlices?: NoteSliceState[];
  noteResults?: NoteResultState[];
};
