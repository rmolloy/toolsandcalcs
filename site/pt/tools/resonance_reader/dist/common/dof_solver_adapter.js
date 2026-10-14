const MASS_PARAM_IDS = ["mass_air", "mass_top", "mass_back", "mass_sides"];
function windowObjectRead() {
    return globalThis.window || {};
}
function massParamsConvertToKg(raw) {
    const out = { ...raw };
    MASS_PARAM_IDS.forEach((id) => {
        const value = out[id];
        if (typeof value !== "number" || !Number.isFinite(value))
            return;
        out[id] = value / 1000;
    });
    return out;
}
function atmosphereInputsResolve(out) {
    const altitude = typeof out.altitude === "number" && Number.isFinite(out.altitude) ? out.altitude : 0;
    const ambientTemp = typeof out.ambient_temp === "number" && Number.isFinite(out.ambient_temp) ? out.ambient_temp : 20;
    return { altitude, ambientTemp };
}
function atmosphereToSolverFieldsApply(out, atmosphereApi) {
    if (typeof atmosphereApi.deriveAtmosphere !== "function")
        return;
    const { altitude, ambientTemp } = atmosphereInputsResolve(out);
    const referenceRho = atmosphereApi.REFERENCE_RHO ?? 1.205;
    const atmosphere = atmosphereApi.deriveAtmosphere(altitude, ambientTemp);
    out.air_density = atmosphere.rho;
    out.speed_of_sound = atmosphere.c;
    out.air_pressure = atmosphere.pressure;
    out.air_temp_k = atmosphere.tempK;
    const massAir = out.mass_air;
    if (typeof massAir === "number" && Number.isFinite(massAir)) {
        out.mass_air = massAir * (atmosphere.rho / referenceRho);
    }
    out._atm = atmosphere;
}
export function adaptParamsToSolver(raw) {
    const out = massParamsConvertToKg(raw);
    const windowObject = windowObjectRead();
    atmosphereToSolverFieldsApply(out, (windowObject.Atmosphere || {}));
    return out;
}
function computeResponsePrimaryCall(params) {
    const windowObject = windowObjectRead();
    const computeResponse = windowObject.computeResponse;
    if (typeof computeResponse !== "function")
        return null;
    return computeResponse(params);
}
function computeResponseFallbackCall(params) {
    const windowObject = windowObjectRead();
    const computeResponseJs = windowObject.computeResponseJs;
    if (typeof computeResponseJs !== "function")
        return null;
    return computeResponseJs(params);
}
export function computeResponseSafe(params) {
    try {
        return computeResponsePrimaryCall(params);
    }
    catch (error) {
        console.error("[Solver Adapter] computeResponse failed; attempting JS fallback.", error);
        try {
            return computeResponseFallbackCall(params);
        }
        catch (fallbackError) {
            console.error("[Solver Adapter] JS fallback computeResponse failed.", fallbackError);
            return null;
        }
    }
}
