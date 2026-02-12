type WaveformViewDeps = {
  state: Record<string, any>;
  setStatus: (text: string) => void;
  runResonatePipeline: (trigger: string) => Promise<void>;
};

let waveUpdatingShapes = false;

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
      line: { color: "rgba(245,196,111,0.95)", width: 2 },
      fillcolor: "rgba(245,196,111,0.10)",
    },
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: range.start,
      x1: range.start,
      y0: 0,
      y1: 1,
      line: { color: "rgba(245,196,111,0.95)", width: 6 },
    },
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: range.end,
      x1: range.end,
      y0: 0,
      y1: 1,
      line: { color: "rgba(245,196,111,0.95)", width: 6 },
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
      line: { color: "rgba(180, 95, 200, 0.55)", width: 2 },
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
      fillcolor: isSelected ? "rgba(245, 196, 111, 0.2)" : "rgba(86, 180, 233, 0.12)",
      line: { color: isSelected ? "rgba(245, 196, 111, 0.8)" : "rgba(86, 180, 233, 0.25)", width: 1 },
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

function buildWaveAnnotations(
  noteSlices: Array<{ id: number; startMs: number; endMs: number }>,
  noteResults: Array<{ id: number; f0: number | null }>,
) {
  const annotations: any[] = [];
  noteSlices.forEach((note) => {
    const result = noteResults.find((n) => n.id === note.id);
    const label = noteLabelFromFreq(result?.f0 ?? null);
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
  range: { start: number; end: number } | null,
  tapSegments: Array<{ start: number; end: number }> | null | undefined,
  noteSlices: Array<{ id: number; startMs: number; endMs: number }> | null | undefined,
) {
  const shapes: any[] = [];
  shapes.push(...buildNoteSliceShapes(noteSlices || [], range));
  shapes.push(...buildTapSegmentShapes(tapSegments || [], sampleRate));
  shapes.push(...buildSelectionShapes(range));
  return shapes;
}

function renderWaveSelection(range: { start: number; end: number } | null, deps: WaveformViewDeps, slice: any) {
  const plot = document.getElementById("plot_waveform");
  if (!plot) return;
  const Plotly = (window as any).Plotly;
  if (!Plotly) return;
  const shapes = buildWaveShapes(slice.sampleRate, range, deps.state.tapSegments, deps.state.noteSlices);

  waveUpdatingShapes = true;
  Promise.resolve(Plotly.relayout(plot, { shapes })).finally(() => {
    waveUpdatingShapes = false;
  });
}

function makeWaveNavigatorPlot(slice: any, deps: WaveformViewDeps, onRangeChange: (range: any) => void) {
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
  deps.state.waveRenderDebug = { maxAbs, yMax };
  const trace = {
    x: timeMs,
    y: absWave,
    type: "scatter",
    mode: "lines",
    fill: "tozeroy",
    fillcolor: "rgba(86,180,233,0.16)",
    line: { color: "#8ecbff", width: 1.5 },
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
    },
    yaxis: {
      showgrid: false,
      zeroline: false,
      showticklabels: false,
    },
    shapes: buildWaveShapes(slice.sampleRate, deps.state.viewRangeMs || null, deps.state.tapSegments, deps.state.noteSlices),
    annotations: buildWaveAnnotations(deps.state.noteSlices || [], deps.state.noteResults || []),
  };

  Plotly.newPlot(plot, [trace], layout, {
    displayModeBar: true,
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ["zoom2d", "pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "autoScale2d"],
  });

  if (typeof (plot as any).removeAllListeners === "function") {
    (plot as any).removeAllListeners("plotly_relayout");
    (plot as any).removeAllListeners("plotly_click");
  }
  (plot as any).on("plotly_click", (ev: any) => {
    const pt = ev?.points?.[0];
    if (!pt) return;
    const x = pt.x as number;
    if (!Number.isFinite(x)) return;
    const note = (deps.state.noteSlices || []).find((seg: { startMs: number; endMs: number }) => x >= seg.startMs && x <= seg.endMs);
    if (note) {
      const range = { start: note.startMs, end: note.endMs };
      deps.state.viewRangeMs = range;
      renderWaveSelection(range, deps, slice);
      onRangeChange?.(range);
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
    renderWaveSelection(range, deps, slice);
    onRangeChange?.(range);
  });
  (plot as any).on("plotly_relayout", (ev: any) => {
    if (waveUpdatingShapes) return;
    const range0 = ev["xaxis.range[0]"];
    const range1 = ev["xaxis.range[1]"];
    const auto = ev["xaxis.autorange"];
    if (auto || range0 === undefined || range1 === undefined) {
      deps.state.viewRangeMs = null;
      renderWaveSelection(null, deps, slice);
      onRangeChange?.(null);
      return;
    }
    const start = Number(range0);
    const end = Number(range1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const range = { start, end };
    deps.state.viewRangeMs = range;
    renderWaveSelection(range, deps, slice);
    onRangeChange?.(range);
  });

  renderWaveSelection(deps.state.viewRangeMs || null, deps, slice);
}

export function renderWaveform(slice: any, deps: WaveformViewDeps) {
  const handler = (range: any) => {
    deps.state.viewRangeMs = range;
    deps.setStatus(range ? "Analyzing selected region" : "Analyzing full clip");
    deps.runResonatePipeline("range").catch((err: any) => console.error("[Resonance Reader] FFT refresh failed", err));
  };
  makeWaveNavigatorPlot(slice, deps, handler);
}
