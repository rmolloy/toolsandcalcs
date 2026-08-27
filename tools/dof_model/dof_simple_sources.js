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
    exports.CHRISTENSEN_FIGURE_THREE_SIGN_PRESETS = exports.CHRISTENSEN_FIGURE_THREE_SOURCES = void 0;
    exports.simpleSourcePressureAtFrequency = simpleSourcePressureAtFrequency;
    exports.simpleSourcesPressureAtFrequency = simpleSourcesPressureAtFrequency;
    exports.simpleSourceLevelDb = simpleSourceLevelDb;
    exports.simpleSourcesResponseSeries = simpleSourcesResponseSeries;
    exports.simpleSourcesCombinedResponseSeries = simpleSourcesCombinedResponseSeries;
    exports.simpleSourcesWithSigns = simpleSourcesWithSigns;
    const CM2_PER_G_TO_M2_PER_KG = 0.1;
    const DEFAULT_AIR_DENSITY_KG_PER_M3 = 1.205;
    const DEFAULT_DISTANCE_M = 1;
    const DEFAULT_DRIVE_FORCE_N = 1;
    const DEFAULT_FREQUENCY_END_HZ = 800;
    const DEFAULT_FREQUENCY_START_HZ = 100;
    const DEFAULT_PRESSURE_REFERENCE_PA = 0.00002;
    const DEFAULT_STEP_HZ = 1;
    exports.CHRISTENSEN_FIGURE_THREE_SOURCES = [
        { id: "source_1", name: "Peak 1", frequencyHz: 200, q: 30, amplitudeCm2PerG: 6 },
        { id: "source_2", name: "Peak 2", frequencyHz: 400, q: 30, amplitudeCm2PerG: 1 },
        { id: "source_3", name: "Peak 3", frequencyHz: 600, q: 30, amplitudeCm2PerG: 1 },
    ];
    exports.CHRISTENSEN_FIGURE_THREE_SIGN_PRESETS = {
        allPositive: [1, 1, 1],
        secondAndThirdNegative: [1, -1, -1],
        secondNegative: [1, -1, 1],
        thirdNegative: [1, 1, -1],
    };
    function radiansPerSecond(frequencyHz) {
        return 2 * Math.PI * frequencyHz;
    }
    function sourceAmplitudeM2PerKg(source) {
        return source.amplitudeCm2PerG * CM2_PER_G_TO_M2_PER_KG;
    }
    function responseOptionsResolve(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        return {
            airDensityKgPerM3: (_a = options.airDensityKgPerM3) !== null && _a !== void 0 ? _a : DEFAULT_AIR_DENSITY_KG_PER_M3,
            distanceM: (_b = options.distanceM) !== null && _b !== void 0 ? _b : DEFAULT_DISTANCE_M,
            driveForceN: (_c = options.driveForceN) !== null && _c !== void 0 ? _c : DEFAULT_DRIVE_FORCE_N,
            frequencyEndHz: (_d = options.frequencyEndHz) !== null && _d !== void 0 ? _d : DEFAULT_FREQUENCY_END_HZ,
            frequencyStartHz: (_e = options.frequencyStartHz) !== null && _e !== void 0 ? _e : DEFAULT_FREQUENCY_START_HZ,
            pressureReferencePa: (_f = options.pressureReferencePa) !== null && _f !== void 0 ? _f : DEFAULT_PRESSURE_REFERENCE_PA,
            stepHz: (_g = options.stepHz) !== null && _g !== void 0 ? _g : DEFAULT_STEP_HZ,
        };
    }
    function simpleSourcePressureAtFrequency(source, frequencyHz, options = {}) {
        const resolved = responseOptionsResolve(options);
        const omega = radiansPerSecond(frequencyHz);
        const omegaZero = radiansPerSecond(source.frequencyHz);
        const dampingRate = omegaZero / source.q;
        const denominatorRe = omegaZero * omegaZero - omega * omega;
        const denominatorIm = dampingRate * omega;
        const denominatorMagnitudeSquared = denominatorRe * denominatorRe + denominatorIm * denominatorIm;
        const numerator = resolved.driveForceN
            * sourceAmplitudeM2PerKg(source)
            * resolved.airDensityKgPerM3
            * omega
            * omega
            / (4 * Math.PI * resolved.distanceM);
        return {
            re: numerator * denominatorRe / denominatorMagnitudeSquared,
            im: -numerator * denominatorIm / denominatorMagnitudeSquared,
        };
    }
    function simpleSourcesPressureAtFrequency(sources, frequencyHz, options = {}) {
        return sources.reduce((total, source) => {
            const sourcePressure = simpleSourcePressureAtFrequency(source, frequencyHz, options);
            return {
                re: total.re + sourcePressure.re,
                im: total.im + sourcePressure.im,
            };
        }, { re: 0, im: 0 });
    }
    function simpleSourceLevelDb(pressure, pressureReferencePa = DEFAULT_PRESSURE_REFERENCE_PA) {
        const magnitude = Math.hypot(pressure.re, pressure.im);
        return 20 * Math.log10(Math.max(magnitude / pressureReferencePa, 1e-30));
    }
    function simpleSourcesResponseSeries(sources, options = {}) {
        const resolved = responseOptionsResolve(options);
        const points = [];
        for (let frequencyHz = resolved.frequencyStartHz; frequencyHz <= resolved.frequencyEndHz + 1e-9; frequencyHz += resolved.stepHz) {
            const pressure = simpleSourcesPressureAtFrequency(sources, frequencyHz, resolved);
            points.push({
                x: Number(frequencyHz.toFixed(6)),
                y: simpleSourceLevelDb(pressure, resolved.pressureReferencePa),
            });
        }
        return points;
    }
    function simpleSourcesCombinedResponseSeries(sources, basePressureAtFrequency, options = {}) {
        const resolved = responseOptionsResolve(options);
        const points = [];
        for (let frequencyHz = resolved.frequencyStartHz; frequencyHz <= resolved.frequencyEndHz + 1e-9; frequencyHz += resolved.stepHz) {
            const sourcePressure = simpleSourcesPressureAtFrequency(sources, frequencyHz, resolved);
            const basePressure = basePressureAtFrequency(frequencyHz);
            points.push({
                x: Number(frequencyHz.toFixed(6)),
                y: simpleSourceLevelDb({
                    re: basePressure.re + sourcePressure.re,
                    im: basePressure.im + sourcePressure.im,
                }, resolved.pressureReferencePa),
            });
        }
        return points;
    }
    function simpleSourcesWithSigns(signs, sources = exports.CHRISTENSEN_FIGURE_THREE_SOURCES) {
        return sources.map((source, index) => {
            var _a;
            return ({
                ...source,
                amplitudeCm2PerG: source.amplitudeCm2PerG * ((_a = signs[index]) !== null && _a !== void 0 ? _a : 1),
            });
        });
    }
});
