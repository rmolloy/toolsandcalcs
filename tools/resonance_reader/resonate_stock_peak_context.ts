import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
import { stockKindResolve } from "./resonate_stock_measurements.js";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js";

export function stockPeakContextDiffers(state: Record<string, any>) {
  const kind = stockKindResolve(state);
  return state.measureMode === "peak_analysis" && Boolean(kind && kind !== peakAnalysisSourceMeasureModeResolve(state));
}

export function stockPeakLabelsForSpecimen<T extends { label: string; freq: number | null }>(state: Record<string, any>, peaks: T[]): T[] {
  if (!stockPeakContextDiffers(state)) return peaks;
  const frequency = stockLongConfirmationResolve(state)?.frequencyHz;
  return peaks.map(peak => ({ ...peak, label: stockPeakLabelBuild(peak.freq, frequency) }));
}

function stockPeakLabelBuild(peakHz: number | null, confirmedHz: number | undefined) {
  if (Number.isFinite(peakHz) && Number.isFinite(confirmedHz) && Math.abs(Number(peakHz) - Number(confirmedHz)) < 0.05) return "Confirmed Long";
  return "Peak";
}
