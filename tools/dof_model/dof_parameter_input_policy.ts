export function readDofParamsFromSearch(
  search: string,
  allowedKeys: readonly string[],
): Record<string, number> | null {
  const raw = new URLSearchParams(search).get("params");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const values = parsed as Record<string, unknown>;
    const params: Record<string, number> = {};
    allowedKeys.forEach((key) => {
      const value = values[key];
      if (Number.isFinite(value)) params[key] = value as number;
    });
    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

export function dofDisplayValueToInternal(param: string, value: number) {
  if (!Number.isFinite(value)) return value;
  return param.startsWith("mass_") ? value / 1000 : value;
}

export function dofInternalValueToDisplay(param: string, value: number) {
  if (!Number.isFinite(value)) return value;
  return param.startsWith("mass_") ? value * 1000 : value;
}

export function isDofUncommittedDecimalInput(value: string) {
  return /^-?\d+\.$/.test(value.trim());
}
