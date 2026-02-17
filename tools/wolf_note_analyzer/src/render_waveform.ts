/**
 * Waveform rendering helpers (Plotly + interactions).
 */

import { appState, fftState, isWaveUpdatingShapes, setWaveStatus, setWaveUpdatingShapes } from "./state.js";
import { buildWaveShapes } from "./wave_shapes.js";

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

function buildWaveAnnotations() {
  const annotations: any[] = [];
  appState.noteSlices.forEach((note) => {
    const result = appState.noteResults.find((n) => n.id === note.id);
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

type WaveformCallbacks = {
  onSelectionChange?: () => void;
  onManualRange?: (range: { start: number; end: number }) => void;
};

export function renderWaveform(callbacks: WaveformCallbacks = {}) {
  const plot = document.getElementById("plot_waveform");
  if (!plot) return;
  const source = fftState.currentWave;
  if (!source) {
    setWaveStatus("Load or record to detect taps and notes.");
    (window as any).Plotly?.purge?.(plot);
    return;
  }
  const absWave = Array.from(source.wave, (v: number) => Math.abs(v));
  const trace = {
    x: source.timeMs,
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
    xaxis: { showgrid: false, zeroline: false, color: "rgba(255,255,255,0.45)", title: "" },
    yaxis: { showgrid: false, zeroline: false, showticklabels: false },
    shapes: buildWaveShapes(source.sampleRate),
    annotations: buildWaveAnnotations(),
  };
  (window as any).Plotly.newPlot(plot, [trace], layout, {
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
    const note = appState.noteSlices.find((n) => x >= n.startMs && x <= n.endMs);
    if (!note) return;
    appState.manualSelection = null;
    appState.autoSelect = false;
    appState.selectedNoteId = note.id;
    callbacks.onSelectionChange?.();
  });

  (plot as any).on("plotly_relayout", (ev: any) => {
    if (isWaveUpdatingShapes()) return;
    const range0 = ev["xaxis.range[0]"];
    const range1 = ev["xaxis.range[1]"];
    const auto = ev["xaxis.autorange"];
    if (range0 === undefined && range1 === undefined && auto === undefined) return;
    if (auto || range0 === undefined || range1 === undefined) {
      appState.manualSelection = null;
      callbacks.onSelectionChange?.();
      return;
    }
    const start = Number(range0);
    const end = Number(range1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    appState.manualSelection = null;
    callbacks.onManualRange?.({ start, end });
  });
}

export function refreshWaveShapes() {
  const plot = document.getElementById("plot_waveform");
  if (!plot || !(window as any).Plotly || !(plot as any)._fullLayout) return;
  const source = fftState.currentWave;
  if (!source) return;
  setWaveUpdatingShapes(true);
  Promise.resolve((window as any).Plotly.relayout(plot, { shapes: buildWaveShapes(source.sampleRate), annotations: buildWaveAnnotations() }))
    .finally(() => { setWaveUpdatingShapes(false); });
}

if (typeof window !== "undefined") {
  (window as any).renderWaveform = renderWaveform;
  (window as any).refreshWaveShapes = refreshWaveShapes;
}
