"use strict";
(() => {
    const LOG_1000 = Math.log(1000);
    const DB_PER_NEPER = 20 / Math.log(10);
    const ASTM_BEAM_FACTOR = 0.9465;
    const ASTM_BEAM_CORRECTION = 6.585;
    function positiveNumberAssert(value, label) {
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
            throw new Error(`${label} must be a finite, positive number.`);
        }
    }
    function metersFromMillimeters(mm) {
        positiveNumberAssert(mm, "millimeters");
        return mm / 1000;
    }
    function kilogramsFromGrams(g) {
        positiveNumberAssert(g, "grams");
        return g / 1000;
    }
    function cubicMetersResolve(lengthM, widthM, thicknessM) {
        return lengthM * widthM * thicknessM;
    }
    function densityResolve(massKg, volumeM3) {
        positiveNumberAssert(massKg, "mass");
        positiveNumberAssert(volumeM3, "volume");
        return massKg / volumeM3;
    }
    function arealDensityResolve(massKg, lengthM, widthM) {
        positiveNumberAssert(massKg, "mass");
        return massKg / (lengthM * widthM);
    }
    function linearDensityResolve(massKg, spanM) {
        positiveNumberAssert(massKg, "mass");
        positiveNumberAssert(spanM, "span");
        return massKg / spanM;
    }
    function specificModulusResolve(youngsModulusPa, densityKgPerM3) {
        positiveNumberAssert(youngsModulusPa, "Young's modulus");
        positiveNumberAssert(densityKgPerM3, "density");
        return youngsModulusPa / densityKgPerM3;
    }
    function soundSpeedResolve(specificModulus) {
        positiveNumberAssert(specificModulus, "specific modulus");
        return Math.sqrt(specificModulus);
    }
    function radiationCoefficientResolve(youngsModulusPa, densityKgPerM3) {
        positiveNumberAssert(youngsModulusPa, "Young's modulus");
        positiveNumberAssert(densityKgPerM3, "density");
        return Math.sqrt(youngsModulusPa / Math.pow(densityKgPerM3, 3));
    }
    function characteristicImpedanceResolve(densityKgPerM3, soundSpeedMPerS) {
        positiveNumberAssert(densityKgPerM3, "density");
        positiveNumberAssert(soundSpeedMPerS, "sound speed");
        return densityKgPerM3 * soundSpeedMPerS;
    }
    function qualityFactorResolve(ringdown) {
        if (Number.isFinite(ringdown.Q) && ringdown.Q > 0) {
            return ringdown.Q;
        }
        if (Number.isFinite(ringdown.f0) && Number.isFinite(ringdown.tau)) {
            return Math.PI * ringdown.f0 * ringdown.tau;
        }
        return null;
    }
    function t60SecondsResolve(tauSeconds) {
        if (!Number.isFinite(tauSeconds) || tauSeconds <= 0)
            return null;
        return tauSeconds * LOG_1000;
    }
    function lossFactorResolve(qualityFactor) {
        if (!Number.isFinite(qualityFactor) || qualityFactor <= 0)
            return null;
        return 1 / qualityFactor;
    }
    function dampingRatioResolve(qualityFactor) {
        if (!Number.isFinite(qualityFactor) || qualityFactor <= 0)
            return null;
        return 1 / (2 * qualityFactor);
    }
    function logDecrementResolve(qualityFactor) {
        if (!Number.isFinite(qualityFactor) || qualityFactor <= 0)
            return null;
        return Math.PI / qualityFactor;
    }
    function decaySlopeDbPerSecondResolve(slope) {
        if (!Number.isFinite(slope))
            return null;
        return slope * DB_PER_NEPER;
    }
    function fitQualityPercentResolve(envelopeR2) {
        if (!Number.isFinite(envelopeR2))
            return null;
        return envelopeR2 * 100;
    }
    function beamCorrectionFactorResolve(spanM, thicknessM) {
        positiveNumberAssert(spanM, "span");
        positiveNumberAssert(thicknessM, "thickness");
        return 1 + ASTM_BEAM_CORRECTION * Math.pow(thicknessM / spanM, 2);
    }
    function beamYoungsModulusResolve(massKg, widthM, thicknessM, spanM, frequencyHz) {
        positiveNumberAssert(massKg, "mass");
        positiveNumberAssert(widthM, "width");
        positiveNumberAssert(thicknessM, "thickness");
        positiveNumberAssert(spanM, "span");
        positiveNumberAssert(frequencyHz, "frequency");
        const correctionFactor = beamCorrectionFactorResolve(spanM, thicknessM);
        return ASTM_BEAM_FACTOR
            * ((massKg * Math.pow(frequencyHz, 2) * Math.pow(spanM, 3)) / (widthM * Math.pow(thicknessM, 3)))
            * correctionFactor;
    }
    function plateCalculatorResolve() {
        var _a;
        const scope = (typeof window !== "undefined" ? window : globalThis);
        if (!((_a = scope.PlateThickness) === null || _a === void 0 ? void 0 : _a.computePlateMaterialPropertiesFromMeasurements)) {
            throw new Error("PlateThickness calculator is required for plate characterization.");
        }
        return scope.PlateThickness;
    }
    function dampingMetricsBuildFromRingdown(ringdown) {
        const qualityFactor = qualityFactorResolve(ringdown);
        return {
            qualityFactor,
            tauSeconds: Number.isFinite(ringdown.tau) ? ringdown.tau : null,
            t60Seconds: t60SecondsResolve(ringdown.tau),
            logDecrement: logDecrementResolve(qualityFactor),
            lossFactor: lossFactorResolve(qualityFactor),
            dampingRatio: dampingRatioResolve(qualityFactor),
            decaySlopeDbPerSecond: decaySlopeDbPerSecondResolve(ringdown.slope),
            fitQualityPercent: fitQualityPercentResolve(ringdown.envelopeR2),
        };
    }
    function braceMaterialBuildFromBeamMode(args) {
        const lengthM = metersFromMillimeters(args.lengthMm);
        const widthM = metersFromMillimeters(args.widthMm);
        const thicknessM = metersFromMillimeters(args.thicknessMm);
        const spanM = metersFromMillimeters(args.spanMm);
        const massKg = kilogramsFromGrams(args.massG);
        const volumeM3 = cubicMetersResolve(lengthM, widthM, thicknessM);
        const densityKgPerM3 = densityResolve(massKg, volumeM3);
        const youngsModulusPa = beamYoungsModulusResolve(massKg, widthM, thicknessM, spanM, args.frequencyHz);
        const specificModulus = specificModulusResolve(youngsModulusPa, densityKgPerM3);
        const soundSpeedMPerS = soundSpeedResolve(specificModulus);
        return {
            densityKgPerM3,
            volumeCm3: volumeM3 * 1000000,
            linearDensityKgPerM: linearDensityResolve(massKg, lengthM),
            dynamicYoungsModulusPa: youngsModulusPa,
            dynamicYoungsModulusGPa: youngsModulusPa / 1000000000,
            specificModulus,
            soundSpeedMPerS,
            radiationCoefficient: radiationCoefficientResolve(youngsModulusPa, densityKgPerM3),
            characteristicImpedance: characteristicImpedanceResolve(densityKgPerM3, soundSpeedMPerS),
        };
    }
    function plateMaterialBuildFromPlateModes(args) {
        const lengthM = metersFromMillimeters(args.lengthMm);
        const widthM = metersFromMillimeters(args.widthMm);
        const thicknessM = metersFromMillimeters(args.thicknessMm);
        const massKg = kilogramsFromGrams(args.massG);
        const material = plateCalculatorResolve().computePlateMaterialPropertiesFromMeasurements({
            panelMass: massKg,
            panelHeight: thicknessM,
            panelLength: lengthM,
            panelWidth: widthM,
            longFreq: args.longFreqHz,
            crossFreq: args.crossFreqHz,
            twistFreq: args.twistFreqHz,
        });
        const soundSpeedLongMPerS = soundSpeedResolve(specificModulusResolve(material.EL, material.density));
        const soundSpeedCrossMPerS = soundSpeedResolve(specificModulusResolve(material.EC, material.density));
        return {
            densityKgPerM3: material.density,
            volumeCm3: cubicMetersResolve(lengthM, widthM, thicknessM) * 1000000,
            arealDensityKgPerM2: arealDensityResolve(massKg, lengthM, widthM),
            ELPa: material.EL,
            ECPa: material.EC,
            GLCPa: material.GLC,
            ELGPa: material.EL / 1000000000,
            ECGPa: material.EC / 1000000000,
            GLCGPa: material.GLC / 1000000000,
            ELoverEC: material.ELoverEC,
            specificModulusLong: specificModulusResolve(material.EL, material.density),
            specificModulusCross: specificModulusResolve(material.EC, material.density),
            soundSpeedLongMPerS,
            soundSpeedCrossMPerS,
            radiationCoefficientLong: radiationCoefficientResolve(material.EL, material.density),
            radiationCoefficientCross: radiationCoefficientResolve(material.EC, material.density),
            characteristicImpedanceLong: characteristicImpedanceResolve(material.density, soundSpeedLongMPerS),
            characteristicImpedanceCross: characteristicImpedanceResolve(material.density, soundSpeedCrossMPerS),
        };
    }
    const api = {
        dampingMetricsBuildFromRingdown,
        braceMaterialBuildFromBeamMode,
        plateMaterialBuildFromPlateModes,
    };
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.ModalMaterialCharacterization = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})();
