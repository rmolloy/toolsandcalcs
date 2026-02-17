import { measureModeNormalize } from "./resonate_mode_config.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";

type EnergyMode = { id: string; label: string; color: string; peakFreq: number };
type EnergySeriesView = {
  t: number[];
  partialShares: {
    f0: number[];
    secondPartial: number[];
    thirdPartial: number[];
  };
  bodyShares: Record<string, number[]>;
  levelScale: number[];
  bodyModes: EnergyMode[];
  dominanceTime: number | null;
  xWindowSec: { start: number; end: number };
  f0Hz: number;
};

const ENERGY_COLORS = {
  fundamental: resolveColorRgbaFromRole("stringFundamental", 0.9),
  secondPartial: resolveColorRgbaFromRole("secondPartial", 0.9),
  thirdPartial: resolveColorRgbaFromRole("thirdPartial", 0.9),
  thirdPartialFill: resolveColorRgbaFromRole("thirdPartial", 0.3),
};

const ENERGY_DB_FLOOR = -60;
const ENERGY_STRIDE_TARGET = 360;

export function energyTransferShouldRenderForMeasureMode(measureMode: unknown) {
  return measureModeNormalize(measureMode) === "played_note";
}

export function selectedNoteSliceResolveFromState(state: Record<string, any>) {
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  if (!slices.length) return null;
  const range = state.noteSelectionRangeMs;
  if (range && Number.isFinite(range.start) && Number.isFinite(range.end)) {
    const selected = slices.find((slice: any) => (
      Number.isFinite(slice?.startMs)
      && Number.isFinite(slice?.endMs)
      && slice.startMs >= range.start
      && slice.endMs <= range.end
    ));
    if (selected) return selected;
  }
  return slices[0];
}

function overlapMsResolve(
  left: { start: number; end: number },
  right: { start: number; end: number },
) {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  return Math.max(0, end - start);
}

function selectedNoteResultResolveFromState(state: Record<string, any>, noteSlice: any) {
  const results = Array.isArray(state.noteResults) ? state.noteResults : [];
  if (Number.isFinite(noteSlice?.id)) {
    return results.find((result: any) => result?.id === noteSlice?.id) || null;
  }
  const range = state.noteSelectionRangeMs;
  const slices = Array.isArray(state.noteSlices) ? state.noteSlices : [];
  if (!(range && Number.isFinite(range.start) && Number.isFinite(range.end))) {
    return results[0] || null;
  }
  const scored = slices
    .map((slice: any) => ({
      id: slice?.id,
      overlapMs: overlapMsResolve(
        { start: range.start, end: range.end },
        { start: Number(slice?.startMs) || 0, end: Number(slice?.endMs) || 0 },
      ),
    }))
    .filter((entry: any) => Number.isFinite(entry.id) && entry.overlapMs > 0)
    .sort((left: any, right: any) => right.overlapMs - left.overlapMs);
  if (scored.length) {
    return results.find((result: any) => result?.id === scored[0].id) || null;
  }
  return results[0] || null;
}

function energyPanelElementGet() {
  return document.getElementById("energy_nav");
}

function energyPlotElementGet() {
  return document.getElementById("plot_energy_transfer");
}

function energyPanelVisibleSet(visible: boolean) {
  const panel = energyPanelElementGet();
  if (!panel) return;
  panel.hidden = !visible;
  if (visible) {
    panel.style.removeProperty("display");
    return;
  }
  panel.style.display = "none";
}

function energyPlotPurge() {
  const plot = energyPlotElementGet();
  if (!plot) return;
  (window as any).Plotly?.purge?.(plot);
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function hexToRgba(hex: string, alpha: number) {
  if (!hex || typeof hex !== "string") return resolveColorRgbaFromRole("secondPartial", alpha);
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return resolveColorRgbaFromRole("secondPartial", alpha);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return resolveColorRgbaFromRole("secondPartial", alpha);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function modeListResolveFromState(state: Record<string, any>) {
  const modes = Array.isArray(state.lastModesDetected) ? state.lastModesDetected : [];
  const cards = Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
  const customMeasurements = Array.isArray(state.customMeasurements) ? state.customMeasurements : [];
  const meta = state.modeMeta || {};
  const builtInModes = modes
    .filter((m: any) => Number.isFinite(m?.peakFreq))
    .map((m: any) => {
      const modeMeta = meta[m.mode] || {};
      return {
        id: m.mode,
        label: modeMeta.label || m.mode,
        color: modeMeta.color || energyModeColorHexResolveFromModeId(m.mode),
        peakFreq: m.peakFreq as number,
      };
    });

  const usedIds = new Set(builtInModes.map((mode) => mode.id));
  const customModes = cards
    .filter((card: any) => Number.isFinite(card?.freq))
    .filter((card: any) => card?.kind === "custom" || !usedIds.has(String(card?.key || "")))
    .map((card: any) => {
      const modeId = String(card?.key || "");
      const modeMeta = meta[modeId] || {};
      return {
        id: modeId,
        label: String(card?.label || modeMeta.label || modeId),
        color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
        peakFreq: card.freq as number,
      };
    })
    .filter((mode: EnergyMode) => Boolean(mode.id && Number.isFinite(mode.peakFreq)));

  const mergedCustomModes = [...customModes];
  const mergedIds = new Set(mergedCustomModes.map((mode) => mode.id));
  customMeasurements.forEach((measurement: any) => {
    const modeId = String(measurement?.key || "");
    const freq = Number(measurement?.freqHz);
    if (!modeId || !Number.isFinite(freq) || mergedIds.has(modeId) || usedIds.has(modeId)) return;
    const modeMeta = meta[modeId] || {};
    mergedCustomModes.push({
      id: modeId,
      label: String(measurement?.label || modeMeta.label || modeId),
      color: modeMeta.color || energyModeColorHexResolveFromModeId(modeId),
      peakFreq: freq,
    });
    mergedIds.add(modeId);
  });

  return [...builtInModes, ...mergedCustomModes];
}

function energyModeColorHexResolveFromModeId(modeId: string) {
  if (modeId === "air") return resolveColorHexFromRole("airMode");
  if (modeId === "top") return resolveColorHexFromRole("topMode");
  if (modeId === "back") return resolveColorHexFromRole("backMode");
  if (modeId === "transverse") return resolveColorHexFromRole("plateTransverseMode");
  if (modeId === "long") return resolveColorHexFromRole("plateLongMode");
  if (modeId === "cross") return resolveColorHexFromRole("plateCrossMode");
  return resolveColorHexFromRole("customMode");
}

function energyWindowSliceResolveFromState(state: Record<string, any>) {
  const range = state.noteSelectionRangeMs;
  if (!(range && Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)) return null;
  const src = state.currentWave;
  const FFTWaveform = (window as any).FFTWaveform;
  if (!src || typeof FFTWaveform?.sliceWaveRange !== "function") return null;
  const sampleRate = src.sampleRate;
  const wave = src.wave || src.samples;
  if (!wave || !Number.isFinite(sampleRate)) return null;
  const sliced = FFTWaveform.sliceWaveRange({ wave, sampleRate }, range.start, range.end);
  if (!sliced?.wave?.length) return null;
  return {
    startMs: range.start,
    endMs: range.end,
    sampleRate,
    samples: sliced.wave,
  };
}

function buildBodyEnvelopesFromModes(
  wolfCore: any,
  noteSlice: any,
  modes: EnergyMode[],
) {
  const bodyEnvs: Record<string, Float64Array> = {};
  modes.forEach((mode) => {
    bodyEnvs[mode.id] = wolfCore.demodulatePartial(
      noteSlice.samples,
      noteSlice.sampleRate,
      mode.peakFreq,
      wolfCore.modeBandWidth(mode.peakFreq),
      20,
    );
  });
  return bodyEnvs;
}

function accumulateEnergyShares(
  noteSlice: any,
  fundEnv: Float64Array,
  secondPartialEnvelope: Float64Array,
  thirdPartialEnvelope: Float64Array,
  bodyEnvs: Record<string, Float64Array>,
  modes: EnergyMode[],
) {
  const len = fundEnv.length;
  const stride = Math.max(1, Math.ceil(len / ENERGY_STRIDE_TARGET));
  const sliceStartSec = Number.isFinite(noteSlice?.startMs) ? (noteSlice.startMs as number) / 1000 : 0;
  const t: number[] = [];
  const partialShares = { f0: [], secondPartial: [], thirdPartial: [] };
  const bodyShares: Record<string, number[]> = {};
  modes.forEach((mode) => { bodyShares[mode.id] = []; });
  const totalRaw: number[] = [];

  for (let i = 0; i < len; i += stride) {
    const f = fundEnv[i] || 0;
    const secondPartial = secondPartialEnvelope[i] || 0;
    const thirdPartial = thirdPartialEnvelope[i] || 0;
    const bodyVals: Record<string, number> = {};
    let total = f + secondPartial + thirdPartial;
    modes.forEach((mode) => {
      const env = bodyEnvs[mode.id];
      const value = env ? (env[i] || 0) : 0;
      bodyVals[mode.id] = value;
      total += value;
    });
    total = Math.max(1e-9, total);
    t.push(sliceStartSec + (i / noteSlice.sampleRate));
    partialShares.f0.push(f / total);
    partialShares.secondPartial.push(secondPartial / total);
    partialShares.thirdPartial.push(thirdPartial / total);
    modes.forEach((mode) => {
      bodyShares[mode.id].push((bodyVals[mode.id] || 0) / total);
    });
    totalRaw.push(total);
  }

  return { t, partialShares, bodyShares, totalRaw };
}

function levelScaleBuildFromTotal(totalRaw: number[]) {
  const maxTotal = Math.max(...totalRaw, 1e-9);
  return totalRaw.map((value) => {
    const db = 20 * Math.log10(value / maxTotal);
    if (!Number.isFinite(db)) return 0;
    return clamp01((db - ENERGY_DB_FLOOR) / -ENERGY_DB_FLOOR);
  });
}

function computeEnergySeriesFromState(state: Record<string, any>) {
  const noteSlice = energyWindowSliceResolveFromState(state) || selectedNoteSliceResolveFromState(state);
  const analysisSamples = noteSlice?.samples || noteSlice?.wave;
  if (!analysisSamples || !Number.isFinite(noteSlice?.sampleRate)) return null;
  const noteResult = selectedNoteResultResolveFromState(state, noteSlice as any);
  if (!Number.isFinite(noteResult?.f0)) return null;
  const wolfCore = (window as any).WolfNoteCore;
  if (!wolfCore?.demodulatePartial || !wolfCore?.partialBandWidth || !wolfCore?.modeBandWidth) return null;

  const f0 = noteResult.f0 as number;
  const modes = modeListResolveFromState(state);
  if (!modes.length) return null;

  const fundEnv = wolfCore.demodulatePartial(analysisSamples, noteSlice.sampleRate, f0, wolfCore.partialBandWidth("f0", f0), 20);
  const secondPartialEnvelope = wolfCore.demodulatePartial(
    analysisSamples,
    noteSlice.sampleRate,
    f0 * 2,
    wolfCore.partialBandWidth("h2", f0 * 2),
    20,
  );
  const thirdPartialEnvelope = wolfCore.demodulatePartial(
    analysisSamples,
    noteSlice.sampleRate,
    f0 * 3,
    wolfCore.partialBandWidth("h3", f0 * 3),
    20,
  );
  const bodyEnvs = buildBodyEnvelopesFromModes(wolfCore, { ...noteSlice, samples: analysisSamples }, modes);
  const { t, partialShares, bodyShares, totalRaw } = accumulateEnergyShares(
    noteSlice,
    fundEnv,
    secondPartialEnvelope,
    thirdPartialEnvelope,
    bodyEnvs,
    modes,
  );
  const xWindowSec = energyXWindowResolveFromState(state, noteSlice);

  return {
    t,
    partialShares,
    bodyShares,
    levelScale: levelScaleBuildFromTotal(totalRaw),
    bodyModes: modes,
    dominanceTime: null,
    xWindowSec,
    f0Hz: f0,
  } as EnergySeriesView;
}

function applyLevelScale(seriesValues: number[], levelScale: number[]) {
  return seriesValues.map((value, idx) => {
    const scale = Number.isFinite(levelScale[idx]) ? levelScale[idx] : 0;
    return value * 100 * scale;
  });
}

function frequencyLabelResolve(freqHz: number) {
  return `${freqHz.toFixed(1)} Hz`;
}

function noteLabelResolve(freqHz: number) {
  const FFTUtils = (window as any).FFTUtils;
  const note = FFTUtils?.freqToNoteCents?.(freqHz);
  if (!note || typeof note.name !== "string") return { note: "—", deviation: "—", cents: "—" };
  const centsNum = Number.isFinite(note.centsNum) ? note.centsNum : null;
  return {
    note: note.name || "—",
    deviation: note.cents || "—",
    cents: centsNum === null ? "—" : `${Math.abs(centsNum)}c`,
  };
}

function hoverTemplateBuild(freqHz: number) {
  const freq = frequencyLabelResolve(freqHz);
  const note = noteLabelResolve(freqHz);
  return [
    "<b>%{fullData.name}</b>",
    `${freq} · ${note.note} ${note.deviation}`,
    `Cents: ${note.cents}`,
    "Amp: %{y:.1f}",
    "<extra></extra>",
  ].join("<br>");
}

function hoverLabelStyleBuild() {
  return {
    bgcolor: "rgba(10,14,24,0.9)",
    bordercolor: "rgba(255,255,255,0.18)",
    font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "#eef1ff" },
    align: "left",
  };
}

function tracesBuildFromSeries(series: EnergySeriesView) {
  const f0 = series.f0Hz;
  const secondPartialFrequency = f0 * 2;
  const thirdPartialFrequency = f0 * 3;
  const traces: any[] = [
    {
      x: series.t,
      y: applyLevelScale(series.partialShares.f0 || [], series.levelScale),
      type: "scatter",
      mode: "lines",
      name: "Fundamental",
      line: { color: ENERGY_COLORS.fundamental, width: 3, dash: "solid" },
      fill: "tozeroy",
      fillcolor: resolveColorRgbaFromRole("stringFundamental", 0.25),
      hovertemplate: hoverTemplateBuild(f0),
      hoverlabel: hoverLabelStyleBuild(),
    },
    {
      x: series.t,
      y: applyLevelScale(series.partialShares.secondPartial || [], series.levelScale),
      type: "scatter",
      mode: "lines",
      name: "Second Partial",
      line: { color: ENERGY_COLORS.secondPartial, width: 3, dash: "solid" },
      fill: "none",
      hovertemplate: hoverTemplateBuild(secondPartialFrequency),
      hoverlabel: hoverLabelStyleBuild(),
    },
    {
      x: series.t,
      y: applyLevelScale(series.partialShares.thirdPartial || [], series.levelScale),
      type: "scatter",
      mode: "lines",
      name: "Third Partial",
      line: { color: ENERGY_COLORS.thirdPartial, width: 3, dash: "solid" },
      fill: "none",
      fillcolor: ENERGY_COLORS.thirdPartialFill,
      hovertemplate: hoverTemplateBuild(thirdPartialFrequency),
      hoverlabel: hoverLabelStyleBuild(),
    },
  ];

  series.bodyModes.forEach((mode) => {
    traces.push({
      x: series.t,
      y: applyLevelScale(series.bodyShares[mode.id] || [], series.levelScale),
      type: "scatter",
      mode: "lines",
      name: `Body (${mode.label})`,
      line: { color: mode.color, width: 2, dash: "dash" },
      fill: "none",
      fillcolor: hexToRgba(mode.color, 0.3),
      hovertemplate: hoverTemplateBuild(mode.peakFreq),
      hoverlabel: hoverLabelStyleBuild(),
    });
  });

  return traces;
}

export function energyXWindowResolveFromState(
  state: Record<string, any>,
  noteSlice: { startMs?: number; endMs?: number },
) {
  const range = state.noteSelectionRangeMs;
  if (range && Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start) {
    return { start: range.start / 1000, end: range.end / 1000 };
  }
  const startMs = Number(noteSlice?.startMs);
  const endMs = Number(noteSlice?.endMs);
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
    return { start: startMs / 1000, end: endMs / 1000 };
  }
  return { start: 0, end: 1 };
}

export function energyYMaxVisibleResolveFromSeries(series: EnergySeriesView) {
  const xMin = series.xWindowSec.start;
  const xMax = series.xWindowSec.end;
  const pointVisible = (x: number) => x >= xMin && x <= xMax;
  let maxVisible = 0;
  for (let i = 0; i < series.t.length; i += 1) {
    if (!pointVisible(series.t[i])) continue;
    const scale = Number.isFinite(series.levelScale[i]) ? series.levelScale[i] : 0;
    const values = [
      (series.partialShares.f0?.[i] || 0) * 100 * scale,
      (series.partialShares.secondPartial?.[i] || 0) * 100 * scale,
      (series.partialShares.thirdPartial?.[i] || 0) * 100 * scale,
      ...series.bodyModes.map((mode) => ((series.bodyShares[mode.id]?.[i] || 0) * 100 * scale)),
    ];
    const localMax = Math.max(...values, 0);
    if (localMax > maxVisible) maxVisible = localMax;
  }
  const floorMax = Math.max(maxVisible, 5);
  return (floorMax * 1.2) + 2;
}

function layoutBuildFromSeries(series: EnergySeriesView) {
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
      line: { color: resolveColorRgbaFromRole("modelOverlay", 0.85), width: 2, dash: "dot" },
    });
    annotations.push({
      x: series.dominanceTime,
      y: 98,
      xref: "x",
      yref: "y",
      text: `Body dominance begins (~${(series.dominanceTime as number).toFixed(2)} s)`,
      showarrow: false,
      font: { color: resolveColorRgbaFromRole("modelOverlay", 0.9), size: 11 },
      bgcolor: "rgba(12, 16, 24, 0.6)",
      bordercolor: resolveColorRgbaFromRole("modelOverlay", 0.35),
      borderwidth: 1,
      borderpad: 4,
      xanchor: "left",
    });
  }
  return {
    margin: { l: 50, r: 10, t: 46, b: 40 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    yaxis: {
      title: "Relative level",
      range: [0, energyYMaxVisibleResolveFromSeries(series)],
      gridcolor: "rgba(255,255,255,0.06)",
      zeroline: false,
      tickfont: { color: "rgba(255,255,255,0.5)" },
    },
    xaxis: {
      title: "Time (s)",
      range: [series.xWindowSec.start, series.xWindowSec.end],
      gridcolor: "rgba(255,255,255,0.06)",
      tickfont: { color: "rgba(255,255,255,0.5)" },
    },
    showlegend: true,
    legend: {
      orientation: "h",
      x: 0,
      xanchor: "left",
      y: 1.2,
      yanchor: "top",
      bgcolor: "rgba(0,0,0,0)",
      font: { color: "rgba(255,255,255,0.82)", size: 12 },
      itemclick: "toggle",
      itemdoubleclick: "toggleothers",
    },
    shapes,
    annotations,
  };
}

function renderEnergyPlotFromSeries(series: EnergySeriesView) {
  const plot = energyPlotElementGet();
  if (!plot) return;
  const plotly = (window as any).Plotly;
  if (!plotly?.newPlot) return;
  const traces = tracesBuildFromSeries(series);
  const layout = layoutBuildFromSeries(series);
  plotly.newPlot(plot, traces, layout, { displayModeBar: true, displaylogo: false, responsive: true });
}

export function renderEnergyTransferFromState(state: Record<string, any>) {
  const shouldRender = energyTransferShouldRenderForMeasureMode(state.measureMode);
  energyPanelVisibleSet(shouldRender);
  if (!shouldRender) {
    energyPlotPurge();
    return;
  }
  const series = computeEnergySeriesFromState(state);
  if (!series) {
    energyPlotPurge();
    return;
  }
  renderEnergyPlotFromSeries(series);
}
