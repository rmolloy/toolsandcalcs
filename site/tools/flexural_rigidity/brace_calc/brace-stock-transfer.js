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
    exports.BraceStockTransfer = void 0;
    exports.readBraceStockMeasurements = readBraceStockMeasurements;
    exports.readBraceStockCharacterization = readBraceStockCharacterization;
    function readBraceStockMeasurements(params, defaults) {
        const height = positiveQueryNumberRead(params, "brace_height");
        const breadth = positiveQueryNumberRead(params, "brace_width");
        const density = positiveQueryNumberRead(params, "brace_density");
        const modulus = positiveQueryNumberRead(params, "brace_modulus");
        if (height === null && breadth === null && density === null && modulus === null) {
            return null;
        }
        return {
            height: height !== null && height !== void 0 ? height : defaults.height,
            breadth: breadth !== null && breadth !== void 0 ? breadth : defaults.breadth,
            density: density !== null && density !== void 0 ? density : defaults.density,
            modulus: modulus !== null && modulus !== void 0 ? modulus : defaults.modulus,
        };
    }
    function readBraceStockCharacterization(params) {
        var _a;
        if (params.get("stock_contract") !== "1" || params.get("stock_method") !== "free-free") {
            return null;
        }
        const longFrequencyHz = positiveQueryNumberRead(params, "stock_long_hz");
        const specimenLengthMm = positiveQueryNumberRead(params, "stock_specimen_length_mm");
        const specimenWidthMm = positiveQueryNumberRead(params, "stock_specimen_width_mm");
        const specimenHeightMm = positiveQueryNumberRead(params, "stock_specimen_height_mm");
        const specimenMassG = positiveQueryNumberRead(params, "stock_specimen_mass_g");
        const densityKgM3 = positiveQueryNumberRead(params, "stock_density");
        const modulusGPa = positiveQueryNumberRead(params, "stock_modulus");
        const soundSpeedMps = positiveQueryNumberRead(params, "stock_sound_speed");
        if (longFrequencyHz === null
            || specimenLengthMm === null
            || specimenWidthMm === null
            || specimenHeightMm === null
            || specimenMassG === null
            || densityKgM3 === null
            || modulusGPa === null
            || soundSpeedMps === null) {
            return null;
        }
        return {
            version: 1,
            method: "free-free",
            sourceLabel: ((_a = params.get("stock_source")) === null || _a === void 0 ? void 0 : _a.trim()) || "Brace stock measurement",
            longFrequencyHz,
            specimenLengthMm,
            specimenWidthMm,
            specimenHeightMm,
            specimenMassG,
            densityKgM3,
            modulusGPa,
            soundSpeedMps,
        };
    }
    function positiveQueryNumberRead(params, key) {
        const value = Number.parseFloat(params.get(key) || "");
        return Number.isFinite(value) && value > 0 ? value : null;
    }
    exports.BraceStockTransfer = {
        readBraceStockCharacterization,
        readBraceStockMeasurements,
    };
    if (typeof window !== "undefined") {
        window.BraceStockTransfer = exports.BraceStockTransfer;
    }
});
