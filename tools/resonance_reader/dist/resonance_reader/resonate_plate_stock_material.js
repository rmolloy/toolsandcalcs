import { braceStockMeasurementsValid, braceStockSoundSpeedCalculate } from "./resonate_brace_stock_material.js";
export function plateStockMaterialBuildFromMeasurements(measurements, frequencyHz, calculator = globalThis.PlateThickness) {
    if (!calculator || !braceStockMeasurementsValid(measurements))
        return null;
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0)
        return null;
    const lengthM = measurements.stockLengthMm / 1000;
    const thicknessM = measurements.stockHeightMm / 1000;
    const densityKgM3 = calculator.calculateDensity(measurements.stockMassG / 1000, thicknessM, lengthM, measurements.stockWidthMm / 1000);
    const dynamicYoungsModulusGPa = calculator.calculateYoungsModulus(densityKgM3, lengthM, frequencyHz, thicknessM) / 1e9;
    const longitudinalSoundSpeedMps = braceStockSoundSpeedCalculate(dynamicYoungsModulusGPa, densityKgM3);
    if (longitudinalSoundSpeedMps === null)
        return null;
    return { densityKgM3, dynamicYoungsModulusGPa, longitudinalSoundSpeedMps, flexuralRigidityNm2: null };
}
