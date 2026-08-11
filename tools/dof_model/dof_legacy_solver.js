(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.computeDofLegacyResponse = computeDofLegacyResponse;
    exports.adaptDofLegacyParams = adaptDofLegacyParams;
    function computeDofLegacyResponse(runtime, params) {
        var _a;
        try {
            const computeResponse = runtime.computeResponse || ((_a = runtime.ModelCore) === null || _a === void 0 ? void 0 : _a.computeResponse);
            return typeof computeResponse === "function" ? computeResponse(params) : null;
        }
        catch (error) {
            console.warn("computeResponse failed", error);
            return null;
        }
    }
    function adaptDofLegacyParams(runtime, raw) {
        var _a, _b, _c;
        const params = { ...raw };
        const deriveAtmosphere = (_a = runtime.Atmosphere) === null || _a === void 0 ? void 0 : _a.deriveAtmosphere;
        if (typeof deriveAtmosphere !== "function")
            return params;
        const altitude = finiteDofValueOr(params.altitude, 0);
        const temperature = finiteDofValueOr(params.ambient_temp, 20);
        const atmosphere = deriveAtmosphere(altitude, temperature);
        params.air_density = atmosphere.rho;
        params.speed_of_sound = atmosphere.c;
        params.air_pressure = atmosphere.pressure;
        params.air_temp_k = atmosphere.tempK;
        params._atm = atmosphere;
        const movingAirMass = finiteDofValueOrNull(params.mass_air);
        if (movingAirMass !== null) {
            const referenceDensity = (_c = (_b = runtime.Atmosphere) === null || _b === void 0 ? void 0 : _b.REFERENCE_RHO) !== null && _c !== void 0 ? _c : 1.205;
            params.mass_air = movingAirMass * (atmosphere.rho / referenceDensity);
        }
        return params;
    }
    function finiteDofValueOr(value, fallback) {
        return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    }
    function finiteDofValueOrNull(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    }
});
