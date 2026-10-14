import { stockKindResolve } from "./resonate_stock_measurements.js?rev=1d50c39bd456";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js?rev=1d50c39bd456";
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
