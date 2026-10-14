export type NoteWindowRange = { start: number; end: number };
export type NoteWindowSlice = { id: number; startMs: number; endMs: number };

export function noteWindowSliceFindByTime(
  noteSlices: NoteWindowSlice[],
  timeMs: number,
): NoteWindowSlice | null {
  if (!Number.isFinite(timeMs)) return null;
  return noteSlices.find((slice) => timeMs >= slice.startMs && timeMs <= slice.endMs) || null;
}

export function noteWindowRangeBuildFromSlice(slice: NoteWindowSlice): NoteWindowRange {
  return { start: slice.startMs, end: slice.endMs };
}

export function noteSelectionWindowRequestedFromPlotlyClick(eventPayload: any): boolean {
  return Boolean(eventPayload?.event?.shiftKey);
}
