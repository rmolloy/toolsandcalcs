// Shared Plotly defaults for ToneLab charts.
// Usage: import { newPlotWithDefaults } from "../common/plotly_config.js";

type PlotlyApi = {
  newPlot: (el: HTMLElement | string, traces: unknown[], layout?: Record<string, unknown>, config?: Record<string, unknown>) => unknown;
};

const plotlyGlobal = (typeof window !== "undefined" ? (window as any).Plotly : (globalThis as any)?.Plotly) as PlotlyApi | undefined;

const DEFAULT_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
};

const DEFAULT_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
};

export function newPlotWithDefaults(
  el: HTMLElement | string,
  traces: unknown[],
  layout: Record<string, unknown> = {},
  config: Record<string, unknown> = {}
) {
  const Plotly = plotlyGlobal;
  if (!Plotly) {
    throw new Error("Plotly not available on window.Plotly.");
  }
  const mergedLayout = { ...DEFAULT_LAYOUT, ...layout };
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return Plotly.newPlot(el, traces, mergedLayout, mergedConfig);
}
