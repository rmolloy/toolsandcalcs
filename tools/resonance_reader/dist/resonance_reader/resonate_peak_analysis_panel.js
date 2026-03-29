export function peakAnalysisPanelInitialize(state) {
    peakAnalysisSelectionSyncFromState(state);
    peakAnalysisPanelRenderFromState(state);
}
export function peakAnalysisPanelRenderFromState(state) {
    const selectedMode = peakAnalysisSelectionSyncFromState(state);
    peakAnalysisSummaryRender(selectedMode);
    peakAnalysisPlotRender(state, selectedMode);
}
export function peakAnalysisSelectionApplyFromModeKey(state, modeKey) {
    state.peakAnalysisSelectedKey = modeKey;
}
export function peakAnalysisSpectrumReadFromState(state) {
    return state.lastSpectrumRaw || state.lastSpectrum || null;
}
export function peakAnalysisSelectionSyncFromState(state) {
    const cards = peakAnalysisCardsReadFromState(state);
    const current = peakAnalysisCardFindByKey(cards, state.peakAnalysisSelectedKey);
    if (current)
        return current;
    const fallback = peakAnalysisCardPreferredResolve(cards);
    state.peakAnalysisSelectedKey = fallback?.key ?? null;
    return fallback;
}
export function peakAnalysisWidthHzResolveFromMode(mode) {
    if (!Number.isFinite(mode?.freq) || !Number.isFinite(mode?.q) || mode?.q <= 0)
        return null;
    return mode?.freq / mode?.q;
}
function peakAnalysisSummaryRender(selectedMode) {
    const summary = peakAnalysisSummaryElementGet();
    if (!summary)
        return;
    if (!selectedMode) {
        summary.innerHTML = peakAnalysisEmptyHtmlBuild();
        return;
    }
    summary.innerHTML = peakAnalysisStatsHtmlBuild(selectedMode);
}
function peakAnalysisStatsHtmlBuild(selectedMode) {
    const stats = [
        peakAnalysisStatHtmlBuild("Selection", selectedMode.label || "—"),
        peakAnalysisStatHtmlBuild("Frequency", peakAnalysisFrequencyLabelBuild(selectedMode.freq)),
        peakAnalysisStatHtmlBuild("Note", peakAnalysisNoteLabelBuild(selectedMode)),
        peakAnalysisStatHtmlBuild("Spectral Q", peakAnalysisQLabelBuild(selectedMode.q)),
        peakAnalysisStatHtmlBuild("Peak Width", peakAnalysisWidthLabelBuild(selectedMode)),
        peakAnalysisStatHtmlBuild("Source", peakAnalysisSourceLabelBuild(selectedMode)),
    ];
    const deltaHtml = Number.isFinite(selectedMode.deltaHz)
        ? peakAnalysisStatHtmlBuild("Target Delta", peakAnalysisDeltaLabelBuild(selectedMode.deltaHz))
        : "";
    return `${stats.join("")}${deltaHtml}`;
}
function peakAnalysisStatHtmlBuild(label, value) {
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
function peakAnalysisFrequencyLabelBuild(freq) {
    if (!Number.isFinite(freq))
        return "—";
    return `${freq.toFixed(1)} Hz`;
}
function peakAnalysisNoteLabelBuild(mode) {
    if (!mode.note)
        return "—";
    const cents = Number.isFinite(mode.cents) ? `${mode.cents >= 0 ? "+" : ""}${Math.round(mode.cents)}¢` : "";
    return cents ? `${mode.note} ${cents}` : mode.note;
}
function peakAnalysisQLabelBuild(q) {
    if (!Number.isFinite(q))
        return "—";
    return `Q ${Math.round(q)}`;
}
function peakAnalysisWidthLabelBuild(mode) {
    const widthHz = peakAnalysisWidthHzResolveFromMode(mode);
    if (!Number.isFinite(widthHz))
        return "—";
    return `${widthHz.toFixed(2)} Hz`;
}
function peakAnalysisSourceLabelBuild(mode) {
    return mode.kind === "custom" ? "Custom" : "Built-in";
}
function peakAnalysisDeltaLabelBuild(deltaHz) {
    const sign = deltaHz >= 0 ? "+" : "";
    return `${sign}${deltaHz.toFixed(1)} Hz`;
}
function peakAnalysisPlotRender(state, selectedMode) {
    const plot = peakAnalysisPlotElementGet();
    if (!plot)
        return;
    const windowData = peakAnalysisWindowDataBuild(peakAnalysisSpectrumReadFromState(state), selectedMode);
    if (!windowData) {
        plot.hidden = true;
        peakAnalysisPlotClear(plot);
        return;
    }
    plot.hidden = false;
    peakAnalysisPlotApply(plot, windowData);
}
function peakAnalysisWindowDataBuild(spectrum, selectedMode) {
    if (!selectedMode || !Number.isFinite(selectedMode.freq))
        return null;
    const freqs = Array.isArray(spectrum?.freqs) ? spectrum?.freqs : [];
    const dbs = peakAnalysisDbsResolveFromSpectrum(spectrum);
    if (!freqs.length || freqs.length !== dbs.length)
        return null;
    const centerHz = selectedMode.freq;
    const halfWindowHz = peakAnalysisHalfWindowHzResolve(centerHz);
    const points = freqs.reduce((rows, freq, index) => {
        const db = dbs[index];
        if (!Number.isFinite(freq) || !Number.isFinite(db))
            return rows;
        if (freq < centerHz - halfWindowHz || freq > centerHz + halfWindowHz)
            return rows;
        rows.push({ freq, db });
        return rows;
    }, []);
    if (!points.length)
        return null;
    const selectedPoint = peakAnalysisPointNearestResolve(points, centerHz);
    return {
        x: points.map((point) => point.freq),
        y: points.map((point) => point.db),
        selectedX: selectedPoint.freq,
        selectedY: selectedPoint.db,
        widthHz: peakAnalysisWidthHzResolveFromMode(selectedMode),
    };
}
function peakAnalysisDbsResolveFromSpectrum(spectrum) {
    if (Array.isArray(spectrum?.dbs))
        return spectrum.dbs;
    const mags = Array.isArray(spectrum?.mags) ? spectrum.mags : [];
    return mags.map((magnitude) => 20 * Math.log10(Math.max(Number(magnitude) || 0, 1e-12)));
}
function peakAnalysisHalfWindowHzResolve(centerHz) {
    return Math.max(18, Math.min(120, centerHz * 0.25));
}
function peakAnalysisPointNearestResolve(points, centerHz) {
    return points.reduce((best, point) => {
        if (!best)
            return point;
        return Math.abs(point.freq - centerHz) < Math.abs(best.freq - centerHz) ? point : best;
    }, null);
}
function peakAnalysisPlotApply(plot, data) {
    const Plotly = peakAnalysisPlotlyResolve();
    if (!Plotly?.react)
        return;
    Plotly.react(plot, peakAnalysisTracesBuild(data), peakAnalysisLayoutBuild(data), { displayModeBar: false, responsive: true });
}
function peakAnalysisTracesBuild(data) {
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
function peakAnalysisLayoutBuild(data) {
    const halfWidth = Number.isFinite(data.widthHz) ? data.widthHz / 2 : null;
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
function peakAnalysisBandEdgeShapeBuild(x) {
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
function peakAnalysisPlotClear(plot) {
    const Plotly = peakAnalysisPlotlyResolve();
    Plotly?.purge?.(plot);
}
function peakAnalysisCardsReadFromState(state) {
    return Array.isArray(state.lastModeCards) ? state.lastModeCards : [];
}
function peakAnalysisCardFindByKey(cards, key) {
    if (typeof key !== "string" || !key)
        return null;
    return cards.find((card) => card.key === key) || null;
}
function peakAnalysisCardPreferredResolve(cards) {
    return cards.find((card) => Number.isFinite(card.freq)) || cards[0] || null;
}
function peakAnalysisSummaryElementGet() {
    return document.getElementById("peak_analysis_summary");
}
function peakAnalysisPlotElementGet() {
    return document.getElementById("plot_peak_analysis");
}
function peakAnalysisPlotlyResolve() {
    const scope = window;
    return scope.Plotly || null;
}
