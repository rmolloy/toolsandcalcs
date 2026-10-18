import { stockKindResolve } from "./resonate_stock_measurements.js?rev=aab423209ba9";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=aab423209ba9";
export function plateStockTransferModesBuild(state, compatibleModes) {
    if (stockKindResolve(state) !== "plate_stock")
        return compatibleModes;
    const confirmed = stockLongConfirmationResolve(state);
    if (confirmed?.mode !== "long" || !Number.isFinite(confirmed.frequencyHz) || confirmed.frequencyHz <= 0)
        return compatibleModes;
    const long = { mode: "long", peakFreq: confirmed.frequencyHz };
    return [long, ...compatibleModes.filter(mode => mode.mode !== "long")];
}
