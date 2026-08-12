// tension_sources.mjs
var POUNDS_PER_INCH_TO_KILOGRAMS_PER_METER = 0.45359237 / 0.0254;
var DADDARIO_DATA_ROOT = "https://embed.cartfulsolutions.com/daddario-string-tension-finder/data";
var TENSION_SOURCE_URLS = Object.freeze({
  dAddarioCalculator: "https://www.daddario.com/pages/string-tension-pro-string-tension-calculator",
  dAddarioStrings: `${DADDARIO_DATA_ROOT}/strings_sample.json`,
  dAddarioSets: `${DADDARIO_DATA_ROOT}/strings_dataset.json`,
  dAddarioTensionChart: `${DADDARIO_DATA_ROOT}/sets_tensionchart.json`,
  dAddarioTunings: `${DADDARIO_DATA_ROOT}/tuning.json`,
  dAddarioFrequencies: `${DADDARIO_DATA_ROOT}/scale_frecuency.json`,
  dAddarioInstruments: `${DADDARIO_DATA_ROOT}/instruments.json`,
  dAddarioSpecifications: "https://daddario.com/upload/tension_chart_13934.pdf",
  stringjoyCalculator: "https://tension.stringjoy.com/"
});
function findTensionSourceRecord(catalog, criteria) {
  const records = Array.isArray(catalog) ? catalog : catalog?.records || catalog?.all || [];
  const gaugeIn = criteria.gaugeMm / 25.4;
  const allowedSetCodes = criteria.setCodes || (criteria.setCode === undefined ? null : [criteria.setCode]);
  return records.find((record) => record.manufacturer === criteria.manufacturer && (!allowedSetCodes || allowedSetCodes.includes(record.setCode)) && record.construction === criteria.construction && (allowedSetCodes && criteria.sequenceNumber !== undefined ? record.sequenceNumber === criteria.sequenceNumber : Number.isFinite(record.gaugeIn) && Math.abs(record.gaugeIn - gaugeIn) < 0.00002)) || null;
}
function applyTensionSourceRecord(string, record) {
  if (!record) {
    const { tensionSource, ...withoutTensionSource } = string;
    return withoutTensionSource;
  }
  return {
    ...string,
    unitMassKgPerMeter: calculateUnitMassKgPerMeterFromPoundsPerInch(record.unitWeightLbPerIn),
    tensionSource: {
      manufacturer: record.manufacturer,
      sourceKind: record.sourceKind,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl
    }
  };
}
function calculateUnitMassKgPerMeterFromPoundsPerInch(unitWeightLbPerIn) {
  if (!Number.isFinite(unitWeightLbPerIn) || unitWeightLbPerIn <= 0) {
    throw new RangeError("unitWeightLbPerIn must be positive");
  }
  return unitWeightLbPerIn * POUNDS_PER_INCH_TO_KILOGRAMS_PER_METER;
}

// gore_compensation.ts
var MILLIMETERS_PER_METER = 1000;
var GORE_REFERENCE_BOUNDS = {
  nutMinMm: -5,
  nutMaxMm: 5,
  saddleMinMm: -5,
  saddleMaxMm: 5
};
function calculateGoreCentsError(input, fretNumber, nutCompensationMm, saddleCompensationMm) {
  validateGoreInput(input);
  requirePositiveInteger(fretNumber, "fretNumber");
  requireFretExists(input.actionByFretMm, fretNumber);
  requireFinite(nutCompensationMm, "nutCompensationMm");
  requireFinite(saddleCompensationMm, "saddleCompensationMm");
  const currentFretPositionMm = calculateGoreFretPositionMm(input.scaleLengthMm, fretNumber);
  const previousFretNumber = fretNumber - 1;
  const previousFretPositionMm = calculateGoreFretPositionMm(input.scaleLengthMm, previousFretNumber);
  const currentActionMm = input.actionByFretMm[fretNumber];
  const previousActionMm = input.actionByFretMm[previousFretNumber];
  const spacingMm = fretNumber === 1 ? currentFretPositionMm - previousFretPositionMm - nutCompensationMm : currentFretPositionMm - previousFretPositionMm;
  const previousStringLengthMm = fretNumber === 1 ? 0 : Math.hypot(previousFretPositionMm, previousActionMm) - nutCompensationMm;
  const firstFretPositionMm = calculateGoreFretPositionMm(input.scaleLengthMm, 1);
  const fingerDeflectionAtFretMm = input.fingerDeflectionMm * input.playingPressure * spacingMm / firstFretPositionMm;
  const fingerContactLengthMm = Math.hypot(spacingMm, currentActionMm - previousActionMm) / 2;
  const frettedSegmentLengthMm = 2 * Math.hypot(fingerDeflectionAtFretMm, fingerContactLengthMm);
  const vibratingSegmentLengthMm = Math.hypot(input.scaleLengthMm - currentFretPositionMm, currentActionMm) + saddleCompensationMm;
  const totalStringPathMm = previousStringLengthMm + frettedSegmentLengthMm + vibratingSegmentLengthMm;
  const stretchBeyondReferenceMm = totalStringPathMm - input.scaleLengthMm + nutCompensationMm - saddleCompensationMm;
  const compensatedSpeakingLengthM = (input.scaleLengthMm - nutCompensationMm + saddleCompensationMm) / MILLIMETERS_PER_METER;
  const openTensionN = 4 * input.unitMassKgPerMeter * compensatedSpeakingLengthM ** 2 * input.openFrequencyHz ** 2;
  const frettedTensionN = openTensionN + input.axialStiffnessN * stretchBeyondReferenceMm / (input.scaleLengthMm + input.extraStringLengthMm);
  if (frettedTensionN <= 0)
    throw new RangeError("fretted string tension must be positive");
  const frettedFrequencyHz = Math.sqrt(frettedTensionN / input.unitMassKgPerMeter) / (2 * vibratingSegmentLengthMm / MILLIMETERS_PER_METER);
  const targetFrequencyHz = input.openFrequencyHz * 2 ** (fretNumber / 12);
  return 1200 * Math.log2(frettedFrequencyHz / targetFrequencyHz);
}
function calculateGoreCentsErrors(input, nutCompensationMm, saddleCompensationMm) {
  validateGoreInput(input);
  return input.actionByFretMm.map((_, fretNumber) => fretNumber === 0 ? 0 : calculateGoreCentsError(input, fretNumber, nutCompensationMm, saddleCompensationMm));
}
function calculateGoreTotalAbsoluteErrorCents(input, nutCompensationMm, saddleCompensationMm) {
  return calculateGoreCentsErrors(input, nutCompensationMm, saddleCompensationMm).reduce((total, error) => total + Math.abs(error), 0);
}
function optimizeGoreCompensation({
  input,
  initialNutCompensationMm = 0.56,
  initialSaddleCompensationMm = 0.75,
  bounds = GORE_REFERENCE_BOUNDS
}) {
  validateBounds(bounds);
  validateGoreInput(input);
  let best = {
    nutCompensationMm: clamp(initialNutCompensationMm, bounds.nutMinMm, bounds.nutMaxMm),
    saddleCompensationMm: clamp(initialSaddleCompensationMm, bounds.saddleMinMm, bounds.saddleMaxMm)
  };
  let bestError = calculateGoreTotalAbsoluteErrorCents(input, best.nutCompensationMm, best.saddleCompensationMm);
  for (let iteration = 0;iteration < 12; iteration += 1) {
    best.nutCompensationMm = minimizeOneCompensationAxis({
      minimumMm: bounds.nutMinMm,
      maximumMm: bounds.nutMaxMm,
      fixedCompensationMm: best.saddleCompensationMm,
      varyNut: true,
      input
    });
    best.saddleCompensationMm = minimizeOneCompensationAxis({
      minimumMm: bounds.saddleMinMm,
      maximumMm: bounds.saddleMaxMm,
      fixedCompensationMm: best.nutCompensationMm,
      varyNut: false,
      input
    });
    bestError = calculateGoreTotalAbsoluteErrorCents(input, best.nutCompensationMm, best.saddleCompensationMm);
  }
  return {
    ...best,
    centsErrorByFret: calculateGoreCentsErrors(input, best.nutCompensationMm, best.saddleCompensationMm),
    totalAbsoluteErrorCents: bestError
  };
}
function minimizeOneCompensationAxis({
  minimumMm,
  maximumMm,
  fixedCompensationMm,
  varyNut,
  input
}) {
  const goldenRatio = (Math.sqrt(5) - 1) / 2;
  let leftMm = minimumMm;
  let rightMm = maximumMm;
  let firstMm = rightMm - goldenRatio * (rightMm - leftMm);
  let secondMm = leftMm + goldenRatio * (rightMm - leftMm);
  const evaluate = (variableMm) => varyNut ? calculateGoreTotalAbsoluteErrorCents(input, variableMm, fixedCompensationMm) : calculateGoreTotalAbsoluteErrorCents(input, fixedCompensationMm, variableMm);
  let firstError = evaluate(firstMm);
  let secondError = evaluate(secondMm);
  while (rightMm - leftMm > 0.000000001) {
    if (firstError <= secondError) {
      rightMm = secondMm;
      secondMm = firstMm;
      secondError = firstError;
      firstMm = rightMm - goldenRatio * (rightMm - leftMm);
      firstError = evaluate(firstMm);
    } else {
      leftMm = firstMm;
      firstMm = secondMm;
      firstError = secondError;
      secondMm = leftMm + goldenRatio * (rightMm - leftMm);
      secondError = evaluate(secondMm);
    }
  }
  return (leftMm + rightMm) / 2;
}
function calculateGoreFretPositionMm(scaleLengthMm, fretNumber) {
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}
function validateGoreInput(input) {
  requirePositive(input.scaleLengthMm, "scaleLengthMm");
  requirePositive(input.openFrequencyHz, "openFrequencyHz");
  requirePositive(input.unitMassKgPerMeter, "unitMassKgPerMeter");
  requirePositive(input.axialStiffnessN, "axialStiffnessN");
  requireNonNegative(input.extraStringLengthMm, "extraStringLengthMm");
  requireNonNegative(input.fingerDeflectionMm, "fingerDeflectionMm");
  requireOpenUnitInterval(input.playingPressure, "playingPressure");
  if (input.actionByFretMm.length < 2) {
    throw new RangeError("actionByFretMm must include the nut and at least one fret");
  }
  input.actionByFretMm.forEach((action, fretNumber) => {
    requireNonNegative(action, `actionByFretMm[${fretNumber}]`);
  });
}
function requireFretExists(actionByFretMm, fretNumber) {
  if (fretNumber >= actionByFretMm.length)
    throw new RangeError("fretNumber is outside actionByFretMm");
}
function validateBounds(bounds) {
  requireFinite(bounds.nutMinMm, "bounds.nutMinMm");
  requireFinite(bounds.nutMaxMm, "bounds.nutMaxMm");
  requireFinite(bounds.saddleMinMm, "bounds.saddleMinMm");
  requireFinite(bounds.saddleMaxMm, "bounds.saddleMaxMm");
  if (bounds.nutMinMm > bounds.nutMaxMm)
    throw new RangeError("nut bounds are reversed");
  if (bounds.saddleMinMm > bounds.saddleMaxMm)
    throw new RangeError("saddle bounds are reversed");
}
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
function requireFinite(value, name) {
  if (!Number.isFinite(value))
    throw new RangeError(`${name} must be finite`);
}
function requirePositive(value, name) {
  requireFinite(value, name);
  if (value <= 0)
    throw new RangeError(`${name} must be positive`);
}
function requireNonNegative(value, name) {
  requireFinite(value, name);
  if (value < 0)
    throw new RangeError(`${name} must be non-negative`);
}
function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0)
    throw new RangeError(`${name} must be a positive integer`);
}
function requireOpenUnitInterval(value, name) {
  requireFinite(value, name);
  if (value <= 0 || value >= 1)
    throw new RangeError(`${name} must be between 0 and 1`);
}

// action_geometry.ts
function calculateFretPositionMm(scaleLengthMm, fretNumber) {
  requirePositive2(scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(fretNumber, "fretNumber");
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}
function calculateTopOfStringClearanceMm(actionFromFretTopToStringBottomMm, stringDiameterMm) {
  requireNonNegative2(actionFromFretTopToStringBottomMm, "actionFromFretTopToStringBottomMm");
  requirePositive2(stringDiameterMm, "stringDiameterMm");
  return actionFromFretTopToStringBottomMm + stringDiameterMm;
}
function calculateActionFromTopOfStringEnvelopeMm({
  stringIndex,
  stringCount,
  stringDiameterMm,
  firstStringActionMm,
  firstStringDiameterMm,
  lastStringActionMm,
  lastStringDiameterMm
}) {
  requireStringIndex(stringIndex, stringCount);
  const firstTopClearanceMm = calculateTopOfStringClearanceMm(firstStringActionMm, firstStringDiameterMm);
  const lastTopClearanceMm = calculateTopOfStringClearanceMm(lastStringActionMm, lastStringDiameterMm);
  const positionAcrossStrings = stringCount === 1 ? 0 : stringIndex / (stringCount - 1);
  const topClearanceMm = interpolate(firstTopClearanceMm, lastTopClearanceMm, positionAcrossStrings);
  const actionMm = topClearanceMm - stringDiameterMm;
  requireNonNegative2(actionMm, "derived action");
  return actionMm;
}
function calculateReliefBelowReferenceMm(measurement, fretNumber) {
  validateReliefMeasurement(measurement);
  requireNonNegativeInteger(fretNumber, "fretNumber");
  if (fretNumber <= measurement.capoFretNumber || fretNumber >= measurement.heldFretNumber)
    return 0;
  const currentPositionMm = calculateFretPositionMm(measurement.scaleLengthMm, fretNumber);
  const capoPositionMm = calculateFretPositionMm(measurement.scaleLengthMm, measurement.capoFretNumber);
  const reliefPositionMm = calculateFretPositionMm(measurement.scaleLengthMm, measurement.reliefFretNumber);
  if (fretNumber <= measurement.reliefFretNumber) {
    const progress2 = (currentPositionMm - capoPositionMm) / (reliefPositionMm - capoPositionMm);
    return measurement.reliefMm * smoothStep(progress2);
  }
  const heldPositionMm = calculateFretPositionMm(measurement.scaleLengthMm, measurement.heldFretNumber);
  const progress = (currentPositionMm - reliefPositionMm) / (heldPositionMm - reliefPositionMm);
  return measurement.reliefMm * (1 - smoothStep(progress));
}
function calculateSaddleStringHeightMm(measurements) {
  validateBenchActionMeasurements(measurements);
  const capoPositionMm = calculateFretPositionMm(measurements.scaleLengthMm, measurements.capoFretNumber);
  const measurementPositionMm = calculateFretPositionMm(measurements.scaleLengthMm, measurements.actionMeasurementFretNumber);
  const fretHeightAtMeasurementMm = -calculateReliefBelowReferenceMm(measurements, measurements.actionMeasurementFretNumber);
  const measurementProgress = (measurementPositionMm - capoPositionMm) / (measurements.scaleLengthMm - capoPositionMm);
  return (measurements.actionAtMeasurementWithCapoMm + fretHeightAtMeasurementMm) / measurementProgress;
}
function calculateNutStringHeightMm(measurements, saddleStringHeightMm = calculateSaddleStringHeightMm(measurements)) {
  validateBenchActionMeasurements(measurements);
  requireFinite2(saddleStringHeightMm, "saddleStringHeightMm");
  const firstFretPositionMm = calculateFretPositionMm(measurements.scaleLengthMm, 1);
  const progressToFirstFret = firstFretPositionMm / measurements.scaleLengthMm;
  return (measurements.nutActionAtFirstFretMm - progressToFirstFret * saddleStringHeightMm) / (1 - progressToFirstFret);
}
function calculateActionProfileFromBenchMeasurements(measurements) {
  validateBenchActionMeasurements(measurements);
  const saddleStringHeightMm = calculateSaddleStringHeightMm(measurements);
  const nutStringHeightMm = calculateNutStringHeightMm(measurements, saddleStringHeightMm);
  return Array.from({ length: measurements.heldFretNumber + 1 }, (_, fretNumber) => calculateActionPoint({
    measurements,
    fretNumber,
    nutStringHeightMm,
    saddleStringHeightMm
  }));
}
function calculateActionPoint({
  measurements,
  fretNumber,
  nutStringHeightMm,
  saddleStringHeightMm
}) {
  const positionMm = calculateFretPositionMm(measurements.scaleLengthMm, fretNumber);
  const progressAlongScale = positionMm / measurements.scaleLengthMm;
  const fretSurfaceHeightMm = -calculateReliefBelowReferenceMm(measurements, fretNumber);
  const openStringHeightMm = interpolate(nutStringHeightMm, saddleStringHeightMm, progressAlongScale);
  const clearanceAboveFretMm = openStringHeightMm - fretSurfaceHeightMm;
  requireNonNegative2(clearanceAboveFretMm, `clearance at fret ${fretNumber}`);
  return {
    fretNumber,
    positionMm,
    fretSurfaceHeightMm,
    openStringHeightMm,
    clearanceAboveFretMm
  };
}
function validateReliefMeasurement(measurement) {
  requirePositive2(measurement.scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(measurement.capoFretNumber, "capoFretNumber");
  requirePositiveInteger2(measurement.heldFretNumber, "heldFretNumber");
  requirePositiveInteger2(measurement.reliefFretNumber, "reliefFretNumber");
  requireNonNegative2(measurement.reliefMm, "reliefMm");
  if (measurement.reliefFretNumber <= measurement.capoFretNumber) {
    throw new RangeError("reliefFretNumber must be after capoFretNumber");
  }
  if (measurement.reliefFretNumber >= measurement.heldFretNumber) {
    throw new RangeError("reliefFretNumber must be before heldFretNumber");
  }
}
function validateBenchActionMeasurements(measurements) {
  validateReliefMeasurement(measurements);
  requirePositiveInteger2(measurements.actionMeasurementFretNumber, "actionMeasurementFretNumber");
  requireNonNegative2(measurements.actionAtMeasurementWithCapoMm, "actionAtMeasurementWithCapoMm");
  requireNonNegative2(measurements.nutActionAtFirstFretMm, "nutActionAtFirstFretMm");
  if (measurements.capoFretNumber !== 1) {
    throw new RangeError("capoFretNumber must be 1 for bench action geometry");
  }
  if (measurements.actionMeasurementFretNumber <= measurements.capoFretNumber) {
    throw new RangeError("actionMeasurementFretNumber must be after capoFretNumber");
  }
  if (measurements.actionMeasurementFretNumber > measurements.heldFretNumber) {
    throw new RangeError("actionMeasurementFretNumber must not exceed heldFretNumber");
  }
}
function requireStringIndex(stringIndex, stringCount) {
  requireNonNegativeInteger(stringIndex, "stringIndex");
  requirePositiveInteger2(stringCount, "stringCount");
  if (stringIndex >= stringCount) {
    throw new RangeError("stringIndex must be less than stringCount");
  }
}
function interpolate(start, end, progress) {
  return start + (end - start) * progress;
}
function smoothStep(value) {
  const boundedValue = Math.min(1, Math.max(0, value));
  return boundedValue * boundedValue * (3 - 2 * boundedValue);
}
function requireFinite2(value, name) {
  if (!Number.isFinite(value))
    throw new RangeError(`${name} must be finite`);
}
function requirePositive2(value, name) {
  requireFinite2(value, name);
  if (value <= 0)
    throw new RangeError(`${name} must be positive`);
}
function requireNonNegative2(value, name) {
  requireFinite2(value, name);
  if (value < 0)
    throw new RangeError(`${name} must not be negative`);
}
function requirePositiveInteger2(value, name) {
  requirePositive2(value, name);
  if (!Number.isInteger(value))
    throw new RangeError(`${name} must be an integer`);
}
function requireNonNegativeInteger(value, name) {
  requireNonNegative2(value, name);
  if (!Number.isInteger(value))
    throw new RangeError(`${name} must be an integer`);
}

// instrument_profiles.ts
var STEEL_STRING_NOTES = [64, 59, 55, 50, 45, 40];
var INSTRUMENT_PROFILES = [
  {
    id: "steel_string",
    label: "Steel-string guitar",
    description: "Six single courses · D'Addario EJ16 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["High E", "B", "G", "D", "A", "Low E"],
      midiNotes: STEEL_STRING_NOTES,
      gaugesIn: [0.012, 0.016, 0.024, 0.032, 0.042, 0.053],
      woundFromIndex: 2
    }),
    scaleLengthMm: 645.16,
    outerStringSpreadMm: 36,
    fretCount: 20,
    radius: { kind: "compound", nutRadiusMm: 304.8, bridgeRadiusMm: 406.4 },
    reliefMm: 0.18,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.8, lastStringMm: 2.2 },
    nutActionAtFret1Mm: { firstStringMm: 0.22, lastStringMm: 0.32 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ16" }
  },
  {
    id: "tenor_ukulele",
    label: "Tenor ukulele",
    description: "Four re-entrant nylon courses · D'Addario EJ65T gauges",
    courseCount: 4,
    strings: createStrings({
      names: ["A4", "E4", "C4", "G4"],
      midiNotes: [69, 64, 60, 67],
      gaugesIn: [0.0287, 0.0327, 0.041, 0.03],
      materialFamily: "nylon"
    }),
    scaleLengthMm: 431.8,
    outerStringSpreadMm: 30,
    fretCount: 18,
    radius: { kind: "none" },
    reliefMm: 0,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 2, lastStringMm: 2.2 },
    nutActionAtFret1Mm: { firstStringMm: 0.55, lastStringMm: 0.65 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ65T" }
  },
  {
    id: "twelve_string",
    label: "12-string guitar",
    description: "Six double courses · D'Addario EJ38 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["E4", "E4", "B3", "B3", "G4", "G3", "D4", "D3", "A3", "A2", "E3", "E2"],
      midiNotes: [64, 64, 59, 59, 67, 55, 62, 50, 57, 45, 52, 40],
      gaugesIn: [0.01, 0.01, 0.014, 0.014, 0.008, 0.023, 0.012, 0.03, 0.018, 0.039, 0.027, 0.047],
      woundIndices: [5, 7, 9, 10, 11],
      tensionSequenceNumbers: [1, 2, 3, 4, 6, 5, 8, 7, 10, 9, 12, 11],
      courseForString: (_, stringIndex) => Math.floor(stringIndex / 2)
    }),
    scaleLengthMm: 645.16,
    outerStringSpreadMm: 38,
    fretCount: 20,
    radius: { kind: "compound", nutRadiusMm: 304.8, bridgeRadiusMm: 406.4 },
    reliefMm: 0.18,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.8, lastStringMm: 2.2 },
    nutActionAtFret1Mm: { firstStringMm: 0.22, lastStringMm: 0.32 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ38" }
  },
  {
    id: "four_string_bass",
    label: "4-string bass",
    description: "Four single courses · D'Addario EXL170 gauges",
    courseCount: 4,
    strings: createStrings({
      names: ["G2", "D2", "A1", "E1"],
      midiNotes: [43, 38, 33, 28],
      gaugesIn: [0.045, 0.065, 0.08, 0.1],
      woundFromIndex: 0
    }),
    scaleLengthMm: 863.6,
    outerStringSpreadMm: 54,
    fretCount: 20,
    radius: { kind: "simple", nutRadiusMm: 241.3 },
    reliefMm: 0.3,
    reliefFretNumber: 8,
    actionAtFret12WithCapo1Mm: { firstStringMm: 2, lastStringMm: 2.4 },
    nutActionAtFret1Mm: { firstStringMm: 0.3, lastStringMm: 0.4 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EXL170" }
  },
  {
    id: "classical",
    label: "Classical guitar",
    description: "Six nylon courses · flat fingerboard · D'Addario EJ45 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["E4", "B3", "G3", "D3", "A2", "E2"],
      midiNotes: STEEL_STRING_NOTES,
      gaugesIn: [0.028, 0.0322, 0.0403, 0.029, 0.035, 0.043],
      woundFromIndex: 3,
      materialFamily: "nylon"
    }),
    scaleLengthMm: 650,
    outerStringSpreadMm: 44,
    fretCount: 19,
    radius: { kind: "none" },
    reliefMm: 0,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 2.8, lastStringMm: 3.5 },
    nutActionAtFret1Mm: { firstStringMm: 0.5, lastStringMm: 0.7 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ45" }
  },
  {
    id: "mandolin",
    label: "Mandolin",
    description: "Four double courses · D'Addario EJ74 gauges",
    courseCount: 4,
    strings: createStrings({
      names: ["E5", "E5", "A4", "A4", "D4", "D4", "G3", "G3"],
      midiNotes: [76, 76, 69, 69, 62, 62, 55, 55],
      gaugesIn: [0.011, 0.011, 0.015, 0.015, 0.026, 0.026, 0.04, 0.04],
      woundFromIndex: 4,
      courseForString: (_, stringIndex) => Math.floor(stringIndex / 2)
    }),
    scaleLengthMm: 352.43,
    outerStringSpreadMm: 28,
    fretCount: 20,
    radius: { kind: "simple", nutRadiusMm: 304.8 },
    reliefMm: 0.1,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.2, lastStringMm: 1.5 },
    nutActionAtFret1Mm: { firstStringMm: 0.2, lastStringMm: 0.3 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ74" }
  }
];
function findInstrumentProfile(profileId) {
  const profile = INSTRUMENT_PROFILES.find(({ id }) => id === profileId);
  if (!profile)
    throw new RangeError(`Unknown instrument profile: ${profileId}`);
  return profile;
}
function createStrings({
  names,
  midiNotes,
  gaugesIn,
  woundFromIndex = Infinity,
  woundIndices = [],
  tensionSequenceNumbers,
  materialFamily = "steel",
  courseForString = (_, stringIndex) => stringIndex
}) {
  if (names.length !== midiNotes.length || names.length !== gaugesIn.length) {
    throw new RangeError("Profile string names, notes, and gauges must have equal lengths");
  }
  return names.map((name, stringIndex) => ({
    name,
    openMidiNote: midiNotes[stringIndex],
    gaugeMm: gaugesIn[stringIndex] * 25.4,
    construction: stringIndex >= woundFromIndex || woundIndices.includes(stringIndex) ? "wound" : "plain",
    materialFamily,
    courseIndex: courseForString(name, stringIndex),
    tensionSequenceNumber: tensionSequenceNumbers?.[stringIndex] ?? stringIndex + 1
  }));
}

// setup_model.ts
var MILLIMETERS_PER_METER2 = 1000;
var MILLIMETERS_PER_INCH = 25.4;
var DEFAULT_STRING_SPACING_MM = 7.2;
var DEFAULT_EXTRA_STRING_LENGTH_MM = 120;
var DEFAULT_FINGER_DEFLECTION_MM = 0.5;
var DEFAULT_PLAYING_PRESSURE = 0.75;
var DEFAULT_FAN_NEUTRAL_FRET = 7;
var DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER = 7850;
var DEFAULT_STEEL_YOUNG_MODULUS_PA = 195000000000;
var DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER = 1140;
var DEFAULT_NYLON_YOUNG_MODULUS_PA = 3000000000;
function calculateFretPositionMm2(scaleLengthMm, fretNumber) {
  requirePositive3(scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger2(fretNumber, "fretNumber");
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}
function calculateFrequencyHzFromMidi(midiNote) {
  requireFinite3(midiNote, "midiNote");
  return 440 * 2 ** ((midiNote - 69) / 12);
}
function calculateMaximumAbsoluteCentsError(centsErrors) {
  centsErrors.forEach((error, index) => requireFinite3(error, `centsErrors[${index}]`));
  return centsErrors.reduce((maximum, error) => Math.max(maximum, Math.abs(error)), 0);
}
function calculateRadiusDropMm(radiusMm, lateralOffsetMm) {
  requireFinite3(lateralOffsetMm, "lateralOffsetMm");
  if (radiusMm === Infinity)
    return 0;
  requirePositive3(radiusMm, "radiusMm");
  if (Math.abs(lateralOffsetMm) > radiusMm) {
    throw new RangeError("lateralOffsetMm must fit inside the fingerboard radius");
  }
  return radiusMm - Math.sqrt(radiusMm ** 2 - lateralOffsetMm ** 2);
}
function calculateRadiusAtFretMm({
  radiusProfile,
  normalizedFretPosition
}) {
  requireUnitInterval(normalizedFretPosition, "normalizedFretPosition");
  if (radiusProfile.kind === "simple") {
    requirePositiveOrInfinity(radiusProfile.radiusMm, "radiusProfile.radiusMm");
    return radiusProfile.radiusMm;
  }
  if (radiusProfile.kind !== "compound") {
    throw new RangeError("radiusProfile.kind must be simple or compound");
  }
  requirePositiveOrInfinity(radiusProfile.nutRadiusMm, "radiusProfile.nutRadiusMm");
  requirePositiveOrInfinity(radiusProfile.bridgeRadiusMm, "radiusProfile.bridgeRadiusMm");
  return radiusProfile.nutRadiusMm + (radiusProfile.bridgeRadiusMm - radiusProfile.nutRadiusMm) * normalizedFretPosition;
}
function calculateStringLateralPositionMm({
  stringIndex,
  stringCount,
  stringSpacingMm = DEFAULT_STRING_SPACING_MM
}) {
  requireNonNegativeInteger2(stringIndex, "stringIndex");
  requirePositiveInteger3(stringCount, "stringCount");
  requirePositive3(stringSpacingMm, "stringSpacingMm");
  if (stringIndex >= stringCount) {
    throw new RangeError("stringIndex must be less than stringCount");
  }
  return (stringIndex - (stringCount - 1) / 2) * stringSpacingMm;
}
function calculateStringTopHeightMm({
  clearanceAboveFretMm,
  stringDiameterMm,
  fingerboardRadiusMm,
  lateralPositionMm
}) {
  requireNonNegative3(clearanceAboveFretMm, "clearanceAboveFretMm");
  requirePositive3(stringDiameterMm, "stringDiameterMm");
  return clearanceAboveFretMm + stringDiameterMm - calculateRadiusDropMm(fingerboardRadiusMm, lateralPositionMm);
}
function calculateClearanceFromStringTopMm({
  stringTopHeightMm,
  stringDiameterMm,
  fingerboardRadiusMm,
  lateralPositionMm
}) {
  requireFinite3(stringTopHeightMm, "stringTopHeightMm");
  requirePositive3(stringDiameterMm, "stringDiameterMm");
  return stringTopHeightMm - stringDiameterMm + calculateRadiusDropMm(fingerboardRadiusMm, lateralPositionMm);
}
function estimateStringMechanicalProperties({
  gaugeMm,
  construction = "plain",
  materialFamily = "steel",
  densityKgPerCubicMeter,
  youngModulusPa
}) {
  requirePositive3(gaugeMm, "gaugeMm");
  const materialDefaults = materialFamily === "nylon" ? {
    densityKgPerCubicMeter: DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER,
    youngModulusPa: DEFAULT_NYLON_YOUNG_MODULUS_PA
  } : {
    densityKgPerCubicMeter: DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER,
    youngModulusPa: DEFAULT_STEEL_YOUNG_MODULUS_PA
  };
  const radiusM = gaugeMm / 2 / MILLIMETERS_PER_METER2;
  const outsideAreaM2 = Math.PI * radiusM ** 2;
  const unitMassFillFactor = construction === "wound" ? 0.72 : 1;
  const axialDiameterMm = estimateAxialDiameterMm({
    outsideDiameterMm: gaugeMm,
    construction,
    materialFamily
  });
  const axialRadiusM = axialDiameterMm / 2 / MILLIMETERS_PER_METER2;
  const axialAreaM2 = Math.PI * axialRadiusM ** 2;
  if (construction !== "plain" && construction !== "wound") {
    throw new RangeError("construction must be plain or wound");
  }
  return {
    unitMassKgPerMeter: (densityKgPerCubicMeter ?? materialDefaults.densityKgPerCubicMeter) * outsideAreaM2 * unitMassFillFactor,
    axialStiffnessN: (youngModulusPa ?? materialDefaults.youngModulusPa) * axialAreaM2
  };
}
function estimateAxialDiameterMm({
  outsideDiameterMm,
  construction,
  materialFamily
}) {
  if (construction === "plain")
    return outsideDiameterMm;
  if (materialFamily === "nylon")
    return outsideDiameterMm * 0.6;
  const outsideDiameterIn = outsideDiameterMm / MILLIMETERS_PER_INCH;
  const estimatedCoreDiameterIn = 0.008 + 0.224 * outsideDiameterIn;
  return Math.min(outsideDiameterMm, estimatedCoreDiameterIn * MILLIMETERS_PER_INCH);
}
function calculateFrettedPitchErrorCents({
  string,
  fretNumber,
  actionByFret,
  nutCompensationMm,
  saddleCompensationMm,
  fingerDeflectionMm = DEFAULT_FINGER_DEFLECTION_MM,
  playingPressure = DEFAULT_PLAYING_PRESSURE
}) {
  requirePositiveInteger3(fretNumber, "fretNumber");
  requireFinite3(nutCompensationMm, "nutCompensationMm");
  requireFinite3(saddleCompensationMm, "saddleCompensationMm");
  const goreInput = createGoreInput({
    string,
    actionByFret,
    fingerDeflectionMm,
    playingPressure
  });
  return calculateGoreCentsError(goreInput, fretNumber, nutCompensationMm, saddleCompensationMm);
}
function optimizeNutAndSaddleCompensation({
  string,
  actionByFret,
  lastFret = actionByFret.length - 1,
  initialNutCompensationMm = 0.56,
  initialSaddleCompensationMm = 0.75,
  bounds = GORE_REFERENCE_BOUNDS,
  fingerDeflectionMm = DEFAULT_FINGER_DEFLECTION_MM,
  playingPressure = DEFAULT_PLAYING_PRESSURE
}) {
  requirePositiveInteger3(lastFret, "lastFret");
  if (lastFret >= actionByFret.length) {
    throw new RangeError("lastFret is outside actionByFret");
  }
  const goreInput = createGoreInput({
    string,
    actionByFret,
    fingerDeflectionMm,
    playingPressure
  });
  const optimized = optimizeGoreCompensation({
    input: goreInput,
    initialNutCompensationMm,
    initialSaddleCompensationMm,
    bounds
  });
  return {
    nutCompensationMm: optimized.nutCompensationMm,
    saddleCompensationMm: optimized.saddleCompensationMm,
    centsErrorByFret: optimized.centsErrorByFret.slice(1, lastFret + 1),
    totalAbsoluteErrorCents: optimized.centsErrorByFret.slice(1, lastFret + 1).reduce((total, error) => total + Math.abs(error), 0)
  };
}
function createGoreInput({
  string,
  actionByFret,
  fingerDeflectionMm,
  playingPressure
}) {
  return {
    scaleLengthMm: string.scaleLengthMm,
    openFrequencyHz: string.openFrequencyHz,
    actionByFretMm: actionByFret.map((fret) => fret.clearanceAboveFretMm),
    unitMassKgPerMeter: string.unitMassKgPerMeter,
    axialStiffnessN: string.axialStiffnessN,
    extraStringLengthMm: string.extraStringLengthMm,
    fingerDeflectionMm,
    playingPressure
  };
}
function calculateSetupForString({
  string,
  sharedSetup
}) {
  const scaleLengthMm = string.scaleLengthMm ?? sharedSetup.scaleLengthMm;
  const actionByFret = calculateBenchActionProfile({ string, sharedSetup, scaleLengthMm });
  const intonation = optimizeNutAndSaddleCompensation({
    string: {
      ...string,
      scaleLengthMm,
      openFrequencyHz: calculateFrequencyHzFromMidi(string.openMidiNote),
      extraStringLengthMm: sharedSetup.extraStringLengthMm
    },
    actionByFret,
    lastFret: sharedSetup.fretCount,
    fingerDeflectionMm: sharedSetup.fingerDeflectionMm,
    playingPressure: sharedSetup.playingPressure
  });
  return { string, actionByFret, intonation };
}
function calculateSetup(sharedSetup) {
  return {
    strings: sharedSetup.strings.map((string) => calculateSetupForString({
      string,
      sharedSetup
    }))
  };
}
function applyTensionCatalogToSetup(setup, tensionCatalog, sourceSelection) {
  return {
    ...setup,
    tensionCatalog,
    tensionDataSource: sourceSelection || null,
    strings: setup.strings.map((string) => {
      const estimatedProperties = estimateStringMechanicalProperties({
        gaugeMm: string.gaugeMm,
        construction: string.construction,
        materialFamily: string.materialFamily
      });
      const sourceRecord = sourceSelection ? findTensionSourceRecord(tensionCatalog, {
        manufacturer: sourceSelection.manufacturer,
        setCode: sourceSelection.setCode,
        setCodes: sourceSelection.setCodes,
        sequenceNumber: string.tensionSequenceNumber,
        gaugeMm: string.gaugeMm,
        construction: string.construction
      }) : null;
      return applyTensionSourceRecord({
        ...string,
        ...estimatedProperties
      }, sourceRecord);
    })
  };
}
function createStringSetFromInstrumentProfile({
  profile,
  tensionCatalog = null
}) {
  return profile.strings.map((profileString, stringIndex) => {
    const estimatedProperties = estimateStringMechanicalProperties(profileString);
    const string = {
      ...profileString,
      stringIndex,
      scaleLengthMm: profile.scaleLengthMm,
      ...estimatedProperties
    };
    return applyTensionSourceRecord(string, findTensionSourceRecord(tensionCatalog, {
      ...profile.tensionSet,
      sequenceNumber: profileString.tensionSequenceNumber,
      gaugeMm: profileString.gaugeMm,
      construction: profileString.construction
    }));
  });
}
function createDefaultSetup() {
  return createSetupFromInstrumentProfile("steel_string");
}
function createSetupFromInstrumentProfile(profileId) {
  const profile = findInstrumentProfile(profileId);
  return {
    instrumentProfileId: profile.id,
    courseCount: profile.courseCount,
    benchActionTargets: {
      capoFretNumber: 1,
      actionMeasurementFretNumber: 12,
      actionAtMeasurementWithCapoMm: { ...profile.actionAtFret12WithCapo1Mm },
      nutActionAtFirstFretMm: { ...profile.nutActionAtFret1Mm }
    },
    scaleLengthMm: profile.scaleLengthMm,
    fretCount: profile.fretCount,
    fanNeutralFret: DEFAULT_FAN_NEUTRAL_FRET,
    reliefAmountMm: profile.reliefMm,
    reliefPeakFret: profile.reliefFretNumber,
    extraStringLengthMm: DEFAULT_EXTRA_STRING_LENGTH_MM,
    tensionDataSource: { ...profile.tensionSet },
    fingerDeflectionMm: DEFAULT_FINGER_DEFLECTION_MM,
    playingPressure: DEFAULT_PLAYING_PRESSURE,
    stringSpacingMm: profile.outerStringSpreadMm / (profile.strings.length - 1),
    radiusProfile: createRadiusProfileFromInstrumentProfile(profile),
    strings: createStringSetFromInstrumentProfile({ profile })
  };
}
function createCustomSetupFromCourseMembers({
  baseSetup,
  membersByCourse
}) {
  if (membersByCourse.length < 1 || membersByCourse.length > 8) {
    throw new RangeError("Custom setup must contain between 1 and 8 courses");
  }
  if (membersByCourse.some((memberCount) => memberCount !== 1 && memberCount !== 2)) {
    throw new RangeError("Each custom course must contain 1 or 2 strings");
  }
  const stringLocations = membersByCourse.flatMap((memberCount, courseIndex) => Array.from({ length: memberCount }, (_, memberIndex) => ({ courseIndex, memberIndex })));
  const strings = stringLocations.map(({ courseIndex, memberIndex }, stringIndex) => {
    const sourceStringIndex = calculateSourceStringIndex({
      targetStringIndex: stringIndex,
      targetStringCount: stringLocations.length,
      sourceStringCount: baseSetup.strings.length
    });
    const sourceString = baseSetup.strings[sourceStringIndex];
    const gaugeMm = calculateInterpolatedGaugeMm({
      targetStringIndex: stringIndex,
      targetStringCount: stringLocations.length,
      sourceStrings: baseSetup.strings
    });
    const estimatedProperties = estimateStringMechanicalProperties({ ...sourceString, gaugeMm });
    const courseSuffix = membersByCourse[courseIndex] === 2 ? ` ${memberIndex + 1}` : "";
    const { tensionSource: _tensionSource, tensionSequenceNumber: _sequence, ...editableString } = sourceString;
    return {
      ...editableString,
      ...estimatedProperties,
      gaugeMm,
      name: `${sourceString.name}${courseSuffix}`,
      stringIndex,
      courseIndex,
      scaleLengthMm: sourceString.scaleLengthMm ?? baseSetup.scaleLengthMm
    };
  });
  const outerStringSpanMm = baseSetup.stringSpacingMm * Math.max(0, baseSetup.strings.length - 1);
  const stringSpacingMm = strings.length === 1 ? 0 : outerStringSpanMm / (strings.length - 1);
  return {
    ...baseSetup,
    instrumentProfileId: "custom",
    courseCount: membersByCourse.length,
    tensionDataSource: null,
    stringSpacingMm,
    strings
  };
}
function calculateInterpolatedGaugeMm({
  targetStringIndex,
  targetStringCount,
  sourceStrings
}) {
  if (targetStringCount === 1 || sourceStrings.length === 1)
    return sourceStrings[0].gaugeMm;
  const sourcePosition = targetStringIndex * (sourceStrings.length - 1) / (targetStringCount - 1);
  const lowerIndex = Math.floor(sourcePosition);
  const upperIndex = Math.ceil(sourcePosition);
  const progress = sourcePosition - lowerIndex;
  return sourceStrings[lowerIndex].gaugeMm + (sourceStrings[upperIndex].gaugeMm - sourceStrings[lowerIndex].gaugeMm) * progress;
}
function calculateSourceStringIndex({
  targetStringIndex,
  targetStringCount,
  sourceStringCount
}) {
  if (targetStringCount === 1 || sourceStringCount === 1)
    return 0;
  const targetProgress = targetStringIndex / (targetStringCount - 1);
  return Math.round(targetProgress * (sourceStringCount - 1));
}
function createRadiusProfileFromInstrumentProfile(profile) {
  if (profile.radius.kind === "none") {
    return { kind: "simple", radiusMm: Infinity };
  }
  if (profile.radius.kind === "simple") {
    return { kind: "simple", radiusMm: profile.radius.nutRadiusMm };
  }
  return {
    kind: "compound",
    nutRadiusMm: profile.radius.nutRadiusMm,
    bridgeRadiusMm: profile.radius.bridgeRadiusMm
  };
}
function calculateBenchActionProfile({
  string,
  sharedSetup,
  scaleLengthMm
}) {
  const firstString = sharedSetup.strings[0];
  const lastString = sharedSetup.strings[sharedSetup.strings.length - 1];
  const actionAtMeasurementWithCapoMm = calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringDiameterMm: string.gaugeMm,
    firstStringActionMm: sharedSetup.benchActionTargets.actionAtMeasurementWithCapoMm.firstStringMm,
    firstStringDiameterMm: firstString.gaugeMm,
    lastStringActionMm: sharedSetup.benchActionTargets.actionAtMeasurementWithCapoMm.lastStringMm,
    lastStringDiameterMm: lastString.gaugeMm
  });
  const nutActionAtFirstFretMm = calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringDiameterMm: string.gaugeMm,
    firstStringActionMm: sharedSetup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm,
    firstStringDiameterMm: firstString.gaugeMm,
    lastStringActionMm: sharedSetup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm,
    lastStringDiameterMm: lastString.gaugeMm
  });
  const calculatedProfile = calculateActionProfileFromBenchMeasurements({
    scaleLengthMm,
    capoFretNumber: sharedSetup.benchActionTargets.capoFretNumber,
    heldFretNumber: sharedSetup.fretCount,
    reliefFretNumber: sharedSetup.reliefPeakFret,
    reliefMm: sharedSetup.reliefAmountMm,
    actionMeasurementFretNumber: sharedSetup.benchActionTargets.actionMeasurementFretNumber,
    actionAtMeasurementWithCapoMm,
    nutActionAtFirstFretMm
  });
  const lateralPositionMm = calculateStringLateralPositionMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringSpacingMm: sharedSetup.stringSpacingMm
  });
  return calculatedProfile.map((point) => {
    const normalizedPosition = point.positionMm / scaleLengthMm;
    const fingerboardRadiusMm = calculateRadiusAtFretMm({
      radiusProfile: sharedSetup.radiusProfile,
      normalizedFretPosition: normalizedPosition
    });
    return {
      fretNumber: point.fretNumber,
      positionMm: point.positionMm,
      normalizedPosition,
      clearanceAboveFretMm: point.clearanceAboveFretMm,
      baseClearanceAboveFretMm: point.clearanceAboveFretMm,
      radiusClearanceAdjustmentMm: 0,
      fingerboardRadiusMm,
      lateralPositionMm,
      stringTopHeightMm: calculateStringTopHeightMm({
        clearanceAboveFretMm: point.clearanceAboveFretMm,
        stringDiameterMm: string.gaugeMm,
        fingerboardRadiusMm,
        lateralPositionMm
      })
    };
  });
}
function requireFinite3(value, name) {
  if (!Number.isFinite(value))
    throw new RangeError(`${name} must be finite`);
}
function requirePositive3(value, name) {
  requireFinite3(value, name);
  if (value <= 0)
    throw new RangeError(`${name} must be positive`);
}
function requirePositiveOrInfinity(value, name) {
  if (value !== Infinity)
    requirePositive3(value, name);
}
function requireNonNegative3(value, name) {
  requireFinite3(value, name);
  if (value < 0)
    throw new RangeError(`${name} must not be negative`);
}
function requirePositiveInteger3(value, name) {
  requirePositive3(value, name);
  if (!Number.isInteger(value))
    throw new RangeError(`${name} must be an integer`);
}
function requireNonNegativeInteger2(value, name) {
  requireNonNegative3(value, name);
  if (!Number.isInteger(value))
    throw new RangeError(`${name} must be an integer`);
}
function requireUnitInterval(value, name) {
  requireFinite3(value, name);
  if (value < 0 || value > 1)
    throw new RangeError(`${name} must be between 0 and 1`);
}
export {
  optimizeNutAndSaddleCompensation,
  optimizeGoreCompensation,
  findInstrumentProfile,
  estimateStringMechanicalProperties,
  createStringSetFromInstrumentProfile,
  createSetupFromInstrumentProfile,
  createDefaultSetup,
  createCustomSetupFromCourseMembers,
  calculateStringTopHeightMm,
  calculateStringLateralPositionMm,
  calculateSetupForString,
  calculateSetup,
  calculateRadiusDropMm,
  calculateRadiusAtFretMm,
  calculateMaximumAbsoluteCentsError,
  calculateGoreTotalAbsoluteErrorCents,
  calculateGoreCentsErrors,
  calculateGoreCentsError,
  calculateFrettedPitchErrorCents,
  calculateFretPositionMm2 as calculateFretPositionMm,
  calculateFrequencyHzFromMidi,
  calculateClearanceFromStringTopMm,
  applyTensionCatalogToSetup,
  INSTRUMENT_PROFILES,
  GORE_REFERENCE_BOUNDS
};
