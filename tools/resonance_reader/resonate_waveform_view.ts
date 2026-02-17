import { waveformLabelResolveFromContext } from "./resonate_waveform_label.js";
import {
  noteWindowRangeBuildFromSlice,
  noteWindowSliceFindByTime,
  noteSelectionWindowRequestedFromPlotlyClick,
} from "./resonate_note_window_selection.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";

type WaveformViewDeps = {
  state: Record<string, any>;
  setStatus: (text: string) => void;
  runResonatePipeline: (trigger: string) => Promise<void>;
};

let waveUpdatingShapes = false;
const TAP_CLUSTER_GAP_MS = 220;
const NOTE_CLUSTER_GAP_MS = 320;
const FALLBACK_WINDOW_MIN_MS = 900;
const FALLBACK_WINDOW_MAX_MS = 3000;
const FALLBACK_WINDOW_RATIO = 0.22;
const RANGE_DRAG_EDGE_TOLERANCE_PX = 10;
const RANGE_DRAG_MIN_WIDTH_MS = 80;

type WaveRange = { start: number; end: number };
type RangeDragMode = "move" | "resize-left" | "resize-right";
type RangeDragTarget = { rangeKind: "primary" | "note"; dragMode: RangeDragMode };
type RangeDragSession = {
  target: RangeDragTarget;
  startCursorMs: number;
  startRange: WaveRange;
};

function waveRangeFingerprint(range: WaveRange | null | undefined) {
  if (!range) return "none";
  return `${range.start}:${range.end}`;
}

function primaryRangePipelineShouldTriggerFromRangeChange(
  state: Record<string, any>,
  nextRange: WaveRange | null | undefined,
) {
  const nextFingerprint = waveRangeFingerprint(nextRange);
  if (state.lastPrimaryRangePipelineFingerprint === nextFingerprint) return false;
  state.lastPrimaryRangePipelineFingerprint = nextFingerprint;
  return true;
}

function noteRangePipelineShouldTriggerFromRangeChange(
  state: Record<string, any>,
  nextRange: WaveRange | null | undefined,
) {
  const nextFingerprint = waveRangeFingerprint(nextRange);
  if (state.lastNoteRangePipelineFingerprint === nextFingerprint) return false;
  state.lastNoteRangePipelineFingerprint = nextFingerprint;
  return true;
}

function buildSelectionShapes(range: { start: number; end: number } | null) {
  if (!range) return [];
  return [
    {
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: range.start,
      x1: range.end,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("wavePrimarySelection", 0.95), width: 2 },
      fillcolor: resolveColorRgbaFromRole("wavePrimarySelection", 0.1),
    },
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: range.start,
      x1: range.start,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("wavePrimarySelection", 0.95), width: 6 },
    },
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: range.end,
      x1: range.end,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("wavePrimarySelection", 0.95), width: 6 },
    },
  ];
}

function buildNoteSelectionShapes(range: { start: number; end: number } | null) {
  if (!range) return [];
  return [
    {
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: range.start,
      x1: range.end,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("waveNoteSelection", 0.95), width: 2 },
      fillcolor: resolveColorRgbaFromRole("waveNoteSelection", 0.1),
    },
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: range.start,
      x1: range.start,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("waveNoteSelection", 0.95), width: 6 },
    },
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: range.end,
      x1: range.end,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("waveNoteSelection", 0.95), width: 6 },
    },
  ];
}

function buildTapSegmentShapes(tapSegments: Array<{ start: number; end: number }>, sampleRate: number) {
  const shapes: any[] = [];
  tapSegments.forEach((tap) => {
    const midMs = ((tap.start + tap.end) / 2 / sampleRate) * 1000;
    shapes.push({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: midMs,
      x1: midMs,
      y0: 0,
      y1: 1,
      line: { color: resolveColorRgbaFromRole("waveTapMarker", 0.55), width: 2 },
    });
  });
  return shapes;
}

function buildNoteSliceShapes(noteSlices: Array<{ id: number; startMs: number; endMs: number }>, activeRange: { start: number; end: number } | null) {
  const shapes: any[] = [];
  noteSlices.forEach((note) => {
    const isSelected = activeRange && note.startMs >= activeRange.start && note.endMs <= activeRange.end;
    shapes.push({
      type: "rect",
      xref: "x",
      yref: "paper",
      x0: note.startMs,
      x1: note.endMs,
      y0: 0,
      y1: 1,
      fillcolor: isSelected
        ? resolveColorRgbaFromRole("wavePrimarySelection", 0.2)
        : resolveColorRgbaFromRole("fftLine", 0.12),
      line: {
        color: isSelected
          ? resolveColorRgbaFromRole("wavePrimarySelection", 0.8)
          : resolveColorRgbaFromRole("fftLine", 0.25),
        width: 1,
      },
    });
  });
  return shapes;
}

function noteLabelFromFreq(freq: number | null) {
  if (!Number.isFinite(freq)) return null;
  const FFTUtils = (window as any).FFTUtils;
  if (!FFTUtils?.freqToNoteCents) return null;
  try {
    const out = FFTUtils.freqToNoteCents(freq);
    const name = typeof out?.name === "string" ? out.name : null;
    return name;
  } catch {
    return null;
  }
}

function resolveWaveLabelFromContext(
  f0: number | null,
  noteSlice: { id?: number; startMs?: number; endMs?: number; samples?: Float32Array; sampleRate?: number } | null,
  deps: WaveformViewDeps,
) {
  return waveformLabelResolveFromContext({
    f0,
    measureMode: deps.state.measureMode,
    modesDetected: deps.state.lastModesDetected || [],
    noteSliceSampleCount: noteSlice?.samples?.length,
    noteSliceSampleRate: noteSlice?.sampleRate,
    debugMeta: {
      noteSliceId: noteSlice?.id,
      noteSliceStartMs: noteSlice?.startMs,
      noteSliceEndMs: noteSlice?.endMs,
      measureMode: deps.state.measureMode,
    },
    noteNameResolve: (freq) => noteLabelFromFreq(freq),
  });
}

function buildWaveAnnotations(
  noteSlices: Array<{ id: number; startMs: number; endMs: number }>,
  noteResults: Array<{ id: number; f0: number | null }>,
  deps: WaveformViewDeps,
) {
  const annotations: any[] = [];
  noteSlices.forEach((note) => {
    const result = noteResults.find((n) => n.id === note.id);
    const label = resolveWaveLabelFromContext(result?.f0 ?? null, note as any, deps);
    if (!label) return;
    const mid = (note.startMs + note.endMs) / 2;
    annotations.push({
      x: mid,
      y: 0.95,
      xref: "x",
      yref: "paper",
      text: label,
      showarrow: false,
      font: { color: "rgba(255,255,255,0.7)", size: 11 },
    });
  });
  return annotations;
}

function buildWaveShapes(
  sampleRate: number,
  primaryRange: { start: number; end: number } | null,
  noteSelectionRange: { start: number; end: number } | null,
  tapSegments: Array<{ start: number; end: number }> | null | undefined,
  noteSlices: Array<{ id: number; startMs: number; endMs: number }> | null | undefined,
) {
  const shapes: any[] = [];
  shapes.push(...buildNoteSliceShapes(noteSlices || [], primaryRange));
  shapes.push(...buildTapSegmentShapes(tapSegments || [], sampleRate));
  shapes.push(...buildNoteSelectionShapes(noteSelectionRange));
  shapes.push(...buildSelectionShapes(primaryRange));
  return shapes;
}

function renderWaveSelection(
  primaryRange: { start: number; end: number } | null,
  noteSelectionRange: { start: number; end: number } | null,
  deps: WaveformViewDeps,
  slice: any,
) {
  const plot = document.getElementById("plot_waveform");
  if (!plot) return;
  const Plotly = (window as any).Plotly;
  if (!Plotly) return;
  const shapes = buildWaveShapes(
    slice.sampleRate,
    primaryRange,
    noteSelectionRange,
    deps.state.tapSegments,
    deps.state.noteSlices,
  );

  waveUpdatingShapes = true;
  Promise.resolve(Plotly.relayout(plot, { shapes })).finally(() => {
    waveUpdatingShapes = false;
  });
}

function makeWaveNavigatorPlot(
  slice: any,
  deps: WaveformViewDeps,
  onPrimaryRangeChange: (range: any) => void,
  onNoteSelectionRangeChange: (range: any) => void,
) {
  const plot = document.getElementById("plot_waveform");
  if (!plot) return;
  const Plotly = (window as any).Plotly;
  if (!Plotly) return;

  const absWave = Array.from(slice.wave, (v: number) => Math.abs(v));
  const timeMs = Array.isArray(slice.timeMs)
    ? slice.timeMs
    : Array.from({ length: absWave.length }, (_, i) => (i / slice.sampleRate) * 1000);
  const maxAbs = absWave.reduce((max, v) => (Number.isFinite(v) && v > max ? v : max), 0);
  const yMax = maxAbs > 0 ? maxAbs * 1.05 : 1;
  const plotlyWaveToolsEnabled = plotlyWaveToolsEnabledResolve();
  deps.state.waveRenderDebug = { maxAbs, yMax };
  const trace = {
    x: timeMs,
    y: absWave,
    type: "scatter",
    mode: "lines",
    fill: "tozeroy",
    fillcolor: resolveColorRgbaFromRole("fftLine", 0.16),
    line: { color: resolveColorHexFromRole("fftLine"), width: 1.5 },
    hovertemplate: "%{x:.0f} ms<extra></extra>",
  };

  const layout = {
    margin: { l: 40, r: 10, t: 6, b: 26 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    showlegend: false,
    xaxis: {
      showgrid: false,
      zeroline: false,
      color: "rgba(255,255,255,0.45)",
      title: "",
      fixedrange: !plotlyWaveToolsEnabled,
    },
    yaxis: {
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      fixedrange: true,
    },
    shapes: buildWaveShapes(
      slice.sampleRate,
      deps.state.viewRangeMs || null,
      deps.state.noteSelectionRangeMs || null,
      deps.state.tapSegments,
      deps.state.noteSlices,
    ),
    annotations: buildWaveAnnotations(deps.state.noteSlices || [], deps.state.noteResults || [], deps),
  };

  Plotly.newPlot(plot, [trace], layout, {
    displayModeBar: plotlyWaveToolsEnabled,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: plotlyWaveToolsEnabled
      ? ["select2d", "lasso2d"]
      : ["zoom2d", "pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "autoScale2d"],
  });

  if (typeof (plot as any).removeAllListeners === "function") {
    (plot as any).removeAllListeners("plotly_relayout");
    (plot as any).removeAllListeners("plotly_click");
  }
  (plot as any).on("plotly_click", (ev: any) => {
    if ((plot as any).__resonateSuppressClick) {
      (plot as any).__resonateSuppressClick = false;
      return;
    }
    const pt = ev?.points?.[0];
    if (!pt) return;
    const x = pt.x as number;
    if (!Number.isFinite(x)) return;
    const note = noteWindowSliceFindByTime(deps.state.noteSlices || [], x);
    if (note) {
      const range = noteWindowRangeBuildFromSlice(note);
      if (noteSelectionWindowRequestedFromPlotlyClick(ev)) {
        deps.state.noteSelectionRangeMs = range;
        renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
        onNoteSelectionRangeChange?.(range);
        return;
      }
      deps.state.viewRangeMs = range;
      renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
      onPrimaryRangeChange?.(range);
      return;
    }
    const tap = (deps.state.tapSegments || []).find((seg: { start: number; end: number }) => {
      const startMs = (seg.start / slice.sampleRate) * 1000;
      const endMs = (seg.end / slice.sampleRate) * 1000;
      return x >= startMs && x <= endMs;
    });
    if (!tap) return;
    const range = {
      start: (tap.start / slice.sampleRate) * 1000,
      end: (tap.end / slice.sampleRate) * 1000,
    };
    deps.state.viewRangeMs = range;
    renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
    onPrimaryRangeChange?.(range);
  });
  (plot as any).on("plotly_relayout", (ev: any) => {
    if (waveUpdatingShapes) return;
    const range0 = ev["xaxis.range[0]"];
    const range1 = ev["xaxis.range[1]"];
    const auto = ev["xaxis.autorange"];
    if (auto || range0 === undefined || range1 === undefined) {
      if ((plot as any).__resonateShiftDragActive) {
        deps.state.noteSelectionRangeMs = null;
        renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
        onNoteSelectionRangeChange?.(null);
      } else {
        deps.state.viewRangeMs = null;
        renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
        onPrimaryRangeChange?.(null);
      }
      return;
    }
    const start = Number(range0);
    const end = Number(range1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const range = { start, end };
    if ((plot as any).__resonateShiftDragActive) {
      deps.state.noteSelectionRangeMs = range;
      renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
      onNoteSelectionRangeChange?.(range);
    } else {
      deps.state.viewRangeMs = range;
      renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
      onPrimaryRangeChange?.(range);
    }
  });

  renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
  bindNoteSelectionResizeModifierTracking(plot as HTMLElement);
  bindRangeDirectDragInteractions(plot as HTMLElement, deps, slice, onPrimaryRangeChange, onNoteSelectionRangeChange);
}

export function renderWaveform(slice: any, deps: WaveformViewDeps) {
  const handlers = waveformRangeHandlersBuild(deps);
  const autoPrimaryRange = primaryRangeAutoSelectFromState(slice, deps.state);
  if (autoPrimaryRange) {
    handlers.onPrimaryRangeChange(autoPrimaryRange);
  }
  const autoNoteSelectionRange = noteSelectionRangeAutoSelectFromState(slice, deps.state);
  if (autoNoteSelectionRange) {
    handlers.onNoteSelectionRangeChange(autoNoteSelectionRange);
  }
  makeWaveNavigatorPlot(slice, deps, handlers.onPrimaryRangeChange, handlers.onNoteSelectionRangeChange);
}

export function noteSelectionRangeAutoSelectFromState(slice: any, state: Record<string, any>) {
  if (state.noteSelectionRangeMs) return null;
  const noteSlices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  if (!noteSlices.length) return fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
  const range = largestContiguousRangeClusterBuild(
    noteSlices.map((slice: { startMs: number; endMs: number }) => ({ start: slice.startMs, end: slice.endMs })),
    NOTE_CLUSTER_GAP_MS,
  );
  return range || fallbackRangeOnRightFromDuration(waveDurationMsResolve(state, slice));
}

export function primaryRangeAutoSelectFromState(slice: any, state: Record<string, any>) {
  if (state.viewRangeMs) return null;
  const taps = Array.isArray(state.tapSegments) ? state.tapSegments : [];
  if (!taps.length) return fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
  const ranges = taps
    .map((tap: { start: number; end: number }) => ({
      start: (tap.start / slice.sampleRate) * 1000,
      end: (tap.end / slice.sampleRate) * 1000,
    }))
    .filter((range: { start: number; end: number }) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start);
  const range = largestContiguousRangeClusterBuild(ranges, TAP_CLUSTER_GAP_MS);
  return range || fallbackRangeOnLeftFromDuration(waveDurationMsResolve(state, slice));
}

function waveDurationMsResolve(state: Record<string, any>, slice?: any) {
  const fromSlice = Number(slice?.timeMs?.[slice.timeMs.length - 1]);
  if (Number.isFinite(fromSlice) && fromSlice > 0) return fromSlice;
  const fromCurrentWave = Number(state?.currentWave?.fullLengthMs);
  if (Number.isFinite(fromCurrentWave) && fromCurrentWave > 0) return fromCurrentWave;
  const fromState = Number(state?.endMs);
  if (Number.isFinite(fromState) && fromState > 0) return fromState;
  return 5000;
}

function fallbackWindowMsResolve(durationMs: number) {
  const scaled = durationMs * FALLBACK_WINDOW_RATIO;
  return Math.max(FALLBACK_WINDOW_MIN_MS, Math.min(FALLBACK_WINDOW_MAX_MS, scaled));
}

function fallbackRangeOnLeftFromDuration(durationMs: number) {
  const windowMs = fallbackWindowMsResolve(durationMs);
  const end = Math.min(durationMs, windowMs);
  return { start: 0, end };
}

function fallbackRangeOnRightFromDuration(durationMs: number) {
  const windowMs = fallbackWindowMsResolve(durationMs);
  const start = Math.max(0, durationMs - windowMs);
  return { start, end: Math.max(start, durationMs) };
}

function largestContiguousRangeClusterBuild(ranges: Array<{ start: number; end: number }>, gapMs: number) {
  if (!ranges.length) return null;
  const sorted = ranges
    .slice()
    .sort((left, right) => left.start - right.start || left.end - right.end);
  let clusters: Array<{ start: number; end: number }> = [];
  sorted.forEach((range) => {
    const current = clusters[clusters.length - 1];
    if (!current || range.start - current.end > gapMs) {
      clusters.push({ ...range });
      return;
    }
    current.end = Math.max(current.end, range.end);
  });
  return clusters.reduce((best, cluster) => {
    if (!best) return cluster;
    const bestWidth = best.end - best.start;
    const currentWidth = cluster.end - cluster.start;
    if (currentWidth > bestWidth) return cluster;
    if (currentWidth === bestWidth && cluster.start < best.start) return cluster;
    return best;
  }, null as { start: number; end: number } | null);
}

function bindNoteSelectionResizeModifierTracking(plot: HTMLElement) {
  const anyPlot = plot as any;
  if (anyPlot.__resonateShiftDragBound) return;
  const onPointerDown = (event: MouseEvent) => {
    anyPlot.__resonateShiftDragActive = Boolean(event.shiftKey);
  };
  const onPointerUp = () => {
    anyPlot.__resonateShiftDragActive = false;
  };
  plot.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mouseup", onPointerUp);
  anyPlot.__resonateShiftDragBound = true;
  anyPlot.__resonateShiftDragActive = false;
}

function bindRangeDirectDragInteractions(
  plot: HTMLElement,
  deps: WaveformViewDeps,
  slice: any,
  onPrimaryRangeChange: (range: any) => void,
  onNoteSelectionRangeChange: (range: any) => void,
) {
  const anyPlot = plot as any;
  if (anyPlot.__resonateRangeDragBound) return;
  const onPointerDown = (event: MouseEvent) => {
    if (plotlyWaveToolsEnabledResolve()) return;
    if (event.button !== 0) return;
    const cursorMs = waveformMsAtPointerResolve(plot, event);
    if (!Number.isFinite(cursorMs)) return;
    const axis = waveformAxisRangeResolve(plot);
    if (!axis) return;
    const target = rangeDragTargetResolve(
      cursorMs,
      axis.min,
      axis.max,
      axis.widthPx,
      deps.state.viewRangeMs || null,
      deps.state.noteSelectionRangeMs || null,
    );
    if (!target) return;
    const activeRange = target.rangeKind === "note"
      ? deps.state.noteSelectionRangeMs || null
      : deps.state.viewRangeMs || null;
    if (!activeRange) return;
    anyPlot.__resonateRangeDrag = {
      target,
      startCursorMs: cursorMs,
      startRange: { start: activeRange.start, end: activeRange.end },
    } as RangeDragSession;
    anyPlot.__resonateSuppressClick = true;
    event.preventDefault();
  };
  const onPointerMove = (event: MouseEvent) => {
    const session = anyPlot.__resonateRangeDrag as RangeDragSession | undefined;
    if (!session) return;
    const cursorMs = waveformMsAtPointerResolve(plot, event);
    if (!Number.isFinite(cursorMs)) return;
    const axis = waveformAxisRangeResolve(plot);
    if (!axis) return;
    const nextRange = rangeDragApply(
      session.startRange,
      session.startCursorMs,
      cursorMs,
      session.target.dragMode,
      axis.min,
      axis.max,
    );
    if (!nextRange) return;
    if (session.target.rangeKind === "note") {
      deps.state.noteSelectionRangeMs = nextRange;
    } else {
      deps.state.viewRangeMs = nextRange;
    }
    renderWaveSelection(deps.state.viewRangeMs || null, deps.state.noteSelectionRangeMs || null, deps, slice);
  };
  const onPointerUp = () => {
    const session = anyPlot.__resonateRangeDrag as RangeDragSession | undefined;
    if (!session) return;
    const range = session.target.rangeKind === "note"
      ? deps.state.noteSelectionRangeMs || null
      : deps.state.viewRangeMs || null;
    if (session.target.rangeKind === "note") {
      onNoteSelectionRangeChange(range);
    } else {
      onPrimaryRangeChange(range);
    }
    anyPlot.__resonateRangeDrag = null;
  };
  plot.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
  anyPlot.__resonateRangeDragBound = true;
  anyPlot.__resonateRangeDrag = null;
}

function waveformMsAtPointerResolve(plot: HTMLElement, event: MouseEvent) {
  const axis = waveformAxisRangeResolve(plot);
  if (!axis) return NaN;
  const rect = plot.getBoundingClientRect();
  const localPx = event.clientX - rect.left - axis.leftPx;
  const ratio = clamp01(localPx / axis.widthPx);
  return axis.min + (axis.max - axis.min) * ratio;
}

function waveformAxisRangeResolve(plot: HTMLElement) {
  const fullLayout = (plot as any)?._fullLayout;
  const size = fullLayout?._size;
  const xAxis = fullLayout?.xaxis;
  const range = Array.isArray(xAxis?.range) ? xAxis.range : null;
  if (!size || !range || range.length < 2) return null;
  const min = Number(range[0]);
  const max = Number(range[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  const widthPx = Number(size.w);
  const leftPx = Number(size.l);
  if (!Number.isFinite(widthPx) || widthPx <= 1 || !Number.isFinite(leftPx)) return null;
  return { min, max, widthPx, leftPx };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function rangeDragTargetResolve(
  cursorMs: number,
  axisMinMs: number,
  axisMaxMs: number,
  axisWidthPx: number,
  primaryRange: WaveRange | null,
  noteRange: WaveRange | null,
): RangeDragTarget | null {
  const toleranceMs = ((axisMaxMs - axisMinMs) / axisWidthPx) * RANGE_DRAG_EDGE_TOLERANCE_PX;
  const noteTarget = rangeDragTargetForRangeResolve(cursorMs, noteRange, toleranceMs);
  if (noteTarget) return { rangeKind: "note", dragMode: noteTarget };
  const primaryTarget = rangeDragTargetForRangeResolve(cursorMs, primaryRange, toleranceMs);
  if (primaryTarget) return { rangeKind: "primary", dragMode: primaryTarget };
  return null;
}

function rangeDragTargetForRangeResolve(
  cursorMs: number,
  range: WaveRange | null,
  toleranceMs: number,
): RangeDragMode | null {
  if (!range) return null;
  const leftDistance = Math.abs(cursorMs - range.start);
  const rightDistance = Math.abs(cursorMs - range.end);
  if (leftDistance <= toleranceMs && leftDistance <= rightDistance) return "resize-left";
  if (rightDistance <= toleranceMs) return "resize-right";
  if (cursorMs > range.start && cursorMs < range.end) return "move";
  return null;
}

export function rangeDragApply(
  startRange: WaveRange,
  startCursorMs: number,
  currentCursorMs: number,
  dragMode: RangeDragMode,
  axisMinMs: number,
  axisMaxMs: number,
) {
  if (dragMode === "resize-left") {
    const start = clampRange(currentCursorMs, axisMinMs, startRange.end - RANGE_DRAG_MIN_WIDTH_MS);
    return { start, end: startRange.end };
  }
  if (dragMode === "resize-right") {
    const end = clampRange(currentCursorMs, startRange.start + RANGE_DRAG_MIN_WIDTH_MS, axisMaxMs);
    return { start: startRange.start, end };
  }
  const width = startRange.end - startRange.start;
  const delta = currentCursorMs - startCursorMs;
  let start = startRange.start + delta;
  let end = startRange.end + delta;
  if (start < axisMinMs) {
    start = axisMinMs;
    end = start + width;
  }
  if (end > axisMaxMs) {
    end = axisMaxMs;
    start = end - width;
  }
  return { start, end };
}

function clampRange(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function plotlyWaveToolsEnabledResolve() {
  const api = (window as any).ResonateWaveformInteractions;
  if (typeof api?.plotlyWaveToolsEnabledResolve === "function") {
    return api.plotlyWaveToolsEnabledResolve((window as any).__RESONATE_PLOTLY_WAVE_TOOLS__);
  }
  const runtime = (window as any).__RESONATE_PLOTLY_WAVE_TOOLS__;
  return typeof runtime === "boolean" ? runtime : false;
}

export function waveformRangeHandlersBuild(deps: WaveformViewDeps) {
  return {
    onPrimaryRangeChange: (range: any) => {
      deps.state.viewRangeMs = range;
      deps.setStatus(range ? "Analyzing selected region" : "Analyzing full clip");
      if (!primaryRangePipelineShouldTriggerFromRangeChange(deps.state, range)) return;
      deps.runResonatePipeline("range").catch((err: any) => console.error("[Resonance Reader] FFT refresh failed", err));
    },
    onNoteSelectionRangeChange: (range: any) => {
      deps.state.noteSelectionRangeMs = range;
      deps.setStatus(range ? "Analyzing selected tap window" : "Analyzing full clip");
      if (!noteRangePipelineShouldTriggerFromRangeChange(deps.state, range)) return;
      deps.runResonatePipeline("tap-range").catch((err: any) => console.error("[Resonance Reader] FFT refresh failed", err));
    },
  };
}
