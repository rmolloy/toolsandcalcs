export function noteWindowSliceFindByTime(noteSlices, timeMs) {
    if (!Number.isFinite(timeMs))
        return null;
    return noteSlices.find((slice) => timeMs >= slice.startMs && timeMs <= slice.endMs) || null;
}
export function noteWindowRangeBuildFromSlice(slice) {
    return { start: slice.startMs, end: slice.endMs };
}
export function noteSelectionWindowRequestedFromPlotlyClick(eventPayload) {
    return Boolean(eventPayload?.event?.shiftKey);
}
