import { stockKindResolve } from "./resonate_stock_measurements.js";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js";
import { stockLongAssignedModeResolve } from "./resonate_stock_long_assignment.js";

const CONFIRMATION_FIELDS = { plate_stock: "plateStockConfirmedLongMode", brace_stock: "braceStockConfirmedLongMode" } as const;

export function stockLongConfirmationResolve(state: Record<string, any>) {
  const assigned = stockLongAssignedModeResolve(state);
  return assigned === undefined ? stockLongSavedAssignmentRead(state) : assigned;
}

function stockLongSavedAssignmentRead(state: Record<string, any>) {
  const kind = stockKindResolve(state);
  return kind ? state[CONFIRMATION_FIELDS[kind]] ?? null : null;
}

export function stockLongAssignmentCapture(state: Record<string, any>) {
  const assigned = stockLongAssignedModeResolve(state);
  if (assigned !== undefined) stockLongSavedAssignmentWrite(state, assigned);
}

function stockLongSavedAssignmentWrite(state: Record<string, any>, assignment: ReturnType<typeof braceStockLongModeConfirmationBuild>) {
  const kind = stockKindResolve(state);
  if (kind) state[CONFIRMATION_FIELDS[kind]] = assignment;
}

export function stockLongConfirmationApply(state: Record<string, any>, selection: Parameters<typeof braceStockLongModeConfirmationBuild>[0]) {
  const kind = stockKindResolve(state);
  const confirmation = braceStockLongModeConfirmationBuild(selection);
  if (!kind || !confirmation) return null;
  state[CONFIRMATION_FIELDS[kind]] = confirmation;
  state.stockMeasurementKind = kind;
  return confirmation;
}

export function stockLongConfirmationClear(state: Record<string, any>) {
  const kind = stockKindResolve(state);
  if (kind) state[CONFIRMATION_FIELDS[kind]] = null;
}
