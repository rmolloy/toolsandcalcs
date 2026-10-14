import type { ModeDetection } from "./resonate_mode_detection.js";

export function hasAnyTargets(targets: Record<string, any> | null | undefined): boolean {
  if (!targets) return false;
  return Object.values(targets).some((v) => typeof v === "number" && Number.isFinite(v));
}

export function normalizedWhatIfTargets(targets: Record<string, any> | null | undefined): { air: number | null; top: number | null; back: number | null } {
  const get = (k: string) => (typeof targets?.[k] === "number" && Number.isFinite(targets[k]) ? (targets[k] as number) : null);
  return { air: get("air"), top: get("top"), back: get("back") };
}

export function ensureBaselineFitFromDetected(
  state: Record<string, any>,
  modesDetected: ModeDetection[],
  fit4DofFromTargets: (targets: Record<string, number | null | undefined>, opts?: { maxIter?: number }) => any,
) {
  const targets = Object.fromEntries(modesDetected.map((m) => [m.mode, m.peakFreq]));
  const targetKey = JSON.stringify({
    air: Number.isFinite(targets.air) ? Number((targets.air as number).toFixed(1)) : null,
    top: Number.isFinite(targets.top) ? Number((targets.top as number).toFixed(1)) : null,
    back: Number.isFinite(targets.back) ? Number((targets.back as number).toFixed(1)) : null,
  });
  if (state.lastFitTargetKey !== targetKey) {
    const fit = fit4DofFromTargets(targets, { maxIter: 12 });
    state.lastFitTargetKey = targetKey;
    state.lastFittedParams = fit?.raw || null;
  }
}
