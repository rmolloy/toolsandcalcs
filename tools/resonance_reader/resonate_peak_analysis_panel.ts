import type { ModeCard } from "./resonate_types.js";

type SpectrumLike = {
  freqs?: number[];
  dbs?: number[];
  mags?: number[];
};

type PlotlyLike = {
  react: (element: HTMLElement, data: unknown[], layout: Record<string, unknown>, config?: Record<string, unknown>) => unknown;
  purge?: (element: HTMLElement) => unknown;
};

export function peakAnalysisPanelInitialize(state: Record<string, any>) {
  peakAnalysisSelectionSyncFromState(state);
  peakAnalysisPanelRenderFromState(state);
}

export function peakAnalysisPanelRenderFromState(state: Record<string, any>) {
  const selectedMode = peakAnalysisSelectionSyncFromState(state);
  peakAnalysisSummaryRender(selectedMode);
  peakAnalysisPlotRender(state, selectedMode);
}

export function peakAnalysisSelectionApplyFromModeKey(state: Record<string, any>, modeKey: string) {
  state.peakAnalysisSelectedKey = modeKey;
}

export function peakAnalysisSpectrumReadFromState(state: Record<string, any>) {
  return state.lastSpectrumRaw || state.lastSpectrum || null;
}

export function peakAnalysisSelectionSyncFromState(state: Record<string, any>) {
  const cards = peakAnalysisCardsReadFromState(state);
  const current = peakAnalysisCardFindByKey(cards, state.peakAnalysisSelectedKey);
  if (current) return current;
  const fallback = peakAnalysisCardPreferredResolve(cards);
  state.peakAnalysisSelectedKey = fallback?.key ?? null;
  return fallback;
}

export function peakAnalysisWidthHzResolveFromMode(mode: Pick<ModeCard, "freq" | "q"> | null | undefined) {
  if (!Number.isFinite(mode?.freq) || !Number.isFinite(mode?.q) || (mode?.q as number) <= 0) return null;
  return (mode?.freq as number) / (mode?.q as number);
}

function peakAnalysisSummaryRender(selectedMode: ModeCard | null) {
  const summary = peakAnalysisSummaryElementGet();
  if (!summary) return;
  if (!selectedMode) {
    summary.innerHTML = peakAnalysisEmptyHtmlBuild();
    return;
  }
  summary.innerHTML = peakAnalysisStatsHtmlBuild(selectedMode);
}

function peakAnalysisStatsHtmlBuild(selectedMode: ModeCard) {
  const stats = [
    peakAnalysisStatHtmlBuild("Selection", selectedMode.label || "—"),
    peakAnalysisStatHtmlBuild("Frequency", peakAnalysisFrequencyLabelBuild(selectedMode.freq)),
    peakAnalysisStatHtmlBuild("Note", peakAnalysisNoteLabelBuild(selectedMode)),
    peakAnalysisStatHtmlBuild("Spectral Q", peakAnalysisQLabelBuild(selectedMode.q)),
    peakAnalysisStatHtmlBuild("Peak Width", peakAnalysisWidthLabelBuild(selectedMode)),
    peakAnalysisStatHtmlBuild("Source", peakAnalysisSourceLabelBuild(selectedMode)),
  ];
  const deltaHtml = Number.isFinite(selectedMode.deltaHz)
    ? peakAnalysisStatHtmlBuild("Target Delta", peakAnalysisDeltaLabelBuild(selectedMode.deltaHz as number))
    : "";
  return `${stats.join("")}${deltaHtml}`;
}

function peakAnalysisStatHtmlBuild(label: string, value: string) {
  return `
    <div class="peak-analysis-stat">
      <span class="peak-analysis-stat-label">${label}</span>
      <span class="peak-analysis-stat-value">${value}</span>
    </div>
  `;
}

function peakAnalysisEmptyHtmlBuild() {
  return `
    <div class="peak-analysis-empty">
      <p class="muted small">Peak analysis will follow the selected mode card.</p>
    </div>
  `;
}

function peakAnalysisFrequencyLabelBuild(freq: number | null) {
  if (!Number.isFinite(freq)) return "—";
  return `${(freq as number).toFixed(1)} Hz`;
}

function peakAnalysisNoteLabelBuild(mode: Pick<ModeCard, "note" | "cents">) {
  if (!mode.note) return "—";
  const cents = Number.isFinite(mode.cents) ? `${(mode.cents as number) >= 0 ? "+" : ""}${Math.round(mode.cents as number)}¢` : "";
  return cents ? `${mode.note} ${cents}` : mode.note;
}

function peakAnalysisQLabelBuild(q: number | null) {
  if (!Number.isFinite(q)) return "—";
  return `Q ${Math.round(q as number)}`;
}

function peakAnalysisWidthLabelBuild(mode: Pick<ModeCard, "freq" | "q">) {
  const widthHz = peakAnalysisWidthHzResolveFromMode(mode);
  if (!Number.isFinite(widthHz)) return "—";
  return `${(widthHz as number).toFixed(2)} Hz`;
}

function peakAnalysisSourceLabelBuild(mode: Pick<ModeCard, "kind">) {
  return mode.kind === "custom" ? "Custom" : "Built-in";
}

function peakAnalysisDeltaLabelBuild(deltaHz: number) {
  const sign = deltaHz >= 0 ? "+" : "";
  return `${sign}${deltaHz.toFixed(1)} Hz`;
}

function peakAnalysisPlotRender(state: Record<string, any>, selectedMode: ModeCard | null) {
  const plot = peakAnalysisPlotElementGet();
  if (!plot) return;
  const windowData = peakAnalysisWindowDataBuild(peakAnalysisSpectrumReadFromState(state), selectedMode);
  if (!windowData) {
    plot.hidden = true;
    peakAnalysisPlotClear(plot);
    return;
  }
  plot.hidden = false;
  peakAnalysisPlotApply(plot, windowData);
}

function peakAnalysisWindowDataBuild(spectrum: SpectrumLike | null | undefined, selectedMode: ModeCard | null) {
  if (!selectedMode || !Number.isFinite(selectedMode.freq)) return null;
  const freqs = Array.isArray(spectrum?.freqs) ? spectrum?.freqs : [];
  const dbs = peakAnalysisDbsResolveFromSpectrum(spectrum);
  if (!freqs.length || freqs.length !== dbs.length) return null;
  const centerHz = selectedMode.freq as number;
  const halfWindowHz = peakAnalysisHalfWindowHzResolve(centerHz);
  const points = freqs.reduce<Array<{ freq: number; db: number }>>((rows, freq, index) => {
    const db = dbs[index];
    if (!Number.isFinite(freq) || !Number.isFinite(db)) return rows;
    if (freq < centerHz - halfWindowHz || freq > centerHz + halfWindowHz) return rows;
    rows.push({ freq, db });
    return rows;
  }, []);
  if (!points.length) return null;
  const selectedPoint = peakAnalysisPointNearestResolve(points, centerHz);
  return {
    x: points.map((point) => point.freq),
    y: points.map((point) => point.db),
    selectedX: selectedPoint.freq,
    selectedY: selectedPoint.db,
    widthHz: peakAnalysisWidthHzResolveFromMode(selectedMode),
  };
}

function peakAnalysisDbsResolveFromSpectrum(spectrum: SpectrumLike | null | undefined) {
  if (Array.isArray(spectrum?.dbs)) return spectrum.dbs as number[];
  const mags = Array.isArray(spectrum?.mags) ? spectrum.mags : [];
  return mags.map((magnitude) => 20 * Math.log10(Math.max(Number(magnitude) || 0, 1e-12)));
}

function peakAnalysisHalfWindowHzResolve(centerHz: number) {
  return Math.max(18, Math.min(120, centerHz * 0.25));
}

function peakAnalysisPointNearestResolve(points: Array<{ freq: number; db: number }>, centerHz: number) {
  return points.reduce((best, point) => {
    if (!best) return point;
    return Math.abs(point.freq - centerHz) < Math.abs(best.freq - centerHz) ? point : best;
  }, null as { freq: number; db: number } | null)!;
}

function peakAnalysisPlotApply(
  plot: HTMLElement,
  data: { x: number[]; y: number[]; selectedX: number; selectedY: number; widthHz: number | null },
) {
  const Plotly = peakAnalysisPlotlyResolve();
  if (!Plotly?.react) return;
  Plotly.react(
    plot,
    peakAnalysisTracesBuild(data),
    peakAnalysisLayoutBuild(data),
    { displayModeBar: false, responsive: true },
  );
}

function peakAnalysisTracesBuild(data: { x: number[]; y: number[]; selectedX: number; selectedY: number }) {
  return [
    {
      x: data.x,
      y: data.y,
      type: "scatter",
      mode: "lines",
      line: { color: "#8ecbff", width: 2.2 },
      hovertemplate: "%{x:.1f} Hz<br>%{y:.2f} dB<extra></extra>",
      name: "Local spectrum",
    },
    {
      x: [data.selectedX],
      y: [data.selectedY],
      type: "scatter",
      mode: "markers",
      marker: { color: "#f5c46f", size: 9, line: { color: "rgba(15, 17, 24, 0.9)", width: 1.5 } },
      hovertemplate: "Selected peak<br>%{x:.1f} Hz<br>%{y:.2f} dB<extra></extra>",
      name: "Selected peak",
    },
  ];
}

function peakAnalysisLayoutBuild(data: { selectedX: number; widthHz: number | null }) {
  const halfWidth = Number.isFinite(data.widthHz) ? (data.widthHz as number) / 2 : null;
  return {
    margin: { l: 54, r: 18, t: 24, b: 42 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "rgba(230, 233, 239, 0.85)" },
    xaxis: {
      title: "Hz",
      gridcolor: "rgba(255,255,255,0.08)",
      zeroline: false,
    },
    yaxis: {
      title: "dB",
      gridcolor: "rgba(255,255,255,0.08)",
      zeroline: false,
    },
    showlegend: false,
    shapes: halfWidth
      ? [
          peakAnalysisBandEdgeShapeBuild(data.selectedX - halfWidth),
          peakAnalysisBandEdgeShapeBuild(data.selectedX + halfWidth),
        ]
      : [],
  };
}

function peakAnalysisBandEdgeShapeBuild(x: number) {
  return {
    type: "line",
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    yref: "paper",
    line: { color: "rgba(245, 196, 111, 0.36)", width: 1.2, dash: "dot" },
  };
}

function peakAnalysisPlotClear(plot: HTMLElement) {
  const Plotly = peakAnalysisPlotlyResolve();
  Plotly?.purge?.(plot);
}

function peakAnalysisCardsReadFromState(state: Record<string, any>) {
  return Array.isArray(state.lastModeCards) ? state.lastModeCards as ModeCard[] : [];
}

function peakAnalysisCardFindByKey(cards: ModeCard[], key: unknown) {
  if (typeof key !== "string" || !key) return null;
  return cards.find((card) => card.key === key) || null;
}

function peakAnalysisCardPreferredResolve(cards: ModeCard[]) {
  return cards.find((card) => Number.isFinite(card.freq)) || cards[0] || null;
}

function peakAnalysisSummaryElementGet() {
  return document.getElementById("peak_analysis_summary") as HTMLElement | null;
}

function peakAnalysisPlotElementGet() {
  return document.getElementById("plot_peak_analysis") as HTMLElement | null;
}

function peakAnalysisPlotlyResolve() {
  const scope = window as typeof window & { Plotly?: PlotlyLike };
  return scope.Plotly || null;
}
