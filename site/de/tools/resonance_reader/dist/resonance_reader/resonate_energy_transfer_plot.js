import { resolveColorRgbaFromRole } from "./resonate_color_roles.js?rev=3f87131f64e6";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=3f87131f64e6";
export function energyPlotRender(traces, layout) {
    const plot = energyPlotElementGet();
    if (!plot)
        return;
    const plotly = window.Plotly;
    if (!plotly?.newPlot)
        return;
    const traceVisibilityByName = energyTraceVisibilityByNameRead(plot);
    const visibleTraces = energyTraceVisibilityApplyByName(traces, traceVisibilityByName);
    plotly.newPlot(plot, visibleTraces, layout, { displayModeBar: true, displaylogo: false, responsive: true });
}
export function energyPlotLayoutBuildFromSeries(series) {
    const shapes = [];
    const annotations = [];
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
            text: resonanceLocalizedMessages.energyTransferBodyDominanceTemplate
                .replace("{seconds}", series.dominanceTime.toFixed(2)),
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
            title: resonanceLocalizedMessages.energyTransferYAxisTitle,
            range: [0, energyYMaxVisibleResolveFromSeries(series)],
            gridcolor: "rgba(255,255,255,0.06)",
            zeroline: false,
            tickfont: { color: "rgba(255,255,255,0.5)" },
        },
        xaxis: {
            title: resonanceLocalizedMessages.energyTransferXAxisTitle,
            range: [0, series.xWindowSec.end - series.xWindowSec.start],
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
export function energyYMaxVisibleResolveFromSeries(series) {
    let maxVisible = 0;
    for (let i = 0; i < series.t.length; i += 1) {
        if (!Number.isFinite(series.t[i]))
            continue;
        const scale = Number.isFinite(series.levelScale[i]) ? series.levelScale[i] : 0;
        const values = [
            (series.partialShares.f0?.[i] || 0) * 100 * scale,
            (series.partialShares.secondPartial?.[i] || 0) * 100 * scale,
            (series.partialShares.thirdPartial?.[i] || 0) * 100 * scale,
            ...series.bodyModes.map((mode) => ((series.bodyShares[mode.id]?.[i] || 0) * 100 * scale)),
        ];
        const localMax = Math.max(...values, 0);
        if (localMax > maxVisible)
            maxVisible = localMax;
    }
    const floorMax = Math.max(maxVisible, 5);
    return (floorMax * 1.2) + 2;
}
function energyPlotElementGet() {
    return document.getElementById("plot_energy_transfer");
}
function energyTraceVisibilityByNameRead(plot) {
    const traces = Array.isArray(plot.data) ? plot.data : [];
    return traces.reduce((visibilityByName, trace) => {
        if (typeof trace?.name === "string" && trace.visible !== undefined) {
            visibilityByName[trace.name] = trace.visible;
        }
        return visibilityByName;
    }, {});
}
function energyTraceVisibilityApplyByName(traces, visibilityByName) {
    return traces.map((trace) => {
        if (!Object.prototype.hasOwnProperty.call(visibilityByName, trace.name))
            return trace;
        return { ...trace, visible: visibilityByName[trace.name] };
    });
}
