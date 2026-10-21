import { resonanceBoundaryDefaults } from "./resonate_boundary_defaults.js?rev=b5b8fa4adb00";
export function resonanceBoundaryResolveFromOverrides(overrides) {
    return {
        analysis: overrides.analysis || resonanceBoundaryDefaults.analysis,
        signal: overrides.signal || resonanceBoundaryDefaults.signal,
        overlay: overrides.overlay || resonanceBoundaryDefaults.overlay,
    };
}
export function resonanceBoundaryResolveFromState(state) {
    return resonanceBoundaryResolveFromOverrides({
        analysis: state.analysisBoundary,
        signal: state.signalBoundary,
        overlay: state.overlayBoundary,
    });
}
