import { braceStockMeasurementsValid, braceStockSoundSpeedCalculate, type BraceStockMeasurements } from "./resonate_brace_stock_material.js";

type PlateCalculator = {
  calculateDensity: (massKg: number, thicknessM: number, lengthM: number, widthM: number) => number;
  calculateYoungsModulus: (density: number, lengthM: number, frequencyHz: number, thicknessM: number) => number;
};

export function plateStockMaterialBuildFromMeasurements(
  measurements: BraceStockMeasurements,
  frequencyHz: number,
  calculator: PlateCalculator | undefined = (globalThis as any).PlateThickness,
) {
  if (!calculator || !braceStockMeasurementsValid(measurements)) return null;
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
  const lengthM = measurements.stockLengthMm / 1000;
  const thicknessM = measurements.stockHeightMm / 1000;
  const densityKgM3 = calculator.calculateDensity(measurements.stockMassG / 1000, thicknessM, lengthM, measurements.stockWidthMm / 1000);
  const dynamicYoungsModulusGPa = calculator.calculateYoungsModulus(densityKgM3, lengthM, frequencyHz, thicknessM) / 1e9;
  const longitudinalSoundSpeedMps = braceStockSoundSpeedCalculate(dynamicYoungsModulusGPa, densityKgM3);
  if (longitudinalSoundSpeedMps === null) return null;
  return { densityKgM3, dynamicYoungsModulusGPa, longitudinalSoundSpeedMps, flexuralRigidityNm2: null };
}
