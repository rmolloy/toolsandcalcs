import type { ResonanceBoundaryState } from "./resonate_boundary_state.js";
import type { ResonanceBoundarySet } from "./resonate_boundary_resolver.js";

export function resonanceBoundarySeedIntoState(
  state: ResonanceBoundaryState,
  boundaries: Partial<ResonanceBoundarySet>,
) {
  if (boundaries.analysis) state.analysisBoundary = boundaries.analysis;
  if (boundaries.signal) state.signalBoundary = boundaries.signal;
  if (boundaries.overlay) state.overlayBoundary = boundaries.overlay;
}
