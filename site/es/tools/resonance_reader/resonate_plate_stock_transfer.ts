import type { ModeDetection } from "./resonate_mode_detection.js";
import { stockKindResolve } from "./resonate_stock_measurements.js";

export function plateStockTransferModesBuild(state: Record<string, any>, compatibleModes: ModeDetection[]) {
  if (stockKindResolve(state) !== "plate_stock") return compatibleModes;
  const confirmed = state.plateStockConfirmedLongMode;
  if (confirmed?.mode !== "long" || !Number.isFinite(confirmed.frequencyHz) || confirmed.frequencyHz <= 0) return compatibleModes;
  const long = { mode: "long", peakFreq: confirmed.frequencyHz } as ModeDetection;
  return [long, ...compatibleModes.filter(mode => mode.mode !== "long")];
}
