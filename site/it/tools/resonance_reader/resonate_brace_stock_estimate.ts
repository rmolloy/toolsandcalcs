import {
  braceStockMaterialBuildFromMeasurements,
  braceStockMeasurementsValid,
  type BraceStockMeasurements,
} from "./resonate_brace_stock_material.js";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js";

export function braceStockEstimateResolveFromState(state: Record<string, any>) {
  const measurements = state.braceStockMeasurements as BraceStockMeasurements | null | undefined;
  if (!measurements || !braceStockMeasurementsValid(measurements)) {
    return { status: "incomplete" as const, measurements: measurements ?? null, confirmation: null, material: null };
  }
  const confirmation = stockLongConfirmationResolve(state);
  if (confirmation?.mode !== "long" || !Number.isFinite(confirmation.frequencyHz)) {
    return { status: "needs-confirmation" as const, measurements, confirmation: null, material: null };
  }
  const material = braceStockMaterialBuildFromMeasurements(measurements, confirmation.frequencyHz);
  if (!material) {
    return { status: "needs-confirmation" as const, measurements, confirmation: null, material: null };
  }
  return { status: "ready" as const, measurements, confirmation, material };
}
