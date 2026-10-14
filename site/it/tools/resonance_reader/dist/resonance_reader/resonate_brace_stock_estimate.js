import { braceStockMaterialBuildFromMeasurements, braceStockMeasurementsValid, } from "./resonate_brace_stock_material.js";
export function braceStockEstimateResolveFromState(state) {
    const measurements = state.braceStockMeasurements;
    if (!measurements || !braceStockMeasurementsValid(measurements)) {
        return { status: "incomplete", measurements: measurements ?? null, confirmation: null, material: null };
    }
    const confirmation = state.braceStockConfirmedLongMode;
    if (confirmation?.mode !== "long" || !Number.isFinite(confirmation.frequencyHz)) {
        return { status: "needs-confirmation", measurements, confirmation: null, material: null };
    }
    const material = braceStockMaterialBuildFromMeasurements(measurements, confirmation.frequencyHz);
    if (!material) {
        return { status: "needs-confirmation", measurements, confirmation: null, material: null };
    }
    return { status: "ready", measurements, confirmation, material };
}
