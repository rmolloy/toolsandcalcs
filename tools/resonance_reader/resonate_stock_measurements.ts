import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
import { braceStockMeasurementsValid, type BraceStockMeasurements } from "./resonate_brace_stock_material.js";
import type { PlateMaterialMeasurements } from "./resonate_plate_material_panel.js";

export type StockKind = "plate_stock" | "brace_stock";
export type StockMeasurementsDraft = { kind: StockKind | null; measurements: BraceStockMeasurements };

export function stockMeasurementsEvidenceBuild(state: Record<string, any>) {
  if (!state.stockMeasurementKind && !state.braceStockMeasurements) return {};
  return {
    stockMeasurementKind: stockKindResolve(state),
    braceStockMeasurements: state.braceStockMeasurements ?? null,
    braceStockConfirmedLongMode: state.braceStockConfirmedLongMode ?? null,
    plateStockConfirmedLongMode: state.plateStockConfirmedLongMode ?? null,
    peakAnalysisSourceMeasureMode: state.peakAnalysisSourceMeasureMode ?? null,
  };
}

export function stockKindResolve(state: Record<string, any>): StockKind | null {
  if (stockKindValid(state.stockMeasurementKind)) return state.stockMeasurementKind;
  if (state.braceStockMeasurements) return "brace_stock";
  const context = state.measureMode === "peak_analysis" ? peakAnalysisSourceMeasureModeResolve(state) : state.measureMode;
  return stockKindValid(context) ? context : null;
}

export function stockKindValid(kind: unknown): kind is StockKind {
  return kind === "plate_stock" || kind === "brace_stock";
}

export function stockMeasurementsDraftBuild(state: Record<string, any>): StockMeasurementsDraft {
  const kind = stockKindResolve(state);
  const measurements = kind === "plate_stock"
    ? stockMeasurementsFromPlate(state.plateMaterialMeasurements)
    : state.braceStockMeasurements;
  return { kind, measurements: { ...stockMeasurementsEmpty(), ...measurements } };
}

export function stockMeasurementsDraftApply(state: Record<string, any>, draft: StockMeasurementsDraft) {
  if (!draft.kind || !braceStockMeasurementsValid(draft.measurements)) return false;
  if (draft.kind !== stockKindResolve(state)) {
    state.braceStockConfirmedLongMode = null;
    state.plateStockConfirmedLongMode = null;
  }
  state.stockMeasurementKind = draft.kind;
  state.braceStockMeasurements = draft.kind === "brace_stock" ? { ...draft.measurements } : null;
  state.plateMaterialMeasurements = draft.kind === "plate_stock" ? stockMeasurementsToPlate(draft.measurements) : null;
  if (draft.kind === "plate_stock") state.braceStockConfirmedLongMode = null;
  return true;
}

export function stockMeasurementsToPlate(measurements: BraceStockMeasurements): PlateMaterialMeasurements {
  return {
    panelLengthMm: measurements.stockLengthMm,
    panelWidthMm: measurements.stockWidthMm,
    panelHeightMm: measurements.stockHeightMm,
    panelMassG: measurements.stockMassG,
  };
}

function stockMeasurementsFromPlate(measurements?: PlateMaterialMeasurements | null) {
  if (!measurements) return stockMeasurementsEmpty();
  return {
    stockLengthMm: measurements.panelLengthMm,
    stockWidthMm: measurements.panelWidthMm,
    stockHeightMm: measurements.panelHeightMm,
    stockMassG: measurements.panelMassG,
  };
}

function stockMeasurementsEmpty(): BraceStockMeasurements {
  return { stockLengthMm: NaN, stockWidthMm: NaN, stockHeightMm: NaN, stockMassG: NaN };
}
