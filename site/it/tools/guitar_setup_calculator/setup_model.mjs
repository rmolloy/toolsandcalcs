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

// empirical_compensation.ts
function calculateCompensatedOpenStringLengthMm(geometry) {
  const { scaleLengthMm, nutCompensationMm, saddleCompensationMm } = geometry;
  const values = [scaleLengthMm, nutCompensationMm, saddleCompensationMm];
  if (!values.every(Number.isFinite) || scaleLengthMm <= 0) {
    throw new RangeError("compensation geometry must contain finite lengths and a positive scale");
  }
  const compensatedLengthMm = scaleLengthMm - nutCompensationMm + saddleCompensationMm;
  if (compensatedLengthMm <= 0) {
    throw new RangeError("compensated open-string length must be positive");
  }
  return compensatedLengthMm;
}
function calculateNutCompensationTonalShiftCents(geometry) {
  const compensatedLengthMm = calculateCompensatedOpenStringLengthMm(geometry);
  const oneCentLengthRatio = 1 - 2 ** (-1 / 1200);
  return -geometry.nutCompensationMm / (compensatedLengthMm * oneCentLengthRatio);
}
function calculateSaddleCompensationTonalShiftCents(geometry, fretNumber) {
  if (!Number.isInteger(fretNumber) || fretNumber < 1) {
    throw new RangeError("fretNumber must be a positive integer");
  }
  const compensatedLengthMm = calculateCompensatedOpenStringLengthMm(geometry);
  const frettedLengthMm = compensatedLengthMm / 2 ** (fretNumber / 12);
  const oneCentLengthRatio = 1 - 2 ** (-1 / 1200);
  return -geometry.saddleCompensationMm / (frettedLengthMm * oneCentLengthRatio);
}
function calculateCombinedCompensationTonalShiftCents(geometry, fretNumber) {
  return calculateNutCompensationTonalShiftCents(geometry) + calculateSaddleCompensationTonalShiftCents(geometry, fretNumber);
}
function calculateResidualTonalErrorCents(measuredErrorCents, geometry, fretNumber) {
  if (!Number.isFinite(measuredErrorCents)) {
    throw new RangeError("measuredErrorCents must be finite");
  }
  return measuredErrorCents + calculateCombinedCompensationTonalShiftCents(geometry, fretNumber);
}
function calculateTotalAbsoluteResidualCentsForReadings(readings, geometry) {
  if (readings.length === 0) {
    throw new RangeError("readings must include at least one measured fret");
  }
  return readings.reduce((total, { fretNumber, measuredErrorCents }) => total + Math.abs(calculateResidualTonalErrorCents(measuredErrorCents, geometry, fretNumber)), 0);
}
function readingsFromDenseErrors(measuredErrorsCentsByFret) {
  return measuredErrorsCentsByFret.map((measuredErrorCents, index) => ({
    fretNumber: index + 1,
    measuredErrorCents
  }));
}
function optimizeEmpiricalAdjustmentFromReadings({
  scaleLengthMm,
  readings,
  search
}) {
  validateEmpiricalReadings(readings);
  validateEmpiricalCompensationSearch(scaleLengthMm, search);
  let window = search.bounds;
  let best = findBestEmpiricalCompensationInWindow(scaleLengthMm, readings, window, search.divisionsPerAxis);
  for (let pass = 1;pass < search.refinementPasses; pass += 1) {
    window = refineEmpiricalCompensationWindow(window, best.geometry, search.divisionsPerAxis);
    best = findBestEmpiricalCompensationInWindow(scaleLengthMm, readings, window, search.divisionsPerAxis);
  }
  return {
    nutAdjustmentMm: best.geometry.nutCompensationMm,
    saddleAdjustmentMm: best.geometry.saddleCompensationMm,
    residualCentsByReading: readings.map(({ fretNumber, measuredErrorCents }) => ({
      fretNumber,
      residualCents: calculateResidualTonalErrorCents(measuredErrorCents, best.geometry, fretNumber)
    })),
    totalAbsoluteResidualCents: best.totalAbsoluteResidualCents
  };
}
function findBestEmpiricalCompensationInWindow(scaleLengthMm, readings, bounds, divisionsPerAxis) {
  const candidates = createEmpiricalCompensationCandidates(scaleLengthMm, readings, bounds, divisionsPerAxis);
  return candidates.reduce((best, candidate) => isBetterEmpiricalCompensationCandidate(candidate, best) ? candidate : best);
}
function createEmpiricalCompensationCandidates(scaleLengthMm, readings, bounds, divisionsPerAxis) {
  const nutValues = createSearchAxis(bounds.nutMinimumMm, bounds.nutMaximumMm, divisionsPerAxis);
  const saddleValues = createSearchAxis(bounds.saddleMinimumMm, bounds.saddleMaximumMm, divisionsPerAxis);
  return nutValues.flatMap((nutCompensationMm) => saddleValues.map((saddleCompensationMm) => createEmpiricalCompensationCandidate(scaleLengthMm, readings, nutCompensationMm, saddleCompensationMm)));
}
function createEmpiricalCompensationCandidate(scaleLengthMm, readings, nutCompensationMm, saddleCompensationMm) {
  const geometry = { scaleLengthMm, nutCompensationMm, saddleCompensationMm };
  return {
    geometry,
    totalAbsoluteResidualCents: calculateTotalAbsoluteResidualCentsForReadings(readings, geometry)
  };
}
function createSearchAxis(minimum, maximum, divisions) {
  if (minimum === maximum)
    return [minimum];
  const step = (maximum - minimum) / divisions;
  return Array.from({ length: divisions + 1 }, (_, index) => index === divisions ? maximum : minimum + index * step);
}
function isBetterEmpiricalCompensationCandidate(candidate, current) {
  if (!current)
    return true;
  if (candidate.totalAbsoluteResidualCents !== current.totalAbsoluteResidualCents) {
    return candidate.totalAbsoluteResidualCents < current.totalAbsoluteResidualCents;
  }
  return calculateTotalCompensationMovementMm(candidate.geometry) < calculateTotalCompensationMovementMm(current.geometry);
}
function calculateTotalCompensationMovementMm(geometry) {
  return Math.abs(geometry.nutCompensationMm) + Math.abs(geometry.saddleCompensationMm);
}
function refineEmpiricalCompensationWindow(bounds, geometry, divisions) {
  const nutStep = (bounds.nutMaximumMm - bounds.nutMinimumMm) / divisions;
  const saddleStep = (bounds.saddleMaximumMm - bounds.saddleMinimumMm) / divisions;
  return {
    nutMinimumMm: Math.max(bounds.nutMinimumMm, geometry.nutCompensationMm - nutStep),
    nutMaximumMm: Math.min(bounds.nutMaximumMm, geometry.nutCompensationMm + nutStep),
    saddleMinimumMm: Math.max(bounds.saddleMinimumMm, geometry.saddleCompensationMm - saddleStep),
    saddleMaximumMm: Math.min(bounds.saddleMaximumMm, geometry.saddleCompensationMm + saddleStep)
  };
}
function validateEmpiricalCompensationSearch(scaleLengthMm, search) {
  validateEmpiricalScaleLength(scaleLengthMm);
  validateEmpiricalCompensationBounds(scaleLengthMm, search.bounds);
  validateEmpiricalSearchResolution(search);
}
function validateEmpiricalReadings(readings) {
  if (readings.length === 0) {
    throw new RangeError("readings must include at least one measured fret");
  }
  const seenFretNumbers = new Set;
  for (const reading of readings) {
    if (!Number.isInteger(reading.fretNumber) || reading.fretNumber < 1) {
      throw new RangeError("reading fretNumber must be a positive integer");
    }
    if (!Number.isFinite(reading.measuredErrorCents)) {
      throw new RangeError("reading measuredErrorCents must be finite");
    }
    if (seenFretNumbers.has(reading.fretNumber)) {
      throw new RangeError("readings must not repeat a fret");
    }
    seenFretNumbers.add(reading.fretNumber);
  }
}
function validateEmpiricalScaleLength(scaleLengthMm) {
  if (!Number.isFinite(scaleLengthMm) || scaleLengthMm <= 0) {
    throw new RangeError("scaleLengthMm must be positive");
  }
}
function validateEmpiricalCompensationBounds(scaleLengthMm, bounds) {
  const boundValues = [
    bounds.nutMinimumMm,
    bounds.nutMaximumMm,
    bounds.saddleMinimumMm,
    bounds.saddleMaximumMm
  ];
  if (!boundValues.every(Number.isFinite))
    throw new RangeError("search bounds must be finite");
  if (bounds.nutMinimumMm > bounds.nutMaximumMm) {
    throw new RangeError("nut search bounds must be ordered");
  }
  if (bounds.saddleMinimumMm > bounds.saddleMaximumMm) {
    throw new RangeError("saddle search bounds must be ordered");
  }
  if (scaleLengthMm - bounds.nutMaximumMm + bounds.saddleMinimumMm <= 0) {
    throw new RangeError("search bounds must preserve a positive string length");
  }
}
function validateEmpiricalSearchResolution(search) {
  if (!Number.isInteger(search.divisionsPerAxis) || search.divisionsPerAxis < 2) {
    throw new RangeError("divisionsPerAxis must be an integer of at least two");
  }
  if (!Number.isInteger(search.refinementPasses) || search.refinementPasses < 1) {
    throw new RangeError("refinementPasses must be a positive integer");
  }
}

// gore_book_model.ts
var GORE_BOOK_REFERENCE_BOUNDS = {
  nutMinMm: -5,
  nutMaxMm: 5,
  saddleMinMm: -5,
  saddleMaxMm: 5
};
var MILLIMETERS_PER_METER2 = 1000;
function fretPositionFromZeroFretMm(scaleLengthMm, fretNumber) {
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}
function calculateGoreBookSpeakingLengthMm(scaleLengthMm, nutCompensationMm, saddleCompensationMm) {
  const speakingLengthMm = scaleLengthMm - nutCompensationMm + saddleCompensationMm;
  if (!(speakingLengthMm > 0)) {
    throw new RangeError("compensated speaking length must be positive");
  }
  return speakingLengthMm;
}
function calculateGoreBookFrettedPathMm(input, fretNumber, nutCompensationMm, saddleCompensationMm) {
  validateGoreBookInput(input);
  requireModelFret(input, fretNumber);
  const speakingLengthMm = calculateGoreBookSpeakingLengthMm(input.scaleLengthMm, nutCompensationMm, saddleCompensationMm);
  const nutReferencedPositionMm = (fret) => fret === 0 ? 0 : fretPositionFromZeroFretMm(input.scaleLengthMm, fret) - nutCompensationMm;
  const previousFret = fretNumber - 1;
  const previousPositionMm = nutReferencedPositionMm(previousFret);
  const currentPositionMm = nutReferencedPositionMm(fretNumber);
  const previousClearanceMm = input.actionByFretMm[previousFret];
  const currentClearanceMm = input.actionByFretMm[fretNumber];
  const nutSegmentMm = fretNumber === 1 ? 0 : Math.hypot(previousPositionMm, previousClearanceMm);
  const spacingMm = currentPositionMm - previousPositionMm;
  const firstFretSpacingMm = nutReferencedPositionMm(1);
  const fingerDeflectionMm = input.fingerRestDeflectionMm * input.playerPressureFactor * (spacingMm / firstFretSpacingMm);
  const halfContactMm = 0.5 * Math.hypot(spacingMm, currentClearanceMm - previousClearanceMm);
  const fingerSegmentMm = 2 * Math.hypot(fingerDeflectionMm, halfContactMm);
  const saddleSegmentMm = Math.hypot(speakingLengthMm - currentPositionMm, currentClearanceMm);
  return nutSegmentMm + fingerSegmentMm + saddleSegmentMm;
}
function calculateGoreBookFretState(input, fretNumber, nutCompensationMm, saddleCompensationMm) {
  const speakingLengthMm = calculateGoreBookSpeakingLengthMm(input.scaleLengthMm, nutCompensationMm, saddleCompensationMm);
  const frettedPathLengthMm = calculateGoreBookFrettedPathMm(input, fretNumber, nutCompensationMm, saddleCompensationMm);
  const pathExtensionMm = frettedPathLengthMm - speakingLengthMm;
  const speakingLengthM = speakingLengthMm / MILLIMETERS_PER_METER2;
  const openTensionN = 4 * input.unitMassKgPerMeter * speakingLengthM ** 2 * input.openFrequencyHz ** 2;
  const addedTensionN = input.axialStiffnessN * pathExtensionMm / input.stretchableLengthMm;
  const frettedTensionN = openTensionN + addedTensionN;
  if (frettedTensionN <= 0)
    throw new RangeError("fretted string tension must be positive");
  const targetFrequencyHz = input.openFrequencyHz * 2 ** (fretNumber / 12);
  const requiredStoppedLengthMm = 1 / (2 * targetFrequencyHz) * Math.sqrt(frettedTensionN / input.unitMassKgPerMeter) * MILLIMETERS_PER_METER2;
  const geometricStoppedLengthMm = speakingLengthMm - (fretPositionFromZeroFretMm(input.scaleLengthMm, fretNumber) - nutCompensationMm);
  const lengthErrorMm = requiredStoppedLengthMm - geometricStoppedLengthMm;
  return {
    fretNumber,
    frettedPathLengthMm,
    pathExtensionMm,
    addedTensionN,
    requiredStoppedLengthMm,
    geometricStoppedLengthMm,
    lengthErrorMm,
    centsError: 1200 * Math.log2(requiredStoppedLengthMm / geometricStoppedLengthMm)
  };
}
function calculateGoreBookTotalAbsoluteLengthErrorMm(input, fretNumbers, nutCompensationMm, saddleCompensationMm) {
  validateFretSelection(input, fretNumbers);
  return fretNumbers.reduce((total, fretNumber) => total + Math.abs(calculateGoreBookFretState(input, fretNumber, nutCompensationMm, saddleCompensationMm).lengthErrorMm), 0);
}
function optimizeGoreBookCompensation({
  input,
  fretNumbers,
  initialNutCompensationMm = 0.56,
  initialSaddleCompensationMm = 0.75,
  bounds = GORE_BOOK_REFERENCE_BOUNDS
}) {
  validateFretSelection(input, fretNumbers);
  validateBounds2(bounds);
  let nutCompensationMm = clamp2(initialNutCompensationMm, bounds.nutMinMm, bounds.nutMaxMm);
  let saddleCompensationMm = clamp2(initialSaddleCompensationMm, bounds.saddleMinMm, bounds.saddleMaxMm);
  for (let iteration = 0;iteration < 12; iteration += 1) {
    nutCompensationMm = minimizeOneAxis({
      minimumMm: bounds.nutMinMm,
      maximumMm: bounds.nutMaxMm,
      evaluate: (candidateMm) => calculateGoreBookTotalAbsoluteLengthErrorMm(input, fretNumbers, candidateMm, saddleCompensationMm)
    });
    saddleCompensationMm = minimizeOneAxis({
      minimumMm: bounds.saddleMinMm,
      maximumMm: bounds.saddleMaxMm,
      evaluate: (candidateMm) => calculateGoreBookTotalAbsoluteLengthErrorMm(input, fretNumbers, nutCompensationMm, candidateMm)
    });
  }
  const states = fretNumbers.map((fretNumber) => calculateGoreBookFretState(input, fretNumber, nutCompensationMm, saddleCompensationMm));
  return {
    nutCompensationMm,
    saddleCompensationMm,
    fretNumbers,
    states,
    totalAbsoluteLengthErrorMm: states.reduce((total, state) => total + Math.abs(state.lengthErrorMm), 0),
    totalAbsoluteErrorCents: states.reduce((total, state) => total + Math.abs(state.centsError), 0)
  };
}
function minimizeOneAxis({
  minimumMm,
  maximumMm,
  evaluate
}) {
  const goldenRatio = (Math.sqrt(5) - 1) / 2;
  let leftMm = minimumMm;
  let rightMm = maximumMm;
  let firstMm = rightMm - goldenRatio * (rightMm - leftMm);
  let secondMm = leftMm + goldenRatio * (rightMm - leftMm);
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
function validateGoreBookInput(input) {
  requirePositive2(input.scaleLengthMm, "scaleLengthMm");
  requirePositive2(input.openFrequencyHz, "openFrequencyHz");
  requirePositive2(input.unitMassKgPerMeter, "unitMassKgPerMeter");
  requirePositive2(input.axialStiffnessN, "axialStiffnessN");
  requirePositive2(input.stretchableLengthMm, "stretchableLengthMm");
  requireNonNegative2(input.fingerRestDeflectionMm, "fingerRestDeflectionMm");
  if (!(input.playerPressureFactor > 0 && input.playerPressureFactor < 1)) {
    throw new RangeError("playerPressureFactor must be between 0 and 1");
  }
  if (input.actionByFretMm.length < 2) {
    throw new RangeError("actionByFretMm must include the nut and at least one fret");
  }
  input.actionByFretMm.forEach((clearance, fretNumber) => {
    requireNonNegative2(clearance, `actionByFretMm[${fretNumber}]`);
  });
}
function requireModelFret(input, fretNumber) {
  if (!Number.isInteger(fretNumber) || fretNumber < 1) {
    throw new RangeError("fretNumber must be a positive integer");
  }
  if (fretNumber >= input.actionByFretMm.length) {
    throw new RangeError("fretNumber is outside actionByFretMm");
  }
}
function validateFretSelection(input, fretNumbers) {
  validateGoreBookInput(input);
  if (fretNumbers.length === 0) {
    throw new RangeError("fretNumbers must select at least one fret");
  }
  const seen = new Set;
  for (const fretNumber of fretNumbers) {
    requireModelFret(input, fretNumber);
    if (seen.has(fretNumber))
      throw new RangeError("fretNumbers must not repeat a fret");
    seen.add(fretNumber);
  }
}
function validateBounds2(bounds) {
  const values = [bounds.nutMinMm, bounds.nutMaxMm, bounds.saddleMinMm, bounds.saddleMaxMm];
  if (!values.every(Number.isFinite))
    throw new RangeError("bounds must be finite");
  if (bounds.nutMinMm > bounds.nutMaxMm)
    throw new RangeError("nut bounds are reversed");
  if (bounds.saddleMinMm > bounds.saddleMaxMm)
    throw new RangeError("saddle bounds are reversed");
}
function clamp2(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
function requirePositive2(value, name) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be positive`);
}
function requireNonNegative2(value, name) {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must not be negative`);
}

// numeric_validation.ts
function requireFinite2(value, name) {
  if (!Number.isFinite(value))
    throw new RangeError(`${name} must be finite`);
}
function requirePositive3(value, name) {
  requireFinite2(value, name);
  if (value <= 0)
    throw new RangeError(`${name} must be positive`);
}
function requirePositiveOrInfinity(value, name) {
  if (value !== Infinity)
    requirePositive3(value, name);
}
function requireNonNegative3(value, name) {
  requireFinite2(value, name);
  if (value < 0)
    throw new RangeError(`${name} must not be negative`);
}
function requirePositiveInteger2(value, name) {
  requirePositive3(value, name);
  if (!Number.isInteger(value))
    throw new RangeError(`${name} must be an integer`);
}
function requireNonNegativeInteger(value, name) {
  requireNonNegative3(value, name);
  if (!Number.isInteger(value))
    throw new RangeError(`${name} must be an integer`);
}
function requireUnitInterval(value, name) {
  requireFinite2(value, name);
  if (value < 0 || value > 1)
    throw new RangeError(`${name} must be between 0 and 1`);
}

// action_geometry.ts
var GORE_DEFAULT_CIRCULAR_RELIEF_WEIGHT = 0.5;
function calculateFretPositionMm(scaleLengthMm, fretNumber) {
  requirePositive3(scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(fretNumber, "fretNumber");
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}
function calculateTopOfStringClearanceMm(actionFromFretTopToStringBottomMm, stringDiameterMm) {
  requireNonNegative3(actionFromFretTopToStringBottomMm, "actionFromFretTopToStringBottomMm");
  requirePositive3(stringDiameterMm, "stringDiameterMm");
  return actionFromFretTopToStringBottomMm + stringDiameterMm;
}
function calculateRadiusArcHeightAboveChordMm({
  lateralPositionMm,
  firstLateralPositionMm,
  lastLateralPositionMm,
  radiusMm
}) {
  if (radiusMm === Infinity)
    return 0;
  requirePositive3(radiusMm, "radiusMm");
  const minimumMm = Math.min(firstLateralPositionMm, lastLateralPositionMm);
  const maximumMm = Math.max(firstLateralPositionMm, lastLateralPositionMm);
  if (lateralPositionMm < minimumMm || lateralPositionMm > maximumMm) {
    throw new RangeError("lateralPositionMm must lie between the outer strings");
  }
  return (lateralPositionMm - firstLateralPositionMm) * (lastLateralPositionMm - lateralPositionMm) / (2 * radiusMm);
}
function calculateActionFromTopOfStringEnvelopeMm({
  stringIndex,
  stringCount,
  stringDiameterMm,
  firstStringActionMm,
  firstStringDiameterMm,
  lastStringActionMm,
  lastStringDiameterMm,
  fingerboardRadiusMm,
  lateralPositionMm,
  firstLateralPositionMm,
  lastLateralPositionMm
}) {
  requireStringIndex(stringIndex, stringCount);
  const firstTopClearanceMm = calculateTopOfStringClearanceMm(firstStringActionMm, firstStringDiameterMm);
  const lastTopClearanceMm = calculateTopOfStringClearanceMm(lastStringActionMm, lastStringDiameterMm);
  const positionAcrossStrings = stringCount === 1 ? 0 : stringIndex / (stringCount - 1);
  const chordTopClearanceMm = interpolate(firstTopClearanceMm, lastTopClearanceMm, positionAcrossStrings);
  const radiusArcHeightMm = fingerboardRadiusMm !== undefined && lateralPositionMm !== undefined && firstLateralPositionMm !== undefined && lastLateralPositionMm !== undefined ? calculateRadiusArcHeightAboveChordMm({
    lateralPositionMm,
    firstLateralPositionMm,
    lastLateralPositionMm,
    radiusMm: fingerboardRadiusMm
  }) : 0;
  const actionMm = chordTopClearanceMm + radiusArcHeightMm - stringDiameterMm;
  requireNonNegative3(actionMm, "derived action");
  return actionMm;
}
function calculateReliefBelowReferenceMm(measurement, fretNumber) {
  validateReliefMeasurement(measurement);
  requireNonNegativeInteger(fretNumber, "fretNumber");
  if (fretNumber <= measurement.capoFretNumber || fretNumber >= measurement.heldFretNumber)
    return 0;
  return calculateGoreReliefBelowReferenceMm(measurement, fretNumber);
}
function calculateCircularReliefBelowReferenceMm(measurement, fretNumber) {
  validateReliefEvaluation(measurement, fretNumber);
  if (isOutsideReliefSpan(measurement, fretNumber) || measurement.reliefMm === 0) {
    return 0;
  }
  if (fretNumber === measurement.reliefFretNumber)
    return measurement.reliefMm;
  const positions = calculateReliefPositions(measurement, fretNumber);
  const chordLengthMm = positions.heldMm - positions.capoMm;
  const beforeMeasurementMm = positions.reliefMm - positions.capoMm;
  const afterMeasurementMm = positions.heldMm - positions.reliefMm;
  const radiusMm = 0.5 * (beforeMeasurementMm * afterMeasurementMm / measurement.reliefMm + measurement.reliefMm);
  const localPositionMm = positions.currentMm - positions.capoMm;
  const firstRadicand = 4 * radiusMm ** 2 - chordLengthMm ** 2 - 4 * localPositionMm ** 2 + 4 * chordLengthMm * localPositionMm;
  const secondRadicand = radiusMm ** 2 - 0.25 * chordLengthMm ** 2;
  return 0.5 * Math.sqrt(Math.max(0, firstRadicand)) - Math.sqrt(Math.max(0, secondRadicand));
}
function calculateEllipticalReliefBelowReferenceMm(measurement, fretNumber) {
  validateReliefEvaluation(measurement, fretNumber);
  if (isOutsideReliefSpan(measurement, fretNumber) || measurement.reliefMm === 0) {
    return 0;
  }
  if (fretNumber === measurement.reliefFretNumber)
    return measurement.reliefMm;
  const positions = calculateReliefPositions(measurement, fretNumber);
  const semiMajorAxisMm = positions.heldMm;
  const measuredShape = calculateEllipticalReliefShape(positions.reliefMm, semiMajorAxisMm);
  const semiMinorAxisMm = measurement.reliefMm / measuredShape;
  return semiMinorAxisMm * calculateEllipticalReliefShape(positions.currentMm, semiMajorAxisMm);
}
function calculateGoreReliefBelowReferenceMm(measurement, fretNumber, circularWeight = GORE_DEFAULT_CIRCULAR_RELIEF_WEIGHT) {
  validateReliefEvaluation(measurement, fretNumber);
  requireUnitInterval(circularWeight, "circularWeight");
  if (isOutsideReliefSpan(measurement, fretNumber))
    return 0;
  if (fretNumber === measurement.reliefFretNumber)
    return measurement.reliefMm;
  const circularReliefMm = calculateCircularReliefBelowReferenceMm(measurement, fretNumber);
  const ellipticalReliefMm = calculateEllipticalReliefBelowReferenceMm(measurement, fretNumber);
  return circularWeight * circularReliefMm + (1 - circularWeight) * ellipticalReliefMm;
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
function calibrateActionProfileFromSparseMeasurements(profile, measurements) {
  if (profile.length === 0) {
    if (measurements.length > 0) {
      throw new RangeError("measurements require a non-empty action profile");
    }
    return [];
  }
  const sortedMeasurements = validateAndSortSparseMeasurements(profile, measurements);
  if (sortedMeasurements.length === 0)
    return profile.map(copyActionPoint);
  const correctionAnchors = createSparseCorrectionAnchors(profile, sortedMeasurements);
  return profile.map((point) => applySparseCorrection(point, correctionAnchors));
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
  requireNonNegative3(clearanceAboveFretMm, `clearance at fret ${fretNumber}`);
  return {
    fretNumber,
    positionMm,
    fretSurfaceHeightMm,
    openStringHeightMm,
    clearanceAboveFretMm
  };
}
function validateAndSortSparseMeasurements(profile, measurements) {
  const pointsByFret = new Map(profile.map((point) => [point.fretNumber, point]));
  const seenFrets = new Set;
  const sortedMeasurements = measurements.map((measurement) => {
    requireNonNegativeInteger(measurement.fretNumber, "measurement fretNumber");
    requireNonNegative3(measurement.clearanceAboveFretMm, "measurement clearanceAboveFretMm");
    if (!pointsByFret.has(measurement.fretNumber)) {
      throw new RangeError("measurement fretNumber must be in the action profile");
    }
    if (seenFrets.has(measurement.fretNumber)) {
      throw new RangeError("measurement fretNumber must be unique");
    }
    seenFrets.add(measurement.fretNumber);
    return { ...measurement };
  });
  return sortedMeasurements.sort((left, right) => left.fretNumber - right.fretNumber);
}
function createSparseCorrectionAnchors(profile, measurements) {
  const pointsByFret = new Map(profile.map((point) => [point.fretNumber, point]));
  const measurementAnchors = measurements.map((measurement) => {
    const point = pointsByFret.get(measurement.fretNumber);
    return {
      positionMm: point.positionMm,
      correctionMm: measurement.clearanceAboveFretMm - point.clearanceAboveFretMm
    };
  });
  return includeBookBoundaryAnchors(profile, measurementAnchors);
}
function includeBookBoundaryAnchors(profile, measurementAnchors) {
  const firstPoint = profile[0];
  const lastPoint = profile[profile.length - 1];
  const anchors = [...measurementAnchors];
  if (anchors[0].positionMm > firstPoint.positionMm) {
    anchors.unshift({ positionMm: firstPoint.positionMm, correctionMm: 0 });
  }
  if (anchors[anchors.length - 1].positionMm < lastPoint.positionMm) {
    anchors.push({ positionMm: lastPoint.positionMm, correctionMm: 0 });
  }
  return anchors;
}
function applySparseCorrection(point, anchors) {
  const correctionMm = interpolateCorrectionAtPosition(point.positionMm, anchors);
  const clearanceAboveFretMm = point.clearanceAboveFretMm + correctionMm;
  requireNonNegative3(clearanceAboveFretMm, `clearance at fret ${point.fretNumber}`);
  return {
    ...point,
    openStringHeightMm: point.openStringHeightMm + correctionMm,
    clearanceAboveFretMm
  };
}
function interpolateCorrectionAtPosition(positionMm, anchors) {
  const exactAnchor = anchors.find((anchor) => anchor.positionMm === positionMm);
  if (exactAnchor)
    return exactAnchor.correctionMm;
  const upperIndex = anchors.findIndex((anchor) => anchor.positionMm > positionMm);
  if (upperIndex <= 0)
    return anchors[0].correctionMm;
  const lowerAnchor = anchors[upperIndex - 1];
  const upperAnchor = anchors[upperIndex];
  const progress = (positionMm - lowerAnchor.positionMm) / (upperAnchor.positionMm - lowerAnchor.positionMm);
  return interpolate(lowerAnchor.correctionMm, upperAnchor.correctionMm, progress);
}
function copyActionPoint(point) {
  return { ...point };
}
function validateReliefMeasurement(measurement) {
  requirePositive3(measurement.scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(measurement.capoFretNumber, "capoFretNumber");
  requirePositiveInteger2(measurement.heldFretNumber, "heldFretNumber");
  requirePositiveInteger2(measurement.reliefFretNumber, "reliefFretNumber");
  requireNonNegative3(measurement.reliefMm, "reliefMm");
  if (measurement.reliefFretNumber <= measurement.capoFretNumber) {
    throw new RangeError("reliefFretNumber must be after capoFretNumber");
  }
  if (measurement.reliefFretNumber >= measurement.heldFretNumber) {
    throw new RangeError("reliefFretNumber must be before heldFretNumber");
  }
}
function validateReliefEvaluation(measurement, fretNumber) {
  validateReliefMeasurement(measurement);
  requireNonNegativeInteger(fretNumber, "fretNumber");
}
function isOutsideReliefSpan(measurement, fretNumber) {
  return fretNumber <= measurement.capoFretNumber || fretNumber >= measurement.heldFretNumber;
}
function calculateReliefPositions(measurement, fretNumber) {
  return {
    currentMm: calculateFretPositionMm(measurement.scaleLengthMm, fretNumber),
    capoMm: calculateFretPositionMm(measurement.scaleLengthMm, measurement.capoFretNumber),
    reliefMm: calculateFretPositionMm(measurement.scaleLengthMm, measurement.reliefFretNumber),
    heldMm: calculateFretPositionMm(measurement.scaleLengthMm, measurement.heldFretNumber)
  };
}
function calculateEllipticalReliefShape(positionMm, semiMajorAxisMm) {
  const centeredPosition = (positionMm - semiMajorAxisMm) / semiMajorAxisMm;
  return Math.sqrt(Math.max(0, 1 - centeredPosition ** 2)) - positionMm / semiMajorAxisMm;
}
function validateBenchActionMeasurements(measurements) {
  validateReliefMeasurement(measurements);
  requirePositiveInteger2(measurements.actionMeasurementFretNumber, "actionMeasurementFretNumber");
  requireNonNegative3(measurements.actionAtMeasurementWithCapoMm, "actionAtMeasurementWithCapoMm");
  requireNonNegative3(measurements.nutActionAtFirstFretMm, "nutActionAtFirstFretMm");
  if (measurements.capoFretNumber !== 1) {
    throw new RangeError("capoFretNumber must be 1 for bench action geometry");
  }
  if (measurements.actionMeasurementFretNumber <= measurements.capoFretNumber) {
    throw new RangeError("actionMeasurementFretNumber must be after capoFretNumber");
  }
  if (measurements.actionMeasurementFretNumber >= measurements.heldFretNumber) {
    throw new RangeError("actionMeasurementFretNumber must be before heldFretNumber");
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

// setup_action_profile.ts
var DEFAULT_STRING_SPACING_MM = 7.2;
function calculateRadiusDropMm(radiusMm, lateralOffsetMm) {
  requireFinite2(lateralOffsetMm, "lateralOffsetMm");
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
  requireNonNegativeInteger(stringIndex, "stringIndex");
  requirePositiveInteger2(stringCount, "stringCount");
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
  requireFinite2(stringTopHeightMm, "stringTopHeightMm");
  requirePositive3(stringDiameterMm, "stringDiameterMm");
  return stringTopHeightMm - stringDiameterMm + calculateRadiusDropMm(fingerboardRadiusMm, lateralPositionMm);
}
function calculateBenchActionProfile({
  string,
  sharedSetup,
  scaleLengthMm
}) {
  const baselineRadiusAwareProfile = calculateAnchoredActionProfile({
    sharedSetup,
    scaleLengthMm,
    anchors: calculateStringActionAnchorsMm({
      string,
      sharedSetup,
      scaleLengthMm,
      radiusAware: true
    })
  });
  const baselineChordOnlyProfile = calculateAnchoredActionProfile({
    sharedSetup,
    scaleLengthMm,
    anchors: calculateStringActionAnchorsMm({
      string,
      sharedSetup,
      scaleLengthMm,
      radiusAware: false
    })
  });
  const radiusAwareProfile = calibrateActionProfileFromSparseMeasurements(baselineRadiusAwareProfile, string.actionMeasurements ?? []);
  const chordOnlyProfile = applyActionCorrections({
    baselineProfile: baselineChordOnlyProfile,
    sourceProfile: baselineRadiusAwareProfile,
    calibratedSourceProfile: radiusAwareProfile
  });
  return createActionPoints({
    string,
    sharedSetup,
    scaleLengthMm,
    radiusAwareProfile,
    chordOnlyProfile
  });
}
function calculateStringActionAnchorsMm({
  string,
  sharedSetup,
  scaleLengthMm,
  radiusAware
}) {
  return {
    actionAtMeasurementWithCapoMm: calculateStringActionAnchorMm({
      string,
      sharedSetup,
      scaleLengthMm,
      outerActionPair: sharedSetup.benchActionTargets.actionAtMeasurementWithCapoMm,
      anchorFretNumber: sharedSetup.benchActionTargets.actionMeasurementFretNumber,
      radiusAware
    }),
    nutActionAtFirstFretMm: calculateStringActionAnchorMm({
      string,
      sharedSetup,
      scaleLengthMm,
      outerActionPair: sharedSetup.benchActionTargets.nutActionAtFirstFretMm,
      anchorFretNumber: 1,
      radiusAware
    })
  };
}
function calculateStringActionAnchorMm({
  string,
  sharedSetup,
  scaleLengthMm,
  outerActionPair,
  anchorFretNumber,
  radiusAware
}) {
  const firstString = sharedSetup.strings[0];
  const lastString = sharedSetup.strings[sharedSetup.strings.length - 1];
  const stringCount = sharedSetup.strings.length;
  const radiusArguments = radiusAware ? createRadiusArguments({ string, sharedSetup, scaleLengthMm, anchorFretNumber }) : {};
  return calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: string.stringIndex,
    stringCount,
    stringDiameterMm: string.gaugeMm,
    firstStringActionMm: outerActionPair.firstStringMm,
    firstStringDiameterMm: firstString.gaugeMm,
    lastStringActionMm: outerActionPair.lastStringMm,
    lastStringDiameterMm: lastString.gaugeMm,
    ...radiusArguments
  });
}
function createRadiusArguments({
  string,
  sharedSetup,
  scaleLengthMm,
  anchorFretNumber
}) {
  const stringCount = sharedSetup.strings.length;
  return {
    fingerboardRadiusMm: calculateRadiusAtFretMm({
      radiusProfile: sharedSetup.radiusProfile,
      normalizedFretPosition: calculateFretPositionMm(scaleLengthMm, anchorFretNumber) / scaleLengthMm
    }),
    lateralPositionMm: calculateStringLateralPositionMm({
      stringIndex: string.stringIndex,
      stringCount,
      stringSpacingMm: sharedSetup.stringSpacingMm
    }),
    firstLateralPositionMm: calculateStringLateralPositionMm({
      stringIndex: 0,
      stringCount,
      stringSpacingMm: sharedSetup.stringSpacingMm
    }),
    lastLateralPositionMm: calculateStringLateralPositionMm({
      stringIndex: stringCount - 1,
      stringCount,
      stringSpacingMm: sharedSetup.stringSpacingMm
    })
  };
}
function calculateAnchoredActionProfile({
  sharedSetup,
  scaleLengthMm,
  anchors
}) {
  return calculateActionProfileFromBenchMeasurements({
    scaleLengthMm,
    capoFretNumber: sharedSetup.benchActionTargets.capoFretNumber,
    heldFretNumber: sharedSetup.fretCount,
    reliefFretNumber: sharedSetup.reliefPeakFret,
    reliefMm: sharedSetup.reliefAmountMm,
    actionMeasurementFretNumber: sharedSetup.benchActionTargets.actionMeasurementFretNumber,
    actionAtMeasurementWithCapoMm: anchors.actionAtMeasurementWithCapoMm,
    nutActionAtFirstFretMm: anchors.nutActionAtFirstFretMm
  });
}
function createActionPoints({
  string,
  sharedSetup,
  scaleLengthMm,
  radiusAwareProfile,
  chordOnlyProfile
}) {
  const lateralPositionMm = calculateStringLateralPositionMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringSpacingMm: sharedSetup.stringSpacingMm
  });
  return radiusAwareProfile.map((point, pointIndex) => {
    const normalizedPosition = point.positionMm / scaleLengthMm;
    const fingerboardRadiusMm = calculateRadiusAtFretMm({
      radiusProfile: sharedSetup.radiusProfile,
      normalizedFretPosition: normalizedPosition
    });
    const baseClearanceAboveFretMm = chordOnlyProfile[pointIndex].clearanceAboveFretMm;
    return {
      fretNumber: point.fretNumber,
      positionMm: point.positionMm,
      normalizedPosition,
      clearanceAboveFretMm: point.clearanceAboveFretMm,
      baseClearanceAboveFretMm,
      radiusClearanceAdjustmentMm: point.clearanceAboveFretMm - baseClearanceAboveFretMm,
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
function applyActionCorrections({
  baselineProfile,
  sourceProfile,
  calibratedSourceProfile
}) {
  return baselineProfile.map((point, pointIndex) => {
    const correctionMm = calibratedSourceProfile[pointIndex].clearanceAboveFretMm - sourceProfile[pointIndex].clearanceAboveFretMm;
    return {
      ...point,
      openStringHeightMm: point.openStringHeightMm + correctionMm,
      clearanceAboveFretMm: point.clearanceAboveFretMm + correctionMm
    };
  });
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
    id: "electric",
    label: "Electric guitar",
    description: "Six single courses · D'Addario EXL110 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["High E", "B", "G", "D", "A", "Low E"],
      midiNotes: STEEL_STRING_NOTES,
      gaugesIn: [0.01, 0.013, 0.017, 0.026, 0.036, 0.046],
      woundFromIndex: 3
    }),
    scaleLengthMm: 647.7,
    outerStringSpreadMm: 35,
    fretCount: 22,
    radius: { kind: "compound", nutRadiusMm: 241.3, bridgeRadiusMm: 355.6 },
    reliefMm: 0.2,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.6, lastStringMm: 2 },
    nutActionAtFret1Mm: { firstStringMm: 0.38, lastStringMm: 0.48 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EXL110" }
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
// setup_string_mechanics.ts
var MILLIMETERS_PER_METER3 = 1000;
var MILLIMETERS_PER_INCH = 25.4;
var DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER = 7850;
var DEFAULT_STEEL_YOUNG_MODULUS_PA = 195000000000;
var DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER = 1140;
var DEFAULT_NYLON_YOUNG_MODULUS_PA = 3000000000;
function estimateStringMechanicalProperties({
  gaugeMm,
  construction = "plain",
  materialFamily = "steel",
  densityKgPerCubicMeter,
  youngModulusPa
}) {
  requirePositive3(gaugeMm, "gaugeMm");
  requireStringConstruction(construction);
  const materialDefaults = materialDefaultsForFamily(materialFamily);
  const outsideAreaM2 = calculateCircularAreaM2(gaugeMm);
  const axialDiameterMm = estimateAxialDiameterMm({
    outsideDiameterMm: gaugeMm,
    construction,
    materialFamily
  });
  return {
    unitMassKgPerMeter: (densityKgPerCubicMeter ?? materialDefaults.densityKgPerCubicMeter) * outsideAreaM2 * unitMassFillFactorForConstruction(construction),
    axialStiffnessN: (youngModulusPa ?? materialDefaults.youngModulusPa) * calculateCircularAreaM2(axialDiameterMm)
  };
}
function materialDefaultsForFamily(materialFamily) {
  if (materialFamily === "nylon") {
    return {
      densityKgPerCubicMeter: DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER,
      youngModulusPa: DEFAULT_NYLON_YOUNG_MODULUS_PA
    };
  }
  return {
    densityKgPerCubicMeter: DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER,
    youngModulusPa: DEFAULT_STEEL_YOUNG_MODULUS_PA
  };
}
function calculateCircularAreaM2(diameterMm) {
  const radiusM = diameterMm / 2 / MILLIMETERS_PER_METER3;
  return Math.PI * radiusM ** 2;
}
function unitMassFillFactorForConstruction(construction) {
  return construction === "wound" ? 0.72 : 1;
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
function requireStringConstruction(construction) {
  if (construction !== "plain" && construction !== "wound") {
    throw new RangeError("construction must be plain or wound");
  }
}
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
    const { tensionSource: unusedTensionSource, ...withoutTensionSource } = string;
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

// setup_factory.ts
var DEFAULT_EXTRA_STRING_LENGTH_MM = 120;
var DEFAULT_FINGER_DEFLECTION_MM = 0.5;
var DEFAULT_PLAYING_PRESSURE = 0.75;
var DEFAULT_FAN_NEUTRAL_FRET = 7;
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
    const {
      tensionSource: unusedTensionSource,
      tensionSequenceNumber: unusedSequence,
      ...editableString
    } = sourceString;
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

// setup_model.ts
var DEFAULT_FINGER_DEFLECTION_MM2 = 0.5;
var DEFAULT_PLAYING_PRESSURE2 = 0.75;
function calculateFretPositionMm2(scaleLengthMm, fretNumber) {
  requirePositive3(scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(fretNumber, "fretNumber");
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}
function calculateFrequencyHzFromMidi(midiNote) {
  requireFinite2(midiNote, "midiNote");
  return 440 * 2 ** ((midiNote - 69) / 12);
}
function calculateMaximumAbsoluteCentsError(centsErrors) {
  centsErrors.forEach((error, index) => requireFinite2(error, `centsErrors[${index}]`));
  return centsErrors.reduce((maximum, error) => Math.max(maximum, Math.abs(error)), 0);
}
function calculateFrettedPitchErrorCents({
  string,
  fretNumber,
  actionByFret,
  nutCompensationMm,
  saddleCompensationMm,
  fingerDeflectionMm = DEFAULT_FINGER_DEFLECTION_MM2,
  playingPressure = DEFAULT_PLAYING_PRESSURE2
}) {
  requirePositiveInteger2(fretNumber, "fretNumber");
  requireFinite2(nutCompensationMm, "nutCompensationMm");
  requireFinite2(saddleCompensationMm, "saddleCompensationMm");
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
  fingerDeflectionMm = DEFAULT_FINGER_DEFLECTION_MM2,
  playingPressure = DEFAULT_PLAYING_PRESSURE2
}) {
  requirePositiveInteger2(lastFret, "lastFret");
  if (lastFret >= actionByFret.length) {
    throw new RangeError("lastFret is outside actionByFret");
  }
  const fretNumbers = Array.from({ length: lastFret }, (_, index) => index + 1);
  const optimized = optimizeGoreBookCompensation({
    input: {
      scaleLengthMm: string.scaleLengthMm,
      openFrequencyHz: string.openFrequencyHz,
      actionByFretMm: actionByFret.map((fret) => fret.clearanceAboveFretMm),
      unitMassKgPerMeter: string.unitMassKgPerMeter,
      axialStiffnessN: string.axialStiffnessN,
      stretchableLengthMm: string.scaleLengthMm + string.extraStringLengthMm,
      fingerRestDeflectionMm: fingerDeflectionMm,
      playerPressureFactor: playingPressure
    },
    fretNumbers,
    initialNutCompensationMm,
    initialSaddleCompensationMm,
    bounds
  });
  return {
    nutCompensationMm: optimized.nutCompensationMm,
    saddleCompensationMm: optimized.saddleCompensationMm,
    centsErrorByFret: optimized.states.map((state) => state.centsError),
    totalAbsoluteErrorCents: optimized.totalAbsoluteErrorCents,
    lengthErrorByFretMm: optimized.states.map((state) => state.lengthErrorMm),
    totalAbsoluteLengthErrorMm: optimized.totalAbsoluteLengthErrorMm
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
function createGoreOptimizationRequest({
  string,
  sharedSetup,
  scaleLengthMm,
  actionByFret
}) {
  return {
    string: {
      ...string,
      scaleLengthMm,
      openFrequencyHz: calculateFrequencyHzFromMidi(string.openMidiNote),
      extraStringLengthMm: string.extraStringLengthMm ?? sharedSetup.extraStringLengthMm
    },
    actionByFret,
    lastFret: sharedSetup.fretCount,
    fingerDeflectionMm: sharedSetup.fingerDeflectionMm,
    playingPressure: sharedSetup.playingPressure
  };
}
function calculateSetupForString({
  string,
  sharedSetup
}) {
  const scaleLengthMm = string.scaleLengthMm ?? sharedSetup.scaleLengthMm;
  const actionByFret = calculateBenchActionProfile({ string, sharedSetup, scaleLengthMm });
  const intonation = optimizeNutAndSaddleCompensation(createGoreOptimizationRequest({ string, sharedSetup, scaleLengthMm, actionByFret }));
  return { string, actionByFret, intonation };
}
var EMPIRICAL_REFERENCE_SEARCH = {
  bounds: { nutMinimumMm: -5, nutMaximumMm: 5, saddleMinimumMm: -5, saddleMaximumMm: 5 },
  divisionsPerAxis: 40,
  refinementPasses: 6
};
function optimizeEmpiricalAdjustmentForString({
  string,
  sharedSetup,
  readings,
  search = EMPIRICAL_REFERENCE_SEARCH
}) {
  for (const reading of readings) {
    if (Number.isInteger(reading.fretNumber) && reading.fretNumber > sharedSetup.fretCount) {
      throw new RangeError(`reading at fret ${reading.fretNumber} is beyond the instrument's last fret (${sharedSetup.fretCount})`);
    }
  }
  return optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: string.scaleLengthMm ?? sharedSetup.scaleLengthMm,
    readings,
    search
  });
}
function calculateCompensationComparisonForString({
  string,
  sharedSetup
}) {
  const scaleLengthMm = string.scaleLengthMm ?? sharedSetup.scaleLengthMm;
  const actionByFret = calculateBenchActionProfile({ string, sharedSetup, scaleLengthMm });
  const request = createGoreOptimizationRequest({
    string,
    sharedSetup,
    scaleLengthMm,
    actionByFret
  });
  return {
    actionByFret,
    nutAndSaddle: optimizeNutAndSaddleCompensation(request),
    saddleOnly: optimizeNutAndSaddleCompensation({
      ...request,
      initialNutCompensationMm: 0,
      bounds: { ...GORE_REFERENCE_BOUNDS, nutMinMm: 0, nutMaxMm: 0 }
    })
  };
}
function calculateSetup(sharedSetup) {
  return {
    strings: sharedSetup.strings.map((string) => calculateSetupForString({
      string,
      sharedSetup
    }))
  };
}
export {
  readingsFromDenseErrors,
  optimizeNutAndSaddleCompensation,
  optimizeGoreCompensation,
  optimizeGoreBookCompensation,
  optimizeEmpiricalAdjustmentFromReadings,
  optimizeEmpiricalAdjustmentForString,
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
  calculateGoreBookFretState,
  calculateFrettedPitchErrorCents,
  calculateFretPositionMm2 as calculateFretPositionMm,
  calculateFrequencyHzFromMidi,
  calculateCompensationComparisonForString,
  calculateClearanceFromStringTopMm,
  applyTensionCatalogToSetup,
  INSTRUMENT_PROFILES,
  GORE_REFERENCE_BOUNDS,
  GORE_BOOK_REFERENCE_BOUNDS,
  EMPIRICAL_REFERENCE_SEARCH
};
