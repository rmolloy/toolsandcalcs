export function braceStockMaterialBuildFromMeasurements(measurements, longModeFrequencyHz) {
    if (!braceStockFrequencyValid(longModeFrequencyHz))
        return null;
    const specimen = braceStockSpecimenConvertToSi(measurements);
    if (!braceStockSpecimenValid(specimen))
        return null;
    const densityKgM3 = braceStockDensityCalculate(specimen);
    const dynamicYoungsModulusGPa = braceStockModulusCalculate(specimen, longModeFrequencyHz);
    const sectionMomentOfInertiaM4 = braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen);
    const flexuralRigidityNm2 = braceStockFlexuralRigidityCalculateFromValidInputs(dynamicYoungsModulusGPa, sectionMomentOfInertiaM4);
    const longitudinalSoundSpeedMps = braceStockSoundSpeedCalculateFromValidInputs(dynamicYoungsModulusGPa, densityKgM3);
    return {
        densityKgM3,
        dynamicYoungsModulusGPa,
        sectionMomentOfInertiaM4,
        flexuralRigidityNm2,
        longitudinalSoundSpeedMps,
    };
}
export function braceStockSectionMomentOfInertiaCalculate(measurements) {
    const specimen = braceStockSpecimenConvertToSi(measurements);
    if (!braceStockSpecimenValid(specimen))
        return null;
    return braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen);
}
export function braceStockMeasurementsValid(measurements) {
    return braceStockSpecimenValid(braceStockSpecimenConvertToSi(measurements));
}
export function braceStockFlexuralRigidityCalculate(dynamicYoungsModulusGPa, sectionMomentOfInertiaM4) {
    if (!Number.isFinite(dynamicYoungsModulusGPa) || dynamicYoungsModulusGPa <= 0)
        return null;
    if (!Number.isFinite(sectionMomentOfInertiaM4) || sectionMomentOfInertiaM4 <= 0)
        return null;
    return braceStockFlexuralRigidityCalculateFromValidInputs(dynamicYoungsModulusGPa, sectionMomentOfInertiaM4);
}
export function braceStockSoundSpeedCalculate(dynamicYoungsModulusGPa, densityKgM3) {
    if (!Number.isFinite(dynamicYoungsModulusGPa) || dynamicYoungsModulusGPa <= 0)
        return null;
    if (!Number.isFinite(densityKgM3) || densityKgM3 <= 0)
        return null;
    return braceStockSoundSpeedCalculateFromValidInputs(dynamicYoungsModulusGPa, densityKgM3);
}
function braceStockSoundSpeedCalculateFromValidInputs(dynamicYoungsModulusGPa, densityKgM3) {
    return Math.sqrt(dynamicYoungsModulusGPa * 1000000000 / densityKgM3);
}
function braceStockFlexuralRigidityCalculateFromValidInputs(dynamicYoungsModulusGPa, sectionMomentOfInertiaM4) {
    return dynamicYoungsModulusGPa * 1000000000 * sectionMomentOfInertiaM4;
}
function braceStockSpecimenConvertToSi(measurements) {
    return {
        lengthM: measurements.stockLengthMm / 1000,
        widthM: measurements.stockWidthMm / 1000,
        heightM: measurements.stockHeightMm / 1000,
        massKg: measurements.stockMassG / 1000,
    };
}
function braceStockSpecimenValid(specimen) {
    return Object.values(specimen).every((value) => Number.isFinite(value) && value > 0);
}
function braceStockFrequencyValid(frequencyHz) {
    return Number.isFinite(frequencyHz) && frequencyHz > 0;
}
function braceStockDensityCalculate(specimen) {
    return specimen.massKg / (specimen.lengthM * specimen.widthM * specimen.heightM);
}
function braceStockSectionMomentOfInertiaCalculateFromSpecimen(specimen) {
    return specimen.widthM * Math.pow(specimen.heightM, 3) / 12;
}
function braceStockModulusCalculate(specimen, frequencyHz) {
    const correctionFactor = 1 + 6.585 * Math.pow(specimen.heightM / specimen.lengthM, 2);
    const modulusPa = 0.9465
        * ((specimen.massKg * Math.pow(frequencyHz, 2) * Math.pow(specimen.lengthM, 3))
            / (specimen.widthM * Math.pow(specimen.heightM, 3)))
        * correctionFactor;
    return modulusPa / 1000000000;
}
