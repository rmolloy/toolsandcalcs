
import { noteAndCentsFromFreq } from "./resonate_mode_metrics.js";
import { emitModeOverrideRequested } from "./resonate_override_commands.js";
import { toneControllerCreateFromWindow } from "./resonate_tone_controller.js";
import { resolveColorHexFromRole, resolveColorRgbaFromRole } from "./resonate_color_roles.js";
import { overlayShouldRenderForMeasureMode } from "./resonate_overlay_gate.js";
import { overlaySegmentsBuildFromArrays, type OverlaySegment } from "../common/overlay_segments.js";
import {
  resonanceSpectrumAxisLimitsResolve,
  resonanceSpectrumLineWidthResolve,
  resonanceSpectrumXAxisScaleResolve,
  resonanceSpectrumYAxisModeResolve,
} from "./resonate_debug_flags.js";

type SpectrumPayload = {
  freqs: number[];
  mags: number[];
  overlay?: number[];
  modes?: any[];
  secondarySpectrum?: { freqs: number[]; mags: number[] } | null;
  peakHoldSpectrum?: { freqs: number[]; mags: number[] } | null;
  polymaxCandidates?: Array<{ freqHz: number; zeta: number; stability: number; orderCount: number }>;
};

type ModeMeta = { label: string; aliasHtml: string; aliasText: string; tooltip: string; color: string };

type SpectrumRenderDeps = {
  modeMeta: Record<string, ModeMeta>;
  freqMin: number;
  freqAxisMax: number;
};

type SpectrumRangeSource = { freqs: number[]; mags: number[] };
type SpectrumDragPreview = { idx: number; x: number; y: number };
type SpectrumAxisRanges = { x: [number, number] | null; y: [number, number] | null };
type ModeCalloutPlacement = { ax: number; ay: number; xanchor: "left" | "center" | "right"; yanchor: string };

const MOCK_OVERLAY = {
  min: 85,
  max: 260,
  feather: 60,
  widths: { thin: 1.0, mid: 2.0, thick: 3.0 },
  opacities: { thin: 0.25, mid: 0.8, thick: 0.9 },
};

let overlayToggleBound = false;
let modeOverrideLabelBound = false;
let toneHoverBound = false;
const TONE_FREQ_DEDUPE_EPSILON_HZ = 0.05;
const CELESTIAL_Y_AXIS_RANGE: [number, number] = [-100, -40];
const MEASURED_TRACE_LINE_WIDTH = 2;
const AUTOMATIC_Y_FLOOR_MAX_HZ = 300;
const MODE_CALLOUT_ARROW_OFFSET_PX = -15;
const MODE_CALLOUT_COLLISION_HZ = 35;

export function renderSpectrum(payload: SpectrumPayload, deps: SpectrumRenderDeps) {
  const plot = spectrumPlotElementSelect();
  if (!plot) return;
  const priorRanges = spectrumAxisRangesReadFromPlot(plot);
  const preserveRanges = spectrumRangesPreserveNextRenderConsumeFromState();
  resetModeOverrideLabelBindState();
  const { freqs, mags, overlay, modes, secondarySpectrum, peakHoldSpectrum, polymaxCandidates } = payload;
  const { overlaySegments, overlayVisible, toggle } = overlayContextResolve(freqs, overlay);
  const hoverNoteData = hoverNoteDataResolveFromFreqs(freqs);
  const {
    plotData,
    layout,
    modeAnnotationKeys,
    modeAnnotationAnchorX,
    modeTraceIndexByKey,
    modeAnnotationIndexByKey,
    toneTraceIndex,
  } = spectrumRenderModelAssemble({
    freqs,
    mags,
    modes,
    overlaySegments,
    overlayVisible,
    hoverNoteData,
    secondarySpectrum: secondarySpectrum || null,
    peakHoldSpectrum: peakHoldSpectrum || null,
    polymaxCandidates: polymaxCandidates || [],
    deps,
  });
  if (preserveRanges) spectrumLayoutApplyAxisRanges(layout, priorRanges);
  renderSpectrumPlot(plot, plotData, layout);
  modeOverrideLabelBind(plot as HTMLElement, modeAnnotationKeys, modeAnnotationAnchorX);
  bindFftHomeResetToDefaultRange(plot as HTMLElement, deps, layout);
  const plotAny = plot as any;
  seedModePreviewState(
    plotAny,
    freqs,
    mags,
    modeAnnotationKeys,
    deps.modeMeta,
    modeTraceIndexByKey,
    modeAnnotationIndexByKey,
  );
  seedModePreviewRelayoutState(plotAny);

  bindFftOverlayToggleSyncAndRerender(toggle);
  bindFftToneHoverFollow(plot as HTMLElement, toneTraceIndex, mags);
}

function bindFftHomeResetToDefaultRange(plot: HTMLElement, deps: SpectrumRenderDeps, layout: any) {
  const plotAny = plot as any;
  plotAny.__fftDefaultYAxisRange = spectrumAxisRangeRead(layout?.yaxis?.range);
  if (!plotAny?.on || plotAny.__fftHomeResetBound) return;
  plotAny.__fftHomeResetBound = true;
  plotAny.__fftHomeResetLock = false;
  plotAny.on("plotly_relayout", (evt: Record<string, unknown>) => {
    if (plotAny.__fftHomeResetLock) return;
    if (!spectrumRelayoutRequestsAutorange(evt)) return;
    plotAny.__fftHomeResetLock = true;
    const axisConfig = spectrumAxisConfigBuild(deps);
    const defaultYRange = spectrumAxisRangeRead(plotAny.__fftDefaultYAxisRange);
    const patch = {
      "xaxis.type": axisConfig.xType,
      "xaxis.range": axisConfig.xRange,
      "xaxis.autorange": false,
      "yaxis.autorange": defaultYRange === null,
      "yaxis.range": defaultYRange || undefined,
    };
    const relayout = (window as any).Plotly?.relayout?.(plot, patch);
    if (relayout && typeof relayout.finally === "function") {
      relayout.finally(() => {
        plotAny.__fftHomeResetLock = false;
      });
      return;
    }
    plotAny.__fftHomeResetLock = false;
  });
}

function spectrumRelayoutRequestsAutorange(evt: Record<string, unknown> | null | undefined) {
  if (!evt) return false;
  return evt["xaxis.autorange"] === true || evt["yaxis.autorange"] === true;
}

function spectrumAxisRangesReadFromPlot(plot: HTMLElement): SpectrumAxisRanges {
  const fullLayout = (plot as any)?._fullLayout;
  return {
    x: spectrumAxisRangeRead(fullLayout?.xaxis?.range),
    y: spectrumAxisRangeRead(fullLayout?.yaxis?.range),
  };
}

function spectrumAxisRangeRead(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const min = Number(value[0]);
  const max = Number(value[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return [min, max];
}

function spectrumLayoutApplyAxisRanges(layout: any, ranges: SpectrumAxisRanges) {
  if (ranges.x) {
    layout.xaxis = { ...(layout.xaxis || {}), range: ranges.x, autorange: false };
  }
  if (ranges.y) {
    layout.yaxis = { ...(layout.yaxis || {}), range: ranges.y, autorange: false };
  }
}

function spectrumAxisConfigBuild(deps: SpectrumRenderDeps) {
  const limits = resonanceSpectrumAxisLimitsResolve();
  const xScale = resonanceSpectrumXAxisScaleResolve();
  const xMin = spectrumPositiveLimitResolve(limits.xMin, deps.freqMin);
  const xMax = spectrumPositiveLimitResolve(limits.xMax, deps.freqAxisMax);
  const xRangeLinear: [number, number] = xMin < xMax ? [xMin, xMax] : [deps.freqMin, deps.freqAxisMax];
  const yRange = spectrumFiniteRangeResolve(limits.yMin, limits.yMax);
  return {
    xType: xScale === "log" ? "log" : "linear",
    xRange: xScale === "log" ? spectrumLogRangeBuild(xRangeLinear) : xRangeLinear,
    xRangeLinear,
    yRange,
  };
}

function spectrumPositiveLimitResolve(value: number | null, fallback: number) {
  return Number.isFinite(value) && (value as number) > 0 ? value as number : fallback;
}

function spectrumFiniteRangeResolve(min: number | null, max: number | null): [number, number] | null {
  if (!Number.isFinite(min) || !Number.isFinite(max) || (min as number) >= (max as number)) return null;
  return [min as number, max as number];
}

function spectrumLogRangeBuild(range: [number, number]): [number, number] {
  return [Math.log10(Math.max(0.1, range[0])), Math.log10(Math.max(0.1, range[1]))];
}

function spectrumPlotElementSelect() {
  return document.getElementById("plot_fft");
}

function resetModeOverrideLabelBindState() {
  modeOverrideLabelBound = false;
  toneHoverBound = false;
}

function overlayToggleSelect() {
  return document.getElementById("toggle_overlay") as HTMLInputElement | null;
}

function overlayToggleChecked(toggle: HTMLInputElement | null) {
  return Boolean(toggle?.checked);
}

function overlayVisibleResolveAndSyncClass(toggle: HTMLInputElement | null) {
  const measureMode = (document.getElementById("measure_mode") as HTMLSelectElement | null)?.value;
  const overlayVisible = overlayShouldRenderForMeasureMode(measureMode, toggle);
  pipelineOverlayClassSync(overlayVisible);
  return overlayVisible;
}

function hoverNoteDataResolveFromFreqs(freqs: number[]) {
  return spectrumHoverNoteDataBuild(freqs);
}

function overlayContextResolve(freqs: number[], overlay: number[] | undefined) {
  const overlaySegments = spectrumOverlaySegmentsResolve(freqs, overlay);
  const toggle = overlayToggleSelect();
  const overlayVisible = overlayVisibleResolveAndSyncClass(toggle);
  return { overlaySegments, overlayVisible, toggle };
}

function buildMeasuredTrace(freqs: number[], mags: number[], hoverNoteData: Array<[string, string]>) {
  return {
    x: freqs,
    y: mags,
    type: "scatter",
    mode: "lines",
    line: { color: resolveColorHexFromRole("fftLine"), width: resonanceSpectrumLineWidthResolve(MEASURED_TRACE_LINE_WIDTH) },
    name: "Measured",
    customdata: hoverNoteData,
    hovertemplate: spectrumLineHoverTemplateBuild(),
    hoverlabel: spectrumLineHoverLabelStyleBuild(),
  };
}

function buildSecondaryMeasuredTrace(
  secondarySpectrum: { freqs: number[]; mags: number[] } | null | undefined,
  shouldRender: boolean,
) {
  if (!shouldRender || !secondarySpectrum?.freqs?.length || !secondarySpectrum?.mags?.length) return null;
  return {
    x: secondarySpectrum.freqs,
    y: secondarySpectrum.mags,
    type: "scatter",
    mode: "lines",
    line: { color: resolveColorHexFromRole("waveNoteSelection"), width: 2.5 },
    name: "Selected Note Window",
    customdata: spectrumHoverNoteDataBuild(secondarySpectrum.freqs),
    hovertemplate: spectrumLineHoverTemplateBuild(),
    hoverlabel: spectrumLineHoverLabelStyleBuild(),
  };
}

function buildPeakHoldTrace(
  peakHoldSpectrum: { freqs: number[]; mags: number[] } | null | undefined,
) {
  if (!peakHoldSpectrum?.freqs?.length || !peakHoldSpectrum?.mags?.length) return null;
  return {
    x: peakHoldSpectrum.freqs,
    y: peakHoldSpectrum.mags,
    type: "scatter",
    mode: "lines",
    line: { color: resolveColorRgbaFromRole("fftLine", 0.42), width: 1.5, dash: "dot" },
    name: "Peak Hold",
    customdata: spectrumHoverNoteDataBuild(peakHoldSpectrum.freqs),
    hovertemplate: spectrumLineHoverTemplateBuild(),
    hoverlabel: spectrumLineHoverLabelStyleBuild(),
    showlegend: false,
  };
}

function spectrumLineHoverTemplateBuild() {
  return [
    "<b>%{fullData.name}</b>",
    "%{x:.1f} Hz · %{y:.1f} dB",
    "Note: %{customdata[0]} %{customdata[1]}",
    "<extra></extra>",
  ].join("<br>");
}

function spectrumLineHoverLabelStyleBuild() {
  return {
    bgcolor: "rgba(10,14,24,0.9)",
    bordercolor: "rgba(255,255,255,0.18)",
    font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "#eef1ff" },
    align: "left",
  };
}

function buildOverlayTraces(overlaySegments: OverlaySegment[], overlayVisible: boolean) {
  return overlaySegments.map((seg) => ({
    x: seg.x,
    y: seg.y,
    type: "scatter",
    mode: "lines",
    line: { color: resolveColorRgbaFromRole("modelOverlay", seg.opacity), width: seg.width, dash: "dash" },
    name: "Model",
    showlegend: false,
    hovertemplate: "%{x:.1f} Hz<br>%{y:.1f} dB<extra></extra>",
    hoverlabel: {
      bgcolor: "rgba(14,17,25,0.95)",
      bordercolor: resolveColorRgbaFromRole("modelOverlay", 0.6),
      font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "rgba(255,255,255,0.95)" },
    },
    visible: overlayVisible,
    meta: { kind: "overlay" },
  }));
}


function buildPolymaxTraces(
  candidates: Array<{ freqHz: number; zeta: number; stability: number; orderCount: number }>,
  freqs: number[],
  mags: number[],
) {
  if (!Array.isArray(candidates) || !candidates.length) return [];
  return candidates
    .filter((c) => Number.isFinite(c.freqHz))
    .map((candidate) => {
      const idx = nearestSpectrumIndexFromFreq(freqs, candidate.freqHz);
      const y = Number.isFinite(mags[idx]) ? mags[idx] : Math.max(...mags.filter((v) => Number.isFinite(v)).slice(0, 1), -60);
      return {
        x: [candidate.freqHz],
        y: [y],
        type: "scatter",
        mode: "markers",
        marker: { size: 12, symbol: "diamond", color: "rgba(255,214,102,0.95)", line: { color: "rgba(23,26,38,0.95)", width: 2 } },
        hovertemplate: `<b>PolyMAX Stable Pole</b><br>%{x:.1f} Hz<br>ζ ${(candidate.zeta * 100).toFixed(2)}%<br>stability ${(candidate.stability * 100).toFixed(0)}%<extra></extra>`,
        showlegend: false,
        meta: { kind: "polymax" },
      };
    });
}

function buildModeTracesAndAnnotations(
  freqs: number[],
  mags: number[],
  modes: any[] | undefined,
  modeMetaByKey: Record<string, ModeMeta>,
) {
  const modeAnnotations: any[] = [];
  const modeAnnotationKeys: string[] = [];
  const modeAnnotationAnchorX: Record<string, number> = {};
  const modeAnnotationFreqs: number[] = [];
  const modeTraces = (modes || [])
    .filter((m) => Number.isFinite(m.peakFreq))
    .map((m) => {
      const f0 = m.peakFreq as number;
      let bestIdx = 0;
      for (let i = 1; i < freqs.length; i += 1) {
        if (Math.abs(freqs[i] - f0) < Math.abs(freqs[bestIdx] - f0)) bestIdx = i;
      }
      const y0 = Number.isFinite(m.peakDb) ? (m.peakDb as number) : mags[bestIdx];
      const meta = modeMetaByKey[m.mode] || {
        label: m.mode,
        aliasHtml: "",
        aliasText: m.mode,
        tooltip: m.mode,
        color: resolveColorRgbaFromRole("fftLine", 0.75),
      };
      const noteData = modeAnnotationNoteDataResolve(m, f0);
      const noteLabel = noteData.note;
      const centsLabel = spectrumHoverCentsLabelBuild(noteData.cents);
      const aliasLabel = meta.aliasText ? ` ${meta.aliasText}` : "";
      const polyTag = m.polymaxStable ? " · PM✓" : "";

      if (Number.isFinite(y0)) {
        const placement = modeCalloutPlacementResolve(f0, modeAnnotationFreqs);
        modeAnnotationFreqs.push(f0);
        modeAnnotationKeys.push(m.mode);
        modeAnnotationAnchorX[m.mode] = f0;
        modeAnnotations.push({
          x: f0,
          y: y0,
          xref: "x",
          yref: "y",
          text: `${modeAnnotationTextBuild(meta, aliasLabel, f0, noteLabel, centsLabel)}${polyTag}`,
          showarrow: true,
          arrowhead: 0,
          arrowwidth: MEASURED_TRACE_LINE_WIDTH,
          arrowcolor: meta.color,
          ax: placement.ax,
          ay: placement.ay,
          xanchor: placement.xanchor,
          yanchor: placement.yanchor,
          standoff: 6,
          align: "center",
          font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 12, color: "#eef1ff" },
          bgcolor: "rgba(10,14,24,0.85)",
          bordercolor: "rgba(255,255,255,0.15)",
          borderpad: 4,
          borderwidth: 1,
        });
      }

      return {
        traces: [
          {
            x: [f0],
            y: [y0],
            type: "scatter",
            mode: "markers",
            marker: { size: 28, color: spectrumColorWithAlpha(meta.color, 0.22), line: { color: "rgba(0,0,0,0)", width: 0 } },
            hoverinfo: "skip",
            showlegend: false,
          },
          {
            x: [f0],
            y: [y0],
            type: "scatter",
            mode: "markers",
            marker: { size: 10, color: "rgba(255,248,238,0.95)", line: { color: meta.color, width: 2 } },
            cliponaxis: false,
            hovertemplate: `<b>${meta.label}${aliasLabel}</b><br><span style="color:${meta.color}; font-weight:700;">%{x:.1f} Hz</span> · %{y:.1f} dB<br>${noteLabel} ${centsLabel}<extra></extra>`,
            hoverlabel: {
              bgcolor: "rgba(10,14,24,0.9)",
              bordercolor: "rgba(255,255,255,0.18)",
              font: { family: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", size: 14, color: "#eef1ff" },
              align: "left",
            },
            showlegend: false,
          },
        ],
      };
    });

  return { modeTraces, modeAnnotations, modeAnnotationKeys, modeAnnotationAnchorX };
}

function modeCalloutPlacementResolve(freqHz: number, priorFreqs: number[]): ModeCalloutPlacement {
  const closePriorCount = modeCalloutClusterPriorCountResolve(freqHz, priorFreqs);
  const placements = [
    modeCalloutPlacementBuild("center", MODE_CALLOUT_ARROW_OFFSET_PX),
    modeCalloutPlacementBuild("left", MODE_CALLOUT_ARROW_OFFSET_PX),
    modeCalloutPlacementBuild("right", MODE_CALLOUT_ARROW_OFFSET_PX),
    modeCalloutPlacementBuild("center", Math.abs(MODE_CALLOUT_ARROW_OFFSET_PX)),
  ];
  return placements[closePriorCount % placements.length];
}

function modeCalloutClusterPriorCountResolve(freqHz: number, priorFreqs: number[]) {
  let clusterCount = 0;
  let clusterEdgeFreq = freqHz;
  for (let index = priorFreqs.length - 1; index >= 0; index -= 1) {
    const priorFreq = priorFreqs[index];
    if (Math.abs(priorFreq - clusterEdgeFreq) >= MODE_CALLOUT_COLLISION_HZ) continue;
    clusterCount += 1;
    clusterEdgeFreq = priorFreq;
  }
  return clusterCount;
}

function modeCalloutPlacementBuild(xanchor: "left" | "center" | "right", ay: number): ModeCalloutPlacement {
  return {
    ax: 0,
    ay,
    xanchor,
    yanchor: ay > 0 ? "top" : "bottom",
  };
}

function buildSpectrumLayout(
  deps: SpectrumRenderDeps,
  modeAnnotations: any[],
  rangeSources: SpectrumRangeSource[],
) {
  const axisConfig = spectrumAxisConfigBuild(deps);
  return {
    margin: { l: 40, r: 20, t: 20, b: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    hovermode: "closest",
    xaxis: {
      title: "",
      type: axisConfig.xType,
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.035)",
      gridwidth: 1,
      range: axisConfig.xRange,
      tickmode: "auto",
      color: "rgba(255,255,255,0.75)",
      zeroline: false,
    },
    yaxis: spectrumYAxisLayoutBuild(axisConfig.yRange, axisConfig.xRangeLinear, rangeSources, modeAnnotations),
    showlegend: false,
    annotations: modeAnnotations,
  };
}

function spectrumYAxisLayoutBuild(
  manualRange: [number, number] | null,
  xRange: [number, number],
  rangeSources: SpectrumRangeSource[],
  modeAnnotations: any[],
) {
  const base = {
    title: "",
    showgrid: true,
    gridcolor: "rgba(255,255,255,0.04)",
    gridwidth: 1,
    color: "rgba(255,255,255,0.75)",
    zeroline: false,
  };
  if (manualRange) return { ...base, range: manualRange, autorange: false };
  if (resonanceSpectrumYAxisModeResolve() === "celestial-fixed") {
    return { ...base, range: CELESTIAL_Y_AXIS_RANGE, autorange: false };
  }
  const automaticRange = spectrumAutomaticYRangeBuild(xRange, rangeSources, modeAnnotations);
  if (automaticRange) return { ...base, range: automaticRange, autorange: false };
  return { ...base, autorange: true };
}

function spectrumAutomaticYRangeBuild(
  xRange: [number, number],
  rangeSources: SpectrumRangeSource[],
  modeAnnotations: any[],
) {
  const visibleValues = spectrumVisibleDbValuesCollect(xRange, rangeSources);
  const floorValues = spectrumVisibleDbValuesCollect(spectrumFloorRangeBuild(xRange), rangeSources);
  const calloutValues = spectrumVisibleAnnotationYValuesCollect(xRange, modeAnnotations);
  if (!visibleValues.length && !calloutValues.length) return null;
  const dataMin = Math.min(...(floorValues.length ? floorValues : visibleValues));
  const dataMax = Math.max(...visibleValues, ...calloutValues);
  const paddedMin = dataMin - 5;
  const paddedMax = dataMax + 18;
  return [spectrumRoundDownToStep(paddedMin, 5), spectrumRoundUpToStep(paddedMax, 5)] as [number, number];
}

function spectrumFloorRangeBuild(xRange: [number, number]): [number, number] {
  return [xRange[0], Math.min(xRange[1], AUTOMATIC_Y_FLOOR_MAX_HZ)];
}

function spectrumVisibleDbValuesCollect(xRange: [number, number], rangeSources: SpectrumRangeSource[]) {
  return rangeSources.flatMap((source) => source.mags.filter((value, index) => {
    const freq = source.freqs[index];
    return Number.isFinite(freq) && Number.isFinite(value) && freq >= xRange[0] && freq <= xRange[1];
  }));
}

function spectrumVisibleAnnotationYValuesCollect(xRange: [number, number], modeAnnotations: any[]) {
  return modeAnnotations
    .filter((annotation) => Number.isFinite(annotation?.x) && annotation.x >= xRange[0] && annotation.x <= xRange[1])
    .map((annotation) => Number(annotation.y))
    .filter((value) => Number.isFinite(value));
}

function spectrumRoundDownToStep(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function spectrumRoundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function buildSpectrumPlotData(
  measuredTrace: any,
  secondaryMeasuredTrace: any | null,
  peakHoldTrace: any | null,
  overlayTraces: any[],
  polymaxTraces: any[],
  modeTraces: any[],
  toneTrace: any,
) {
  const flatModeTraces = modeTraces.flatMap((m: any) => m.traces);
  return [
    measuredTrace,
    ...(secondaryMeasuredTrace ? [secondaryMeasuredTrace] : []),
    ...(peakHoldTrace ? [peakHoldTrace] : []),
    ...overlayTraces,
    ...polymaxTraces,
    ...flatModeTraces,
    toneTrace,
  ];
}

function buildModeTraceIndexByKey(
  modeTraces: any[],
  modes: any[] | undefined,
  nonModeTraceCount: number,
  hasSecondaryMeasuredTrace: boolean,
  hasPeakHoldTrace: boolean,
) {
  const baseOverlayCount = nonModeTraceCount;
  const measuredTraceCount = 1 + (hasSecondaryMeasuredTrace ? 1 : 0) + (hasPeakHoldTrace ? 1 : 0);
  const modeTraceIndexByKey: Record<string, { dotBig: number; dotSmall: number }> = {};
  modeTraces.forEach((_, idx) => {
    const base = measuredTraceCount + baseOverlayCount + idx * 2;
    const modeKey = (modes as any[] | undefined)?.[idx]?.mode;
    if (modeKey) modeTraceIndexByKey[modeKey] = { dotBig: base, dotSmall: base + 1 };
  });
  return modeTraceIndexByKey;
}

function buildModeAnnotationIndexByKey(modeAnnotationKeys: string[]) {
  const modeAnnotationIndexByKey: Record<string, number> = {};
  modeAnnotationKeys.forEach((key, idx) => {
    modeAnnotationIndexByKey[key] = idx;
  });
  return modeAnnotationIndexByKey;
}

function renderSpectrumPlot(plot: HTMLElement, plotData: any[], layout: any) {
  (window as any).Plotly.newPlot(plot, plotData, layout, {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToAdd: [settingsModebarButtonBuild()],
    responsive: true,
    editable: true,
    edits: {
      annotationPosition: true,
      annotationText: false,
      axisTitleText: false,
      colorbarPosition: false,
      colorbarTitleText: false,
      legendPosition: false,
      legendText: false,
      shapePosition: false,
      titleText: false,
    },
  });
}

function settingsModebarButtonBuild() {
  return {
    name: "resonance-settings",
    title: "FFT and microphone settings",
    icon: {
      width: 24,
      height: 24,
      path: "M19.4 13.5a7.8 7.8 0 0 0 .1-1.5 7.8 7.8 0 0 0-.1-1.5l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A7.2 7.2 0 0 0 7 6L4.6 5l-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.5 7.8 7.8 0 0 0 .1 1.5l-2 1.5 2 3.5 2.4-1a7.2 7.2 0 0 0 2.6 1.5L10 22h4l.4-2.5A7.2 7.2 0 0 0 17 18l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z",
    },
    click: settingsDialogOpenFromModebar,
  };
}

function settingsDialogOpenFromModebar() {
  document.getElementById("btn_settings")?.click();
}

function seedModePreviewState(
  plotAny: any,
  freqs: number[],
  mags: number[],
  modeAnnotationKeys: string[],
  modeMetaByKey: Record<string, ModeMeta>,
  modeTraceIndexByKey: Record<string, { dotBig: number; dotSmall: number }>,
  annotationIndexByKey: Record<string, number>,
) {
  plotAny.__modePreview = {
    freqs,
    mags,
    modeKeys: modeAnnotationKeys,
    modeMetaByKey,
    traceIndexByKey: modeTraceIndexByKey,
    annotationIndexByKey,
  };
}

function seedModePreviewRelayoutState(plotAny: any) {
  plotAny.__modePreviewRelayoutLock = false;
  plotAny.__modePreviewRelayoutOrigin = false;
  plotAny.__modePreviewRelayoutUntil = 0;
}

function bindFftOverlayToggleSyncAndRerender(toggle: HTMLInputElement | null) {
  if (!toggle || overlayToggleBound) return;
  overlayToggleBound = true;
  toggle.addEventListener("change", () => {
    const state = (window as any).FFTState;
    spectrumRangesPreserveNextRenderMarkOnState();
    if (typeof state?.rerenderFromLastSpectrum === "function") {
      state.rerenderFromLastSpectrum();
    }
    pipelineOverlayClassSync(Boolean(toggle.checked));
  });
}

function bindFftToneHoverFollow(plot: HTMLElement, toneTraceIndex: number, mags: number[]) {
  const plotAny = plot as any;
  if (!plotAny?.on || toneHoverBound) return;
  toneHoverBound = true;
  plotAny.on("plotly_hover", (evt: any) => {
    toneHoverApplyFromEvent(evt, plot, toneTraceIndex, mags);
  });
  plot.addEventListener("mouseleave", () => {
    toneHoverClear(plot, toneTraceIndex);
  });
}

function toneHoverApplyFromEvent(evt: any, plot: HTMLElement, toneTraceIndex: number, mags: number[]) {
  const state = (window as any).FFTState as Record<string, any> | undefined;
  if (!state?.toneEnabled) return;
  const freqHz = toneFreqResolveFromHoverEvent(evt);
  if (!Number.isFinite(freqHz)) return;
  const nextFreqHz = freqHz as number;
  if (toneFrequencyUpdateRequired(state.toneFreqHz, nextFreqHz)) {
    state.toneFreqHz = nextFreqHz;
    const tone = toneControllerCreateFromWindow(window);
    tone.toneFrequencySetHz(nextFreqHz);
  }
  toneSpikeTraceUpdate(plot, toneTraceIndex, nextFreqHz, mags);
}

function toneHoverClear(plot: HTMLElement, toneTraceIndex: number) {
  const state = (window as any).FFTState as Record<string, any> | undefined;
  if (!state?.toneEnabled) return;
  if (!Number.isFinite(state.toneFreqHz)) {
    toneSpikeTraceVisibilitySet(plot, toneTraceIndex, false);
    return;
  }
  state.toneFreqHz = null;
  const tone = toneControllerCreateFromWindow(window);
  tone.toneStop();
  toneSpikeTraceVisibilitySet(plot, toneTraceIndex, false);
}

export function toneFrequencyUpdateRequired(lastFreqHz: unknown, nextFreqHz: unknown) {
  if (!Number.isFinite(nextFreqHz)) return false;
  if (!Number.isFinite(lastFreqHz)) return true;
  return Math.abs((nextFreqHz as number) - (lastFreqHz as number)) > TONE_FREQ_DEDUPE_EPSILON_HZ;
}

function toneFreqResolveFromHoverEvent(evt: any) {
  const point = evt?.points?.[0];
  const freqHz = Number(point?.x);
  if (!Number.isFinite(freqHz)) return null;
  return freqHz;
}

function spectrumRangesPreserveNextRenderMarkOnState() {
  const state = (window as any).FFTState as Record<string, any> | undefined;
  if (!state) return;
  state.preserveSpectrumRangesOnNextRender = true;
}

function spectrumRangesPreserveNextRenderConsumeFromState() {
  const state = (window as any).FFTState as Record<string, any> | undefined;
  if (!state?.preserveSpectrumRangesOnNextRender) return false;
  state.preserveSpectrumRangesOnNextRender = false;
  return true;
}

function buildOverlaySegments(freqs: number[], overlay: number[]): OverlaySegment[] {
  return overlaySegmentsBuildFromArrays(freqs, overlay, MOCK_OVERLAY);
}

function spectrumOverlaySegmentsResolve(freqs: number[], overlay: number[] | undefined) {
  return overlay ? buildOverlaySegments(freqs, overlay) : [];
}

function spectrumHoverNoteDataBuild(freqs: number[]): Array<[string, string]> {
  return freqs.map((freq) => {
    const out = noteAndCentsFromFreq(freq);
    const noteLabel = out.note ?? "—";
    const centsLabel = spectrumHoverCentsLabelBuild(out.cents);
    return [noteLabel, centsLabel];
  });
}

function spectrumHoverCentsLabelBuild(cents: number | null) {
  if (!Number.isFinite(cents)) return "—";
  const sign = (cents as number) >= 0 ? "+" : "";
  return `${sign}${Math.round(cents as number)}¢`;
}

function modeAnnotationNoteDataResolve(mode: any, freqHz: number) {
  const calculated = noteAndCentsFromFreq(freqHz);
  return {
    note: modeAnnotationNoteLabelResolve(mode, calculated.note),
    cents: Number.isFinite(mode?.cents) ? mode.cents as number : calculated.cents,
  };
}

function modeAnnotationNoteLabelResolve(mode: any, calculatedNote: string | null) {
  const modeNote = typeof mode?.note === "string" ? mode.note.trim() : "";
  return modeNote || calculatedNote || "—";
}

function modeAnnotationTextBuild(
  meta: ModeMeta,
  aliasLabel: string,
  freqHz: number,
  noteLabel: string,
  centsLabel: string,
) {
  return `${meta.label}${aliasLabel}<br><span style="color:${meta.color}; font-weight:600;">${freqHz.toFixed(1)} Hz</span> · ${noteLabel} ${centsLabel}`;
}

function modeAnnotationPreviewTextFromFreq(meta: ModeMeta, aliasLabel: string, freqHz: number) {
  const noteData = noteAndCentsFromFreq(freqHz);
  const noteLabel = noteData.note ?? "—";
  const centsLabel = spectrumHoverCentsLabelBuild(noteData.cents);
  return modeAnnotationTextBuild(meta, aliasLabel, freqHz, noteLabel, centsLabel);
}

function dragPreviewSnapFromFreq(freqs: number[], mags: number[], freqHz: number) {
  if (!Number.isFinite(freqHz) || !freqs.length || !mags.length) return null;
  const idx = nearestSpectrumIndexFromFreq(freqs, freqHz);
  if (!Number.isFinite(idx)) return null;
  const x = freqs[idx as number];
  const y = mags[idx as number];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { idx: idx as number, x, y } as SpectrumDragPreview;
}

function spectrumRenderModelAssemble(args: {
  freqs: number[];
  mags: number[];
  modes: any[] | undefined;
  overlaySegments: OverlaySegment[];
  overlayVisible: boolean;
  hoverNoteData: Array<[string, string]>;
  secondarySpectrum?: { freqs: number[]; mags: number[] } | null;
  peakHoldSpectrum?: { freqs: number[]; mags: number[] } | null;
  polymaxCandidates: Array<{ freqHz: number; zeta: number; stability: number; orderCount: number }> ;
  deps: SpectrumRenderDeps;
}) {
  const measuredTrace = buildMeasuredTrace(args.freqs, args.mags, args.hoverNoteData);
  const secondaryMeasuredTrace = buildSecondaryMeasuredTrace(
    args.secondarySpectrum,
    spectrumSecondaryTraceShouldRenderForMeasureMode(),
  );
  const peakHoldTrace = buildPeakHoldTrace(args.peakHoldSpectrum);
  const overlayTraces = buildOverlayTraces(args.overlaySegments, args.overlayVisible);
  const polymaxTraces = buildPolymaxTraces(args.polymaxCandidates, args.freqs, args.mags);
  const toneTrace = toneSpikeTraceBuild(args.freqs, args.mags);
  const { modeTraces, modeAnnotations, modeAnnotationKeys, modeAnnotationAnchorX } = buildModeTracesAndAnnotations(
    args.freqs,
    args.mags,
    args.modes,
    args.deps.modeMeta,
  );
  const layout = buildSpectrumLayout(args.deps, modeAnnotations, spectrumRangeSourcesBuild(args));
  const plotData = buildSpectrumPlotData(measuredTrace, secondaryMeasuredTrace, peakHoldTrace, overlayTraces, polymaxTraces, modeTraces, toneTrace);
  const modeTraceIndexByKey = buildModeTraceIndexByKey(modeTraces, args.modes, overlayTraces.length + polymaxTraces.length, Boolean(secondaryMeasuredTrace), Boolean(peakHoldTrace));
  const modeAnnotationIndexByKey = buildModeAnnotationIndexByKey(modeAnnotationKeys);
  const toneTraceIndex = plotData.length - 1;
  return {
    plotData,
    layout,
    modeAnnotationKeys,
    modeAnnotationAnchorX,
    modeTraceIndexByKey,
    modeAnnotationIndexByKey,
    toneTraceIndex,
  };
}

function spectrumRangeSourcesBuild(args: {
  freqs: number[];
  mags: number[];
  secondarySpectrum?: { freqs: number[]; mags: number[] } | null;
  peakHoldSpectrum?: { freqs: number[]; mags: number[] } | null;
}) {
  return [
    { freqs: args.freqs, mags: args.mags },
    args.secondarySpectrum || null,
    args.peakHoldSpectrum || null,
  ].filter((source): source is SpectrumRangeSource => Boolean(source?.freqs?.length && source?.mags?.length));
}

function spectrumSecondaryTraceShouldRenderForMeasureMode() {
  const measureMode = (document.getElementById("measure_mode") as HTMLSelectElement | null)?.value;
  return measureMode === "played_note";
}

function toneSpikeTraceBuild(freqs: number[], mags: number[]) {
  const yBottom = toneSpikeFloorDbResolve(mags);
  const yTop = toneSpikeCeilingDbResolve(mags);
  const fallbackX = toneSpikeFallbackFreqResolve(freqs);
  return {
    x: [fallbackX, fallbackX],
    y: [yBottom, yTop],
    type: "scatter",
    mode: "lines",
    line: { color: resolveColorRgbaFromRole("modelOverlay", 0.95), width: 2, dash: "dot" },
    hoverinfo: "skip",
    showlegend: false,
    visible: false,
    meta: { kind: "tone-spike" },
  };
}

function toneSpikeFallbackFreqResolve(freqs: number[]) {
  if (!Array.isArray(freqs) || !freqs.length) return 0;
  return Number.isFinite(freqs[0]) ? (freqs[0] as number) : 0;
}

function toneSpikeFloorDbResolve(mags: number[]) {
  const finiteMags = mags.filter((value) => Number.isFinite(value));
  if (!finiteMags.length) return -90;
  return Math.min(...finiteMags) - 3;
}

function toneSpikeCeilingDbResolve(mags: number[]) {
  const finiteMags = mags.filter((value) => Number.isFinite(value));
  if (!finiteMags.length) return -20;
  return Math.max(...finiteMags);
}

function toneSpikeTraceUpdate(plot: HTMLElement, toneTraceIndex: number, freqHz: number, mags: number[]) {
  if (!Number.isFinite(freqHz) || toneTraceIndex < 0) return;
  const yBottom = toneSpikeFloorDbResolve(mags);
  const yTop = toneSpikeCeilingDbResolve(mags);
  (window as any).Plotly?.restyle?.(
    plot,
    { x: [[freqHz, freqHz]], y: [[yBottom, yTop]], visible: true },
    toneTraceIndex,
  );
}

function toneSpikeTraceVisibilitySet(plot: HTMLElement, toneTraceIndex: number, visible: boolean) {
  if (toneTraceIndex < 0) return;
  (window as any).Plotly?.restyle?.(plot, { visible }, toneTraceIndex);
}

function modeOverrideLabelBind(plot: HTMLElement, modeAnnotationKeys: string[], modeAnnotationAnchorX: Record<string, number>) {
  const plotAny = plot as any;
  plotAny.__modeAnnotationKeys = modeAnnotationKeys;
  plotAny.__modeAnnotationAnchorX = modeAnnotationAnchorX;
  if (!plotAny.on || modeOverrideLabelBound) return;
  modeOverrideLabelBound = true;
  const handler = (evt: Record<string, unknown>, commit: boolean) => {
    if (plotAny.__modePreviewRelayoutOrigin) return;
    const move = modeOverrideLabelMoveExtract(
      evt,
      plotAny.__modeAnnotationKeys || [],
    );
    if (!move) return;
    if (commit && modeOverridePreviewRelayoutInFlight(plotAny)) return;
    const snap = modeOverrideSnapFromPreview(plotAny, move);
    if (!snap) {
      if (!(plotAny.__modePreviewSkipLogAt && performance.now() - plotAny.__modePreviewSkipLogAt < 500)) {
        plotAny.__modePreviewSkipLogAt = performance.now();
        console.warn("[Resonance Reader] drag preview skipped", { evt });
      }
      return;
    }
    if (commit) {
      emitModeOverrideRequested(snap.modeKey, snap.freqHz);
      return;
    }
    modeOverridePreviewUpdate(plotAny, snap, false);
  };
  plotAny.on("plotly_relayouting", (evt: Record<string, unknown>) => handler(evt, false));
  plotAny.on("plotly_relayout", (evt: Record<string, unknown>) => handler(evt, true));
}

function modeOverrideLabelMoveExtract(
  evt: Record<string, unknown>,
  modeKeys: string[],
) {
  if (!evt || !Array.isArray(modeKeys) || !modeKeys.length) return null;
  for (const [key, value] of Object.entries(evt)) {
    const match = key.match(/^annotations\[(\d+)\]\.x$/);
    if (!match) continue;
    const idx = Number(match[1]);
    if (!Number.isInteger(idx)) continue;
    const modeKey = modeKeys[idx] as string | undefined;
    if (!modeKey) continue;
    const freqHz = Number(value);
    if (!Number.isFinite(freqHz)) continue;
    return { modeKey, freqHz };
  }
  return null;
}

function modeOverrideSnapFromPreview(
  plot: any,
  move: { modeKey: string; freqHz: number },
) {
  const preview = plot?.__modePreview as
    | {
        freqs: number[];
        mags: number[];
      }
    | undefined;
  if (!preview) return null;
  const { freqs, mags } = preview;
  if (!Array.isArray(freqs) || !Array.isArray(mags) || !freqs.length || !mags.length) return null;
  const snap = dragPreviewSnapFromFreq(freqs, mags, move.freqHz);
  if (!snap) return null;
  return { modeKey: move.modeKey, freqHz: snap.x, x: snap.x, y: snap.y };
}

function modeOverridePreviewUpdate(
  plot: any,
  move: { modeKey: string; freqHz: number; x: number; y: number },
  commit: boolean,
) {
  const preview = plot?.__modePreview as
    | {
        freqs: number[];
        mags: number[];
        modeKeys: string[];
        modeMetaByKey: Record<string, ModeMeta>;
        traceIndexByKey: Record<string, { dotBig: number; dotSmall: number }>;
        annotationIndexByKey: Record<string, number>;
      }
    | undefined;
  if (!preview) return;
  const { modeMetaByKey, traceIndexByKey, annotationIndexByKey } = preview;
  const { x, y } = move;
  const traces = traceIndexByKey[move.modeKey];
  if (!traces) return;
  if (typeof (window as any).Plotly?.restyle !== "function") return;
  (window as any).Plotly.restyle(plot, { x: [[x]], y: [[y]] }, traces.dotBig);
  (window as any).Plotly.restyle(plot, { x: [[x]], y: [[y]] }, traces.dotSmall);
  if (plot?.__modeAnnotationAnchorX) {
    plot.__modeAnnotationAnchorX[move.modeKey] = x;
  }
  const annotationIndex = annotationIndexByKey[move.modeKey];
  const meta = modeMetaByKey[move.modeKey];
  if (!Number.isInteger(annotationIndex) || !meta) return;
  const aliasLabel = meta.aliasText ? ` ${meta.aliasText}` : "";
  const text = modeAnnotationPreviewTextFromFreq(meta, aliasLabel, x);
  modeOverridePreviewRelayoutApply(plot, annotationIndex, traces, x, y, text, commit);
}

function modeOverridePreviewRelayoutApply(
  plot: any,
  annotationIndex: number,
  traces: { dotBig: number; dotSmall: number },
  x: number,
  y: number,
  text: string,
  commit: boolean,
) {
  if (plot.__modePreviewRelayoutLock) return;
  const relayoutPatch = modeOverridePreviewRelayoutPatchBuild(annotationIndex, traces, x, y, text);
  modeOverridePreviewRelayoutCommit(plot, relayoutPatch);
}

function modeOverridePreviewRelayoutPatchBuild(
  annotationIndex: number,
  traces: { dotBig: number; dotSmall: number },
  x: number,
  y: number,
  text: string,
) {
  const relayoutPatch: Record<string, unknown> = {
    [`annotations[${annotationIndex}].x`]: x,
    [`annotations[${annotationIndex}].y`]: y,
    [`annotations[${annotationIndex}].ax`]: 0,
    [`annotations[${annotationIndex}].ay`]: MODE_CALLOUT_ARROW_OFFSET_PX,
    [`annotations[${annotationIndex}].text`]: text,
  };
  return relayoutPatch;
}

function modeOverridePreviewRelayoutUntilStamp() {
  if (typeof performance?.now === "function") return performance.now() + 150;
  return Date.now() + 150;
}

function modeOverridePreviewRelayoutInFlight(plot: any) {
  const until = plot?.__modePreviewRelayoutUntil ?? 0;
  const now = typeof performance?.now === "function" ? performance.now() : Date.now();
  return now < until;
}

function modeOverridePreviewRelayoutCommit(plot: any, relayoutPatch: Record<string, unknown>) {
  plot.__modePreviewRelayoutLock = true;
  plot.__modePreviewRelayoutOrigin = true;
  plot.__modePreviewRelayoutUntil = modeOverridePreviewRelayoutUntilStamp();
  const relayout = (window as any).Plotly.relayout(plot, relayoutPatch);
  if (relayout && typeof relayout.finally === "function") {
    relayout.finally(() => {
      plot.__modePreviewRelayoutLock = false;
      plot.__modePreviewRelayoutOrigin = false;
    });
  } else {
    plot.__modePreviewRelayoutLock = false;
    plot.__modePreviewRelayoutOrigin = false;
  }
}

function nearestSpectrumIndexFromFreq(freqs: number[], targetHz: number) {
  if (!freqs.length || !Number.isFinite(targetHz)) return null;
  let bestIdx = 0;
  for (let i = 1; i < freqs.length; i += 1) {
    if (Math.abs(freqs[i] - targetHz) < Math.abs(freqs[bestIdx] - targetHz)) bestIdx = i;
  }
  return bestIdx;
}

function spectrumColorWithAlpha(color: string, alpha: number) {
  const rgb = spectrumRgbFromHex(color);
  if (!rgb) return color;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function spectrumRgbFromHex(color: string) {
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (![r, g, b].every((v) => Number.isFinite(v))) return null;
  return { r, g, b };
}
function pipelineOverlayClassSync(overlayVisible: boolean) {
  if (!document?.body) return;
  document.body.classList.toggle("overlay-off", !overlayVisible);
}
