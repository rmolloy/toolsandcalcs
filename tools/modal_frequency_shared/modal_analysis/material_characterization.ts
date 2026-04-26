(() => {
  const LOG_1000 = Math.log(1000);
  const DB_PER_NEPER = 20 / Math.log(10);
  const ASTM_BEAM_FACTOR = 0.9465;
  const ASTM_BEAM_CORRECTION = 6.585;

  interface RingdownLike {
    f0?: number | null;
    tau?: number | null;
    Q?: number | null;
    slope?: number | null;
    envelopeR2?: number | null;
  }

  interface BraceBeamModeInput {
    lengthMm: number;
    widthMm: number;
    thicknessMm: number;
    massG: number;
    spanMm: number;
    frequencyHz: number;
  }

  interface PlateModeInput {
    lengthMm: number;
    widthMm: number;
    thicknessMm: number;
    massG: number;
    longFreqHz: number;
    crossFreqHz: number;
    twistFreqHz: number;
  }

  interface PlateThicknessCalculator {
    computePlateMaterialPropertiesFromMeasurements(args: {
      panelMass: number;
      panelHeight: number;
      panelLength: number;
      panelWidth: number;
      longFreq: number;
      crossFreq: number;
      twistFreq: number;
    }): {
      density: number;
      EL: number;
      EC: number;
      GLC: number;
      ELoverEC: number;
    };
  }

  function positiveNumberAssert(value: unknown, label: string): asserts value is number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a finite, positive number.`);
    }
  }

  function metersFromMillimeters(mm: number): number {
    positiveNumberAssert(mm, "millimeters");
    return mm / 1000;
  }

  function kilogramsFromGrams(g: number): number {
    positiveNumberAssert(g, "grams");
    return g / 1000;
  }

  function cubicMetersResolve(lengthM: number, widthM: number, thicknessM: number): number {
    return lengthM * widthM * thicknessM;
  }

  function densityResolve(massKg: number, volumeM3: number): number {
    positiveNumberAssert(massKg, "mass");
    positiveNumberAssert(volumeM3, "volume");
    return massKg / volumeM3;
  }

  function arealDensityResolve(massKg: number, lengthM: number, widthM: number): number {
    positiveNumberAssert(massKg, "mass");
    return massKg / (lengthM * widthM);
  }

  function linearDensityResolve(massKg: number, spanM: number): number {
    positiveNumberAssert(massKg, "mass");
    positiveNumberAssert(spanM, "span");
    return massKg / spanM;
  }

  function specificModulusResolve(youngsModulusPa: number, densityKgPerM3: number): number {
    positiveNumberAssert(youngsModulusPa, "Young's modulus");
    positiveNumberAssert(densityKgPerM3, "density");
    return youngsModulusPa / densityKgPerM3;
  }

  function soundSpeedResolve(specificModulus: number): number {
    positiveNumberAssert(specificModulus, "specific modulus");
    return Math.sqrt(specificModulus);
  }

  function radiationCoefficientResolve(youngsModulusPa: number, densityKgPerM3: number): number {
    positiveNumberAssert(youngsModulusPa, "Young's modulus");
    positiveNumberAssert(densityKgPerM3, "density");
    return Math.sqrt(youngsModulusPa / Math.pow(densityKgPerM3, 3));
  }

  function characteristicImpedanceResolve(densityKgPerM3: number, soundSpeedMPerS: number): number {
    positiveNumberAssert(densityKgPerM3, "density");
    positiveNumberAssert(soundSpeedMPerS, "sound speed");
    return densityKgPerM3 * soundSpeedMPerS;
  }

  function qualityFactorResolve(ringdown: RingdownLike): number | null {
    if (Number.isFinite(ringdown.Q) && (ringdown.Q as number) > 0) {
      return ringdown.Q as number;
    }
    if (Number.isFinite(ringdown.f0) && Number.isFinite(ringdown.tau)) {
      return Math.PI * (ringdown.f0 as number) * (ringdown.tau as number);
    }
    return null;
  }

  function t60SecondsResolve(tauSeconds: number | null | undefined): number | null {
    if (!Number.isFinite(tauSeconds) || (tauSeconds as number) <= 0) return null;
    return (tauSeconds as number) * LOG_1000;
  }

  function lossFactorResolve(qualityFactor: number | null): number | null {
    if (!Number.isFinite(qualityFactor) || (qualityFactor as number) <= 0) return null;
    return 1 / (qualityFactor as number);
  }

  function dampingRatioResolve(qualityFactor: number | null): number | null {
    if (!Number.isFinite(qualityFactor) || (qualityFactor as number) <= 0) return null;
    return 1 / (2 * (qualityFactor as number));
  }

  function logDecrementResolve(qualityFactor: number | null): number | null {
    if (!Number.isFinite(qualityFactor) || (qualityFactor as number) <= 0) return null;
    return Math.PI / (qualityFactor as number);
  }

  function decaySlopeDbPerSecondResolve(slope: number | null | undefined): number | null {
    if (!Number.isFinite(slope)) return null;
    return (slope as number) * DB_PER_NEPER;
  }

  function fitQualityPercentResolve(envelopeR2: number | null | undefined): number | null {
    if (!Number.isFinite(envelopeR2)) return null;
    return (envelopeR2 as number) * 100;
  }

  function beamCorrectionFactorResolve(spanM: number, thicknessM: number): number {
    positiveNumberAssert(spanM, "span");
    positiveNumberAssert(thicknessM, "thickness");
    return 1 + ASTM_BEAM_CORRECTION * Math.pow(thicknessM / spanM, 2);
  }

  function beamYoungsModulusResolve(
    massKg: number,
    widthM: number,
    thicknessM: number,
    spanM: number,
    frequencyHz: number,
  ): number {
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

  function plateCalculatorResolve(): PlateThicknessCalculator {
    const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
      PlateThickness?: PlateThicknessCalculator;
    };
    if (!scope.PlateThickness?.computePlateMaterialPropertiesFromMeasurements) {
      throw new Error("PlateThickness calculator is required for plate characterization.");
    }
    return scope.PlateThickness;
  }

  function dampingMetricsBuildFromRingdown(ringdown: RingdownLike) {
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

  function braceMaterialBuildFromBeamMode(args: BraceBeamModeInput) {
    const lengthM = metersFromMillimeters(args.lengthMm);
    const widthM = metersFromMillimeters(args.widthMm);
    const thicknessM = metersFromMillimeters(args.thicknessMm);
    const spanM = metersFromMillimeters(args.spanMm);
    const massKg = kilogramsFromGrams(args.massG);
    const volumeM3 = cubicMetersResolve(lengthM, widthM, thicknessM);
    const densityKgPerM3 = densityResolve(massKg, volumeM3);
    const youngsModulusPa = beamYoungsModulusResolve(
      massKg,
      widthM,
      thicknessM,
      spanM,
      args.frequencyHz,
    );
    const specificModulus = specificModulusResolve(youngsModulusPa, densityKgPerM3);
    const soundSpeedMPerS = soundSpeedResolve(specificModulus);
    return {
      densityKgPerM3,
      volumeCm3: volumeM3 * 1_000_000,
      linearDensityKgPerM: linearDensityResolve(massKg, lengthM),
      dynamicYoungsModulusPa: youngsModulusPa,
      dynamicYoungsModulusGPa: youngsModulusPa / 1_000_000_000,
      specificModulus,
      soundSpeedMPerS,
      radiationCoefficient: radiationCoefficientResolve(youngsModulusPa, densityKgPerM3),
      characteristicImpedance: characteristicImpedanceResolve(densityKgPerM3, soundSpeedMPerS),
    };
  }

  function plateMaterialBuildFromPlateModes(args: PlateModeInput) {
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
      volumeCm3: cubicMetersResolve(lengthM, widthM, thicknessM) * 1_000_000,
      arealDensityKgPerM2: arealDensityResolve(massKg, lengthM, widthM),
      ELPa: material.EL,
      ECPa: material.EC,
      GLCPa: material.GLC,
      ELGPa: material.EL / 1_000_000_000,
      ECGPa: material.EC / 1_000_000_000,
      GLCGPa: material.GLC / 1_000_000_000,
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

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    ModalMaterialCharacterization?: typeof api;
  };

  scope.ModalMaterialCharacterization = api;
  if (typeof module !== "undefined" && (module as any).exports) {
    (module as any).exports = api;
  }
})();
