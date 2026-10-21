import { braceStockMaterialBuildFromMeasurements, braceStockMeasurementsValid, } from "./resonate_brace_stock_material.js?rev=b5b8fa4adb00";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=b5b8fa4adb00";
export function braceStockEstimateResolveFromState(state) {
    const measurements = state.braceStockMeasurements;
    if (!measurements || !braceStockMeasurementsValid(measurements)) {
        return { status: "incomplete", measurements: measurements ?? null, confirmation: null, material: null };
    }
    const confirmation = stockLongConfirmationResolve(state);
    if (confirmation?.mode !== "long" || !Number.isFinite(confirmation.frequencyHz)) {
        return { status: "needs-confirmation", measurements, confirmation: null, material: null };
    }
    const material = braceStockMaterialBuildFromMeasurements(measurements, confirmation.frequencyHz);
    if (!material) {
        return { status: "needs-confirmation", measurements, confirmation: null, material: null };
    }
    return { status: "ready", measurements, confirmation, material };
}
