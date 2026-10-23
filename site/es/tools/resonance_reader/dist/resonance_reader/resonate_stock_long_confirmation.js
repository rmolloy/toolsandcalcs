import { stockKindResolve } from "./resonate_stock_measurements.js?rev=c40b9f2c1b26";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js?rev=c40b9f2c1b26";
import { stockLongAssignedModeResolve } from "./resonate_stock_long_assignment.js?rev=c40b9f2c1b26";
const CONFIRMATION_FIELDS = { plate_stock: "plateStockConfirmedLongMode", brace_stock: "braceStockConfirmedLongMode" };
export function stockLongConfirmationResolve(state) {
    const assigned = stockLongAssignedModeResolve(state);
    return assigned === undefined ? stockLongSavedAssignmentRead(state) : assigned;
}
function stockLongSavedAssignmentRead(state) {
    const kind = stockKindResolve(state);
    return kind ? state[CONFIRMATION_FIELDS[kind]] ?? null : null;
}
export function stockLongAssignmentCapture(state) {
    const assigned = stockLongAssignedModeResolve(state);
    if (assigned !== undefined)
        stockLongSavedAssignmentWrite(state, assigned);
}
function stockLongSavedAssignmentWrite(state, assignment) {
    const kind = stockKindResolve(state);
    if (kind)
        state[CONFIRMATION_FIELDS[kind]] = assignment;
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
