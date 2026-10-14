export type BraceStockMeasurements = {
  stockLengthMm: number;
  stockWidthMm: number;
  stockHeightMm: number;
  stockMassG: number;
};

export type BraceStockMaterial = {
  densityKgM3: number;
  dynamicYoungsModulusGPa: number;
  sectionMomentOfInertiaM4: number;
  flexuralRigidityNm2: number;
  longitudinalSoundSpeedMps: number;
};

export function braceStockMaterialBuildFromMeasurements(
  measurements: BraceStockMeasurements,
  longModeFrequencyHz: number | null,
): BraceStockMaterial | null {
  if (!braceStockFrequencyValid(longModeFrequencyHz)) return null;
  const specimen = braceStockSpecimenConvertToSi(measurements);
  if (!braceStockSpecimenValid(specimen)) return null;
  const densityKgM3 = braceStockDensityCalculate(specimen);
  const dynamicYoungsModulusGPa = braceStockModulusCalculate(specimen, longModeFrequencyHz);
  const sectionMomentOfInertiaM4 = braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen);
  const flexuralRigidityNm2 = braceStockFlexuralRigidityCalculateFromValidInputs(
    dynamicYoungsModulusGPa,
    sectionMomentOfInertiaM4,
  );
  const longitudinalSoundSpeedMps = braceStockSoundSpeedCalculateFromValidInputs(
    dynamicYoungsModulusGPa,
    densityKgM3,
  );
  return {
    densityKgM3,
    dynamicYoungsModulusGPa,
    sectionMomentOfInertiaM4,
    flexuralRigidityNm2,
    longitudinalSoundSpeedMps,
  };
}

export function braceStockSectionMomentOfInertiaCalculate(
  measurements: BraceStockMeasurements,
): number | null {
  const specimen = braceStockSpecimenConvertToSi(measurements);
  if (!braceStockSpecimenValid(specimen)) return null;
  return braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen);
}

export function braceStockMeasurementsValid(measurements: BraceStockMeasurements) {
  return braceStockSpecimenValid(braceStockSpecimenConvertToSi(measurements));
}

export function braceStockFlexuralRigidityCalculate(
  dynamicYoungsModulusGPa: number,
  sectionMomentOfInertiaM4: number,
): number | null {
  if (!Number.isFinite(dynamicYoungsModulusGPa) || dynamicYoungsModulusGPa <= 0) return null;
  if (!Number.isFinite(sectionMomentOfInertiaM4) || sectionMomentOfInertiaM4 <= 0) return null;
  return braceStockFlexuralRigidityCalculateFromValidInputs(
    dynamicYoungsModulusGPa,
    sectionMomentOfInertiaM4,
  );
}

export function braceStockSoundSpeedCalculate(
  dynamicYoungsModulusGPa: number,
  densityKgM3: number,
): number | null {
  if (!Number.isFinite(dynamicYoungsModulusGPa) || dynamicYoungsModulusGPa <= 0) return null;
  if (!Number.isFinite(densityKgM3) || densityKgM3 <= 0) return null;
  return braceStockSoundSpeedCalculateFromValidInputs(dynamicYoungsModulusGPa, densityKgM3);
}

function braceStockSoundSpeedCalculateFromValidInputs(
  dynamicYoungsModulusGPa: number,
  densityKgM3: number,
) {
  return Math.sqrt(dynamicYoungsModulusGPa * 1_000_000_000 / densityKgM3);
}

function braceStockFlexuralRigidityCalculateFromValidInputs(
  dynamicYoungsModulusGPa: number,
  sectionMomentOfInertiaM4: number,
) {
  return dynamicYoungsModulusGPa * 1_000_000_000 * sectionMomentOfInertiaM4;
}

type BraceStockSpecimenSi = {
  lengthM: number;
  widthM: number;
  heightM: number;
  massKg: number;
};

function braceStockSpecimenConvertToSi(measurements: BraceStockMeasurements): BraceStockSpecimenSi {
  return {
    lengthM: measurements.stockLengthMm / 1000,
    widthM: measurements.stockWidthMm / 1000,
    heightM: measurements.stockHeightMm / 1000,
    massKg: measurements.stockMassG / 1000,
  };
}

function braceStockSpecimenValid(specimen: BraceStockSpecimenSi) {
  return Object.values(specimen).every((value) => Number.isFinite(value) && value > 0);
}

function braceStockFrequencyValid(frequencyHz: number | null): frequencyHz is number {
  return Number.isFinite(frequencyHz) && (frequencyHz as number) > 0;
}

function braceStockDensityCalculate(specimen: BraceStockSpecimenSi) {
  return specimen.massKg / (specimen.lengthM * specimen.widthM * specimen.heightM);
}

function braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen: BraceStockSpecimenSi) {
  return specimen.widthM * Math.pow(specimen.heightM, 3) / 12;
}

function braceStockModulusCalculate(specimen: BraceStockSpecimenSi, frequencyHz: number) {
  const correctionFactor = 1 + 6.585 * Math.pow(specimen.heightM / specimen.lengthM, 2);
  const modulusPa = 0.9465
    * ((specimen.massKg * Math.pow(frequencyHz, 2) * Math.pow(specimen.lengthM, 3))
      / (specimen.widthM * Math.pow(specimen.heightM, 3)))
    * correctionFactor;
  return modulusPa / 1_000_000_000;
}
