/**
 * Waveform rendering helpers (Plotly + interactions).
 */
import { appState, fftState, isWaveUpdatingShapes, setWaveStatus, setWaveUpdatingShapes } from "./state.js";
import { buildWaveShapes } from "./wave_shapes.js";
function noteLabelFromFreq(freq) {
    if (!Number.isFinite(freq))
        return null;
    const FFTUtils = window.FFTUtils;
    if (!(FFTUtils === null || FFTUtils === void 0 ? void 0 : FFTUtils.freqToNoteCents))
        return null;
    try {
        const out = FFTUtils.freqToNoteCents(freq);
        const name = typeof (out === null || out === void 0 ? void 0 : out.name) === "string" ? out.name : null;
        return name;
    }
    catch {
        return null;
    }
}
function buildWaveAnnotations() {
    const annotations = [];
    appState.noteSlices.forEach((note) => {
        var _a;
        const result = appState.noteResults.find((n) => n.id === note.id);
        const label = noteLabelFromFreq((_a = result === null || result === void 0 ? void 0 : result.f0) !== null && _a !== void 0 ? _a : null);
        if (!label)
            return;
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
export function renderWaveform(callbacks = {}) {
    var _a, _b;
    const plot = document.getElementById("plot_waveform");
    if (!plot)
        return;
    const source = fftState.currentWave;
    if (!source) {
        setWaveStatus("Load or record to detect taps and notes.");
        (_b = (_a = window.Plotly) === null || _a === void 0 ? void 0 : _a.purge) === null || _b === void 0 ? void 0 : _b.call(_a, plot);
        return;
    }
    const absWave = Array.from(source.wave, (v) => Math.abs(v));
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
    window.Plotly.newPlot(plot, [trace], layout, {
        displayModeBar: true,
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ["zoom2d", "pan2d", "select2d", "lasso2d", "zoomIn2d", "zoomOut2d", "autoScale2d"],
    });
    if (typeof plot.removeAllListeners === "function") {
        plot.removeAllListeners("plotly_relayout");
        plot.removeAllListeners("plotly_click");
    }
    plot.on("plotly_click", (ev) => {
        var _a, _b;
        const pt = (_a = ev === null || ev === void 0 ? void 0 : ev.points) === null || _a === void 0 ? void 0 : _a[0];
        if (!pt)
            return;
        const x = pt.x;
        const note = appState.noteSlices.find((n) => x >= n.startMs && x <= n.endMs);
        if (!note)
            return;
        appState.manualSelection = null;
        appState.autoSelect = false;
        appState.selectedNoteId = note.id;
        (_b = callbacks.onSelectionChange) === null || _b === void 0 ? void 0 : _b.call(callbacks);
    });
    plot.on("plotly_relayout", (ev) => {
        var _a, _b;
        if (isWaveUpdatingShapes())
            return;
        const range0 = ev["xaxis.range[0]"];
        const range1 = ev["xaxis.range[1]"];
        const auto = ev["xaxis.autorange"];
        if (range0 === undefined && range1 === undefined && auto === undefined)
            return;
        if (auto || range0 === undefined || range1 === undefined) {
            appState.manualSelection = null;
            (_a = callbacks.onSelectionChange) === null || _a === void 0 ? void 0 : _a.call(callbacks);
            return;
        }
        const start = Number(range0);
        const end = Number(range1);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            return;
        appState.manualSelection = null;
        (_b = callbacks.onManualRange) === null || _b === void 0 ? void 0 : _b.call(callbacks, { start, end });
    });
}
export function refreshWaveShapes() {
    const plot = document.getElementById("plot_waveform");
    if (!plot || !window.Plotly || !plot._fullLayout)
        return;
    const source = fftState.currentWave;
    if (!source)
        return;
    setWaveUpdatingShapes(true);
    Promise.resolve(window.Plotly.relayout(plot, { shapes: buildWaveShapes(source.sampleRate), annotations: buildWaveAnnotations() }))
        .finally(() => { setWaveUpdatingShapes(false); });
}
if (typeof window !== "undefined") {
    window.renderWaveform = renderWaveform;
    window.refreshWaveShapes = refreshWaveShapes;
}
