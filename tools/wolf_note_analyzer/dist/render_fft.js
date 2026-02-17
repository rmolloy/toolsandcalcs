/**
 * FFT rendering helpers (Plotly + DOM wiring).
 */
import { ENERGY_COLORS, UNLABELED_META, allBodyModes, fftEngine, hexToRgba, setFftDefaultRanges } from "./state.js";
export async function renderFft(slice, f0, mode, precomputed = null) {
    var _a, _b, _c, _d;
    const plot = document.getElementById("plot_fft");
    if (!plot)
        return;
    if (!slice) {
        (_b = (_a = window.Plotly) === null || _a === void 0 ? void 0 : _a.purge) === null || _b === void 0 ? void 0 : _b.call(_a, plot);
        return null;
    }
    const spectrum = precomputed || await fftEngine.magnitude(slice.wave, slice.sampleRate, { maxFreq: 1000, window: "hann" });
    const smoothed = ((_c = window.FFTPlot) === null || _c === void 0 ? void 0 : _c.smoothSpectrum) ? window.FFTPlot.smoothSpectrum(spectrum, 1.5) : spectrum;
    const withDb = ((_d = window.FFTPlot) === null || _d === void 0 ? void 0 : _d.applyDb) ? window.FFTPlot.applyDb(smoothed) : smoothed;
    const freqs = Array.from(withDb.freqs, (v) => v);
    const dbs = Array.from(withDb.dbs || withDb.mags, (v) => v);
    const trace = {
        x: freqs,
        y: dbs,
        type: "scatter",
        mode: "lines",
        line: { color: "#8ecbff", width: 2.5 },
        hovertemplate: "%{x:.1f} Hz<br>%{y:.1f} dB<extra></extra>",
    };
    const shapes = [];
    const annotations = [];
    if (Number.isFinite(f0)) {
        const f0Val = f0;
        [1, 2, 3].forEach((mult, idx) => {
            const x = f0Val * mult;
            shapes.push({
                type: "line",
                xref: "x",
                yref: "paper",
                x0: x,
                x1: x,
                y0: 0,
                y1: 1,
                line: { color: idx === 0 ? ENERGY_COLORS.fundamental : ENERGY_COLORS.harmonic, width: 1.5, dash: idx === 0 ? "solid" : "dot" },
            });
        });
    }
    allBodyModes().forEach((m) => {
        if (!Number.isFinite(m === null || m === void 0 ? void 0 : m.peakFreq))
            return;
        const color = m.color || UNLABELED_META.color;
        const band = Math.max(5, m.peakFreq * 0.01);
        shapes.push({
            type: "rect",
            xref: "x",
            yref: "paper",
            x0: m.peakFreq - band,
            x1: m.peakFreq + band,
            y0: 0,
            y1: 1,
            fillcolor: hexToRgba(color, 0.18),
            line: { color: hexToRgba(color, 0.55), width: 1 },
        });
        annotations.push({
            x: m.peakFreq,
            y: 0.95,
            xref: "x",
            yref: "paper",
            text: m.label,
            showarrow: false,
            font: { color: hexToRgba(color, 0.9), size: 10 },
            bgcolor: "rgba(6, 10, 18, 0.65)",
            bordercolor: hexToRgba(color, 0.35),
            borderwidth: 1,
            borderpad: 3,
            xanchor: "center",
        });
    });
    const layout = {
        margin: { l: 50, r: 10, t: 10, b: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        xaxis: { title: "Frequency (Hz)", gridcolor: "rgba(255,255,255,0.06)" },
        yaxis: { title: "Level (dB)", gridcolor: "rgba(255,255,255,0.06)" },
        shapes,
        annotations,
        showlegend: false,
    };
    window.Plotly.newPlot(plot, [trace], layout, {
        displayModeBar: true,
        displaylogo: false,
        responsive: true,
    });
    const xRange = [freqs[0] || 0, freqs[freqs.length - 1] || 1000];
    const yMax = Math.max(...dbs);
    const yMin = Math.min(...dbs);
    setFftDefaultRanges({ x: xRange, y: [yMin, yMax] });
    return withDb;
}
if (typeof window !== "undefined") {
    window.renderFft = renderFft;
}
