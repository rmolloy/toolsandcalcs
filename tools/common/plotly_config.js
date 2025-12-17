// Shared Plotly defaults for ToneLab charts.
// Usage: import { newPlotWithDefaults } from "../common/plotly_config.js";
const plotlyGlobal = (typeof window !== "undefined" ? window.Plotly : globalThis === null || globalThis === void 0 ? void 0 : globalThis.Plotly);
const DEFAULT_LAYOUT = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
};
const DEFAULT_CONFIG = {
    displayModeBar: true,
    displaylogo: false,
};
export function newPlotWithDefaults(el, traces, layout = {}, config = {}) {
    const Plotly = plotlyGlobal;
    if (!Plotly) {
        throw new Error("Plotly not available on window.Plotly.");
    }
    const mergedLayout = { ...DEFAULT_LAYOUT, ...layout };
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    return Plotly.newPlot(el, traces, mergedLayout, mergedConfig);
}
