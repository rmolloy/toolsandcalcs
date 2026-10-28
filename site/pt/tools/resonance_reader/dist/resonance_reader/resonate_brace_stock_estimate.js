import { braceStockMaterialBuildFromMeasurements, braceStockMeasurementsValid, } from "./resonate_brace_stock_material.js?rev=093b6a20873d";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=093b6a20873d";
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
