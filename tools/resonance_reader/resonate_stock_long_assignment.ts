import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
import { stockKindResolve } from "./resonate_stock_measurements.js";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js";

export function stockLongAssignedModeResolve(state: Record<string, any>) {
  if (stockKindResolve(state) !== peakAnalysisSourceMeasureModeResolve(state)) return undefined;
  return stockLongAssignmentBuildFromCard(state, stockLongCardRead(state));
}

function stockLongCardRead(state: Record<string, any>) {
  const card = state.lastModeCards?.find((mode: { key: string }) => mode.key === "long");
  if (card) return { key: card.key, freq: card.freq };
  return stockLongCardBuildFromDetection(state);
}

function stockLongCardBuildFromDetection(state: Record<string, any>) {
  const detection = state.lastModesDetected?.find((mode: { mode: string }) => mode.mode === "long");
  return detection ? { key: "long", freq: detection.peakFreq } : null;
}

function stockLongAssignmentBuildFromCard(state: Record<string, any>, card: { key: string; freq: unknown } | null) {
  if (!card) return undefined;
  return braceStockLongModeConfirmationBuild({
    peakKey: card.key, frequencyHz: card.freq,
    tapIndex: state.peakAnalysisSelectedTapIndex, sourceLabel: state.recordingLabel,
  });
}
