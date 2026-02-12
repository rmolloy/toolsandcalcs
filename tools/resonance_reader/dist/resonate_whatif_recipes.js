function recipeSoundholeDeltaMm(area0, area1) {
    if (!Number.isFinite(area0) || !Number.isFinite(area1) || area0 <= 0 || area1 <= 0)
        return null;
    const d0 = 2 * Math.sqrt(area0 / Math.PI);
    const d1 = 2 * Math.sqrt(area1 / Math.PI);
    return (d1 - d0) * 1000;
}
function recipePercentDelta(v0, v1) {
    if (!Number.isFinite(v0) || !Number.isFinite(v1) || v0 === 0)
        return null;
    return ((v1 - v0) / v0) * 100;
}
function massDeltaGrams(g0, g1) {
    if (!Number.isFinite(g0) || !Number.isFinite(g1))
        return null;
    return g1 - g0;
}
export function buildWhatIfRecipes(baseline, whatIf) {
    if (!baseline || !whatIf)
        return [];
    const out = [];
    const area0 = baseline.area_hole;
    const area1 = whatIf.area_hole;
    const dMm = recipeSoundholeDeltaMm(area0, area1);
    if (Number.isFinite(dMm) && Math.abs(dMm) >= 0.2) {
        const abs = Math.abs(dMm).toFixed(1);
        out.push(`${dMm < 0 ? "Reduce" : "Increase"} soundhole diameter by ${abs} mm`);
    }
    const vol0 = baseline.volume_air;
    const vol1 = whatIf.volume_air;
    const volPct = recipePercentDelta(vol0, vol1);
    if (Number.isFinite(volPct) && Math.abs(volPct) >= 2) {
        out.push(`${volPct < 0 ? "Reduce" : "Increase"} effective air volume by ${Math.abs(volPct).toFixed(0)}%`);
    }
    const kTop0 = baseline.stiffness_top;
    const kTop1 = whatIf.stiffness_top;
    const kTopPct = recipePercentDelta(kTop0, kTop1);
    if (Number.isFinite(kTopPct) && Math.abs(kTopPct) >= 5) {
        out.push(`${kTopPct < 0 ? "Soften" : "Stiffen"} top by ${Math.abs(kTopPct).toFixed(0)}% (brace height/scope)`);
    }
    const kBack0 = baseline.stiffness_back;
    const kBack1 = whatIf.stiffness_back;
    const kBackPct = recipePercentDelta(kBack0, kBack1);
    if (Number.isFinite(kBackPct) && Math.abs(kBackPct) >= 5) {
        out.push(`${kBackPct < 0 ? "Soften" : "Stiffen"} back by ${Math.abs(kBackPct).toFixed(0)}% (brace height/scope)`);
    }
    return out;
}
export function buildMassOnlyRecipes(baseline, massOnly) {
    if (!baseline || !massOnly)
        return [];
    const out = [];
    const area0 = baseline.area_hole;
    const area1 = massOnly.area_hole;
    const dMm = recipeSoundholeDeltaMm(area0, area1);
    if (Number.isFinite(dMm) && dMm < -0.2) {
        out.push(`Reduce soundhole diameter by ${Math.abs(dMm).toFixed(1)} mm`);
    }
    const dt = massDeltaGrams(baseline.mass_top, massOnly.mass_top);
    if (Number.isFinite(dt) && dt > 0.2)
        out.push(`Add ${dt.toFixed(1)} g mass near bridge (top)`);
    const db = massDeltaGrams(baseline.mass_back, massOnly.mass_back);
    if (Number.isFinite(db) && db > 0.2)
        out.push(`Add ${db.toFixed(1)} g mass to back plate`);
    return out;
}
