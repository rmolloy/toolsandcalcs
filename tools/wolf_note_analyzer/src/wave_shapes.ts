/**
 * Waveform shape builders shared by waveform render + relayout.
 */

import { appState } from "./state.js";

function noteSliceStyleResolveBySelection(isSelected: boolean) {
  if (isSelected) {
    return { fillcolor: "rgba(245, 196, 111, 0.2)", lineColor: "rgba(245, 196, 111, 0.8)" };
  }
  return { fillcolor: "rgba(86, 180, 233, 0.12)", lineColor: "rgba(86, 180, 233, 0.25)" };
}

function buildNoteSliceShapes(
  noteSlices: Array<{ id: number; startMs: number; endMs: number }>,
  selectedNoteId: number | null,
  manualSelection: { range: { start: number; end: number } } | null,
) {
  const shapes: any[] = [];
  noteSlices.forEach((note) => {
    const isSelected = selectedNoteId === note.id && !manualSelection;
    const style = noteSliceStyleResolveBySelection(isSelected);
    shapes.push({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: note.startMs,
      x1: note.endMs,
      y0: 0,
      y1: 1,
      fillcolor: style.fillcolor,
      line: { color: style.lineColor, width: 1 },
    });
  });
  return shapes;
}

function buildManualSelectionShapes(manualSelection: { range: { start: number; end: number } } | null) {
  if (!manualSelection) {
    return [];
  }
  return [
    {
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: manualSelection.range.start,
      x1: manualSelection.range.end,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(95, 200, 190, 0.15)",
      line: { color: "rgba(95, 200, 190, 0.5)", width: 1 },
    },
  ];
}

function buildTapSegmentShapes(tapSegments: Array<{ start: number; end: number }>, sampleRate: number) {
  const shapes: any[] = [];
  tapSegments.forEach((tap) => {
    shapes.push({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: (tap.start / sampleRate) * 1000,
      x1: (tap.end / sampleRate) * 1000,
      y0: 0,
      y1: 1,
      fillcolor: "rgba(180, 95, 200, 0.14)",
      line: { color: "rgba(180, 95, 200, 0.45)", width: 1 },
    });
  });
  return shapes;
}

export function buildWaveShapes(sampleRate: number) {
  const shapes: any[] = [];
  shapes.push(...buildNoteSliceShapes(appState.noteSlices, appState.selectedNoteId, appState.manualSelection));
  shapes.push(...buildManualSelectionShapes(appState.manualSelection));
  shapes.push(...buildTapSegmentShapes(appState.tapSegments, sampleRate));
  return shapes;
}

if (typeof window !== "undefined") {
  (window as any).buildWaveShapes = buildWaveShapes;
}
