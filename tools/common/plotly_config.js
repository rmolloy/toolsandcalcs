// Shared Plotly defaults for ToneLab charts.
// Usage: import { newPlotWithDefaults } from "../common/plotly_config.js";

const DEFAULT_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
};

const DEFAULT_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
};

export function newPlotWithDefaults(el, traces, layout = {}, config = {}) {
  const mergedLayout = { ...DEFAULT_LAYOUT, ...layout };
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return window.Plotly.newPlot(el, traces, mergedLayout, mergedConfig);
}
