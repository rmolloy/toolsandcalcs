export function braceStockLongModeConfirmationBuild(selection: {
  peakKey: unknown;
  frequencyHz: unknown;
  tapIndex?: unknown;
  sourceLabel?: unknown;
}) {
  const peakKey = String(selection.peakKey || "").trim();
  const frequencyHz = Number(selection.frequencyHz);
  if (!peakKey || !Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
  const tapIndex = Number(selection.tapIndex);
  return {
    mode: "long" as const,
    peakKey,
    frequencyHz,
    tapIndex: Number.isInteger(tapIndex) && tapIndex >= 0 ? tapIndex : null,
    sourceLabel: String(selection.sourceLabel || "").trim(),
  };
}

export function braceStockLongModeConfirmationApply(
  state: Record<string, any>,
  selection: Parameters<typeof braceStockLongModeConfirmationBuild>[0],
) {
  const confirmation = braceStockLongModeConfirmationBuild(selection);
  if (!confirmation) return null;
  state.braceStockConfirmedLongMode = confirmation;
  return confirmation;
}

export function braceStockLongModeConfirmationClear(state: Record<string, any>) {
  state.braceStockConfirmedLongMode = null;
}
