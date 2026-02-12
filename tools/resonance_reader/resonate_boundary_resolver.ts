import { resonanceBoundaryDefaults } from "./resonate_boundary_defaults.js";
import type { ResonanceBoundaryState } from "./resonate_boundary_state.js";

export type ResonanceBoundarySet = {
  analysis: typeof resonanceBoundaryDefaults.analysis;
  signal: typeof resonanceBoundaryDefaults.signal;
  overlay: typeof resonanceBoundaryDefaults.overlay;
};

export function resonanceBoundaryResolveFromOverrides(overrides: Partial<ResonanceBoundarySet>): ResonanceBoundarySet {
  return {
    analysis: overrides.analysis || resonanceBoundaryDefaults.analysis,
    signal: overrides.signal || resonanceBoundaryDefaults.signal,
    overlay: overrides.overlay || resonanceBoundaryDefaults.overlay,
  };
}

export function resonanceBoundaryResolveFromState(state: ResonanceBoundaryState): ResonanceBoundarySet {
  return resonanceBoundaryResolveFromOverrides({
    analysis: state.analysisBoundary,
    signal: state.signalBoundary,
    overlay: state.overlayBoundary,
  });
}
