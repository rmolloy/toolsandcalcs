import { stockKindResolve } from "./resonate_stock_measurements.js";
import { braceStockLongModeConfirmationBuild } from "./resonate_brace_stock_confirmation.js";

const CONFIRMATION_FIELDS = { plate_stock: "plateStockConfirmedLongMode", brace_stock: "braceStockConfirmedLongMode" } as const;

export function stockLongConfirmationResolve(state: Record<string, any>) {
  const kind = stockKindResolve(state);
  return kind ? state[CONFIRMATION_FIELDS[kind]] ?? null : null;
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
