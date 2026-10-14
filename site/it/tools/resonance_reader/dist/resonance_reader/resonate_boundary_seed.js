export function resonanceBoundarySeedIntoState(state, boundaries) {
    if (boundaries.analysis)
        state.analysisBoundary = boundaries.analysis;
    if (boundaries.signal)
        state.signalBoundary = boundaries.signal;
    if (boundaries.overlay)
        state.overlayBoundary = boundaries.overlay;
}
