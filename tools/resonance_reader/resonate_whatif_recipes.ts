function recipeSoundholeDeltaMm(area0: number, area1: number): number | null {
  if (!Number.isFinite(area0) || !Number.isFinite(area1) || area0 <= 0 || area1 <= 0) return null;
  const d0 = 2 * Math.sqrt(area0 / Math.PI);
  const d1 = 2 * Math.sqrt(area1 / Math.PI);
  return (d1 - d0) * 1000;
}

function recipePercentDelta(v0: number, v1: number): number | null {
  if (!Number.isFinite(v0) || !Number.isFinite(v1) || v0 === 0) return null;
  return ((v1 - v0) / v0) * 100;
}

function massDeltaGrams(g0: number, g1: number): number | null {
  if (!Number.isFinite(g0) || !Number.isFinite(g1)) return null;
  return g1 - g0;
}

const MASS_ONLY_SOUNDPHOLE_REDUCTION_MAX_MM = 1;

function massOnlySoundholeReductionMmResolve(deltaMm: number) {
  return Math.min(Math.abs(deltaMm), MASS_ONLY_SOUNDPHOLE_REDUCTION_MAX_MM);
}

export function buildWhatIfRecipes(baseline: Record<string, any> | null, whatIf: Record<string, any> | null): string[] {
  if (!baseline || !whatIf) return [];
  const out: string[] = [];

  const area0 = baseline.area_hole;
  const area1 = whatIf.area_hole;
  const dMm = recipeSoundholeDeltaMm(area0, area1);
  if (Number.isFinite(dMm) && Math.abs(dMm as number) >= 0.2) {
    const abs = Math.abs(dMm as number).toFixed(1);
    out.push(`${(dMm as number) < 0 ? "Reduce" : "Increase"} soundhole diameter by ${abs} mm`);
  }

  const vol0 = baseline.volume_air;
  const vol1 = whatIf.volume_air;
  const volPct = recipePercentDelta(vol0, vol1);
  if (Number.isFinite(volPct) && Math.abs(volPct as number) >= 2) {
    out.push(`${(volPct as number) < 0 ? "Reduce" : "Increase"} effective air volume by ${Math.abs(volPct as number).toFixed(0)}%`);
  }

  const kTop0 = baseline.stiffness_top;
  const kTop1 = whatIf.stiffness_top;
  const kTopPct = recipePercentDelta(kTop0, kTop1);
  if (Number.isFinite(kTopPct) && Math.abs(kTopPct as number) >= 5) {
    out.push(`${(kTopPct as number) < 0 ? "Soften" : "Stiffen"} top by ${Math.abs(kTopPct as number).toFixed(0)}% (brace height/scope)`);
  }

  const kBack0 = baseline.stiffness_back;
  const kBack1 = whatIf.stiffness_back;
  const kBackPct = recipePercentDelta(kBack0, kBack1);
  if (Number.isFinite(kBackPct) && Math.abs(kBackPct as number) >= 5) {
    out.push(`${(kBackPct as number) < 0 ? "Soften" : "Stiffen"} back by ${Math.abs(kBackPct as number).toFixed(0)}% (brace height/scope)`);
  }

  return out;
}

export function buildMassOnlyRecipes(baseline: Record<string, any> | null, massOnly: Record<string, any> | null): string[] {
  if (!baseline || !massOnly) return [];
  const out: string[] = [];
  const area0 = baseline.area_hole;
  const area1 = massOnly.area_hole;
  const dMm = recipeSoundholeDeltaMm(area0, area1);
  if (Number.isFinite(dMm) && (dMm as number) < -0.2) {
    const reductionMm = massOnlySoundholeReductionMmResolve(dMm as number);
    out.push(`Reduce soundhole diameter by ${reductionMm.toFixed(1)} mm`);
  }
  const dt = massDeltaGrams(baseline.mass_top, massOnly.mass_top);
  if (Number.isFinite(dt) && (dt as number) > 0.2) out.push(`Add ${(dt as number).toFixed(1)} g mass near bridge (top)`);
  const db = massDeltaGrams(baseline.mass_back, massOnly.mass_back);
  if (Number.isFinite(db) && (db as number) > 0.2) out.push(`Add ${(db as number).toFixed(1)} g mass to back plate`);
  return out;
}
