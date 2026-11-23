import { stockMeasurementsDraftBuild } from "./resonate_stock_measurements.js?rev=dae658f6289e";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=dae658f6289e";
import { braceStockMeasurementsValid } from "./resonate_brace_stock_material.js?rev=dae658f6289e";
import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js?rev=dae658f6289e";
import { plateStockMaterialBuildFromMeasurements } from "./resonate_plate_stock_material.js?rev=dae658f6289e";
export function stockMaterialEstimateResolve(state) {
    const draft = stockMeasurementsDraftBuild(state);
    if (draft.kind === "brace_stock")
        return braceStockEstimateResolveFromState(state);
    const confirmation = stockLongConfirmationResolve(state);
    if (!draft.kind || !braceStockMeasurementsValid(draft.measurements))
        return { status: "incomplete", material: null, confirmation };
    if (confirmation?.mode !== "long")
        return { status: "needs-confirmation", material: null, confirmation: null };
    const material = plateStockMaterialBuildFromMeasurements(draft.measurements, confirmation.frequencyHz);
    if (!material)
        return { status: "unavailable", material: null, confirmation };
    return { status: "ready", material, confirmation };
}
