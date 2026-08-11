import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js";
export function flexuralRigidityBaseHrefResolve(runtimeHref = typeof window !== "undefined" ? window.location.href : "http://localhost/") {
    return new URL(runtimeHref).protocol === "file:"
        ? "../flexural_rigidity/index.html"
        : "../flexural_rigidity/";
}
export function flexuralRigidityHrefBuildFromBraceStock(baseHref, state) {
    const estimate = braceStockEstimateResolveFromState(state);
    if (estimate.status !== "ready")
        return null;
    const runtimeBase = typeof window !== "undefined" ? window.location.href : "http://localhost/";
    const url = new URL(baseHref, runtimeBase);
    url.searchParams.set("stock_contract", "1");
    url.searchParams.set("stock_method", "free-free");
    url.searchParams.set("stock_source", estimate.confirmation.sourceLabel || "Brace stock measurement");
    url.searchParams.set("stock_long_hz", estimate.confirmation.frequencyHz.toFixed(3));
    url.searchParams.set("stock_specimen_length_mm", estimate.measurements.stockLengthMm.toFixed(3));
    url.searchParams.set("stock_specimen_width_mm", estimate.measurements.stockWidthMm.toFixed(3));
    url.searchParams.set("stock_specimen_height_mm", estimate.measurements.stockHeightMm.toFixed(3));
    url.searchParams.set("stock_specimen_mass_g", estimate.measurements.stockMassG.toFixed(3));
    url.searchParams.set("stock_density", estimate.material.densityKgM3.toFixed(3));
    url.searchParams.set("stock_modulus", estimate.material.dynamicYoungsModulusGPa.toFixed(6));
    url.searchParams.set("stock_sound_speed", estimate.material.longitudinalSoundSpeedMps.toFixed(3));
    return url.toString();
}
export function flexuralRigidityOpenFromBraceStock(baseHref, state, navigate = (href) => window.location.assign(href)) {
    const href = flexuralRigidityHrefBuildFromBraceStock(baseHref, state);
    if (!href)
        return false;
    navigate(href);
    return true;
}
