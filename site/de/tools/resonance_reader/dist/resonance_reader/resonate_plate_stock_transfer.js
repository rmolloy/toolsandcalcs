import { stockKindResolve } from "./resonate_stock_measurements.js?rev=b5b8fa4adb00";
import { stockLongConfirmationResolve } from "./resonate_stock_long_confirmation.js?rev=b5b8fa4adb00";
export function plateStockTransferModesBuild(state, compatibleModes) {
    if (stockKindResolve(state) !== "plate_stock")
        return compatibleModes;
    const confirmed = stockLongConfirmationResolve(state);
    if (confirmed?.mode !== "long" || !Number.isFinite(confirmed.frequencyHz) || confirmed.frequencyHz <= 0)
        return compatibleModes;
    const long = { mode: "long", peakFreq: confirmed.frequencyHz };
    return [long, ...compatibleModes.filter(mode => mode.mode !== "long")];
}
