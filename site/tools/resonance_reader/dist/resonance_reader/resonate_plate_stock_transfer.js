import { stockKindResolve } from "./resonate_stock_measurements.js?rev=88a3838e0e5a";
export function plateStockTransferModesBuild(state, compatibleModes) {
    if (stockKindResolve(state) !== "plate_stock")
        return compatibleModes;
    const confirmed = state.plateStockConfirmedLongMode;
    if (confirmed?.mode !== "long" || !Number.isFinite(confirmed.frequencyHz) || confirmed.frequencyHz <= 0)
        return compatibleModes;
    const long = { mode: "long", peakFreq: confirmed.frequencyHz };
    return [long, ...compatibleModes.filter(mode => mode.mode !== "long")];
}
