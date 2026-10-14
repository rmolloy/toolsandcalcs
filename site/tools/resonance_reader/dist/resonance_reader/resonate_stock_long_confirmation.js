import { stockKindResolve } from "./resonate_stock_measurements.js?rev=88a3838e0e5a";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js?rev=88a3838e0e5a";
const CONFIRMATION_FIELDS = { plate_stock: "plateStockConfirmedLongMode", brace_stock: "braceStockConfirmedLongMode" };
export function stockLongConfirmationResolve(state) {
    const kind = stockKindResolve(state);
    return kind ? state[CONFIRMATION_FIELDS[kind]] ?? null : null;
}
export function stockLongConfirmationApply(state, selection) {
    const kind = stockKindResolve(state);
    const confirmation = braceStockLongModeConfirmationBuild(selection);
    if (!kind || !confirmation)
        return null;
    state[CONFIRMATION_FIELDS[kind]] = confirmation;
    state.stockMeasurementKind = kind;
    return confirmation;
}
export function stockLongConfirmationClear(state) {
    const kind = stockKindResolve(state);
    if (kind)
        state[CONFIRMATION_FIELDS[kind]] = null;
}
