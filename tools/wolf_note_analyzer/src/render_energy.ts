/**
 * Energy plotting helpers (Plotly + DOM wiring).
 */

import { ENERGY_COLORS, HARMONIC3_COLOR, HARMONIC3_FILL, allBodyModes, hexToRgba } from "./state.js";

export function renderEnergyLegend(series: any) {
  const legend = document.getElementById("energy_legend");
  if (!legend) return;
  const items = [
    { label: "String fundamental", color: ENERGY_COLORS.fundamental, kind: "partial" },
    { label: "Harmonic 2", color: ENERGY_COLORS.harmonic, kind: "partial" },
    { label: "Harmonic 3", color: HARMONIC3_COLOR, kind: "partial" },
  ];
  const modes = series?.bodyModes?.length ? series.bodyModes : allBodyModes();
  modes.forEach((mode: any) => {
    if (!mode?.label) return;
    const label = mode.isExtra && Number.isFinite(mode.peakFreq)
      ? `${mode.label} ${mode.peakFreq.toFixed(1)} Hz`
      : mode.label;
    items.push({ label: `Body (${label})`, color: mode.color, kind: "body" });
  });
  legend.innerHTML = items.map((item) => `
    <span class="legend-item ${item.kind}" style="--legend-color:${item.color}"><span class="legend-swatch"></span>${item.label}</span>
  `).join("");
}

export function renderEnergyPlot(series: any, mode: any) {
  const plot = document.getElementById("plot_energy");
  if (!plot) return;
  if (!series) {
    (window as any).Plotly?.purge?.(plot);
    return;
  }
  const modeSelect = document.getElementById("energy_view_mode") as HTMLSelectElement | null;
  const viewMode = modeSelect?.value || "stacked-normalized";
  const useNormalized = viewMode === "stacked-normalized";
  const useStacked = viewMode !== "separate-decay";
  const scale = useNormalized ? null : (series.levelScale || []).map((v: number) => Math.max(0, v));
  const applyScale = (values: number[]) => values.map((v, idx) => {
    if (!scale?.length) return v * 100;
    const s = Number.isFinite(scale[idx]) ? scale[idx] : 0;
    return v * 100 * s;
  });
  const isSeparate = viewMode === "separate-decay";
  const partialShares = series.partialShares || {};
  const bodyShares = series.bodyShares || {};
  const bodyModes = series.bodyModes || [];
  const traces = [
    {
      x: series.t,
      y: applyScale(partialShares.f0 || []),
      type: "scatter",
      mode: "lines",
      name: "Fundamental",
      stackgroup: useStacked ? "one" : undefined,
      line: { color: ENERGY_COLORS.fundamental, width: 3, dash: "solid" },
      fillcolor: "rgba(110, 180, 255, 0.35)",
      fill: useStacked ? "tonexty" : "tozeroy",
    },
    {
      x: series.t,
      y: applyScale(partialShares.h2 || []),
      type: "scatter",
      mode: "lines",
      name: "Harmonic 2",
      stackgroup: useStacked ? "one" : undefined,
      line: { color: ENERGY_COLORS.harmonic, width: 3, dash: "solid" },
      fillcolor: "rgba(95, 200, 190, 0.35)",
      fill: useStacked ? "tonexty" : (isSeparate ? "none" : "tozeroy"),
    },
    {
      x: series.t,
      y: applyScale(partialShares.h3 || []),
      type: "scatter",
      mode: "lines",
      name: "Harmonic 3",
      stackgroup: useStacked ? "one" : undefined,
      line: { color: HARMONIC3_COLOR, width: 3, dash: "solid" },
      fillcolor: HARMONIC3_FILL,
      fill: useStacked ? "tonexty" : (isSeparate ? "none" : "tozeroy"),
    },
  ];
  bodyModes.forEach((m: any) => {
    const modeLabel = m.isExtra && Number.isFinite(m.peakFreq)
      ? `${m.label} ${m.peakFreq.toFixed(1)} Hz`
      : m.label;
    traces.push({
      x: series.t,
      y: applyScale(bodyShares[m.id] || []),
      type: "scatter",
      mode: "lines",
      name: `Body (${modeLabel})`,
      stackgroup: useStacked ? "one" : undefined,
      line: { color: m.color, width: 2, dash: "dash" },
      fillcolor: hexToRgba(m.color, 0.3),
      fill: useStacked ? "tonexty" : (isSeparate ? "none" : "tozeroy"),
    });
  });
  const shapes: any[] = [];
  const annotations: any[] = [];
  if (Number.isFinite(series.dominanceTime)) {
    shapes.push({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: series.dominanceTime,
      x1: series.dominanceTime,
      y0: 0,
      y1: 1,
      line: { color: "rgba(245,196,111,0.85)", width: 2, dash: "dot" },
    });
    const dominanceLabel = mode?.label ? `${mode.label} takes over` : "Body dominance begins";
    annotations.push({
      x: series.dominanceTime,
      y: 98,
      xref: "x",
      yref: "y",
      text: `${dominanceLabel} (~${series.dominanceTime.toFixed(2)} s)`,
      showarrow: false,
      font: { color: "rgba(245,196,111,0.9)", size: 11 },
      bgcolor: "rgba(12, 16, 24, 0.6)",
      bordercolor: "rgba(245,196,111,0.35)",
      borderwidth: 1,
      borderpad: 4,
      xanchor: "left",
    });
  }

  (window as any).Plotly.newPlot(plot, traces, {
    margin: { l: 50, r: 10, t: 8, b: 40 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    yaxis: {
      title: useNormalized ? "% energy" : "Relative level",
      range: [0, 100],
      gridcolor: "rgba(255,255,255,0.06)",
      zeroline: false,
      tickfont: { color: "rgba(255,255,255,0.5)" },
    },
    xaxis: {
      title: "Time (s)",
      gridcolor: "rgba(255,255,255,0.06)",
      tickfont: { color: "rgba(255,255,255,0.5)" },
    },
    showlegend: false,
    shapes,
    annotations,
  }, { displayModeBar: true, displaylogo: false, responsive: true });

  renderEnergyLegend(series);
}

if (typeof window !== "undefined") {
  (window as any).renderEnergyPlot = renderEnergyPlot;
  (window as any).renderEnergyLegend = renderEnergyLegend;
}
