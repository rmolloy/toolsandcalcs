import { stockKindResolve } from "./resonate_stock_measurements.js?rev=3d07b6bb6d26";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=3d07b6bb6d26";
export function plateStockTransferModesBuild(state, compatibleModes) {
    if (stockKindResolve(state) !== "plate_stock")
        return compatibleModes;
    const confirmed = stockLongConfirmationResolve(state);
    if (confirmed?.mode !== "long" || !Number.isFinite(confirmed.frequencyHz) || confirmed.frequencyHz <= 0)
        return compatibleModes;
    const long = { mode: "long", peakFreq: confirmed.frequencyHz };
    return [long, ...compatibleModes.filter(mode => mode.mode !== "long")];
}
