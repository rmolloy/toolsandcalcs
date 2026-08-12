/**
 * Direct Gore-method compensation model.
 *
 * The supplied Python implementation is the behavioral reference. This
 * module keeps its measured action profile, unit-mass/stiffness inputs, path
 * equations, signed compensation bounds, and cents objective explicit.
 */

const MILLIMETERS_PER_METER = 1000;

export interface GoreCompensationInput {
  scaleLengthMm: number;
  openFrequencyHz: number;
  actionByFretMm: number[];
  unitMassKgPerMeter: number;
  axialStiffnessN: number;
  extraStringLengthMm: number;
  fingerDeflectionMm: number;
  playingPressure: number;
}

export interface GoreCompensationBounds {
  nutMinMm: number;
  nutMaxMm: number;
  saddleMinMm: number;
  saddleMaxMm: number;
}

export interface GoreCompensationResult {
  nutCompensationMm: number;
  saddleCompensationMm: number;
  centsErrorByFret: number[];
  totalAbsoluteErrorCents: number;
}

export const GORE_REFERENCE_BOUNDS: GoreCompensationBounds = {
  nutMinMm: -5,
  nutMaxMm: 5,
  saddleMinMm: -5,
  saddleMaxMm: 5,
};

export function calculateGoreCentsError(
  input: GoreCompensationInput,
  fretNumber: number,
  nutCompensationMm: number,
  saddleCompensationMm: number,
): number {
  validateGoreInput(input);
  requirePositiveInteger(fretNumber, "fretNumber");
  requireFretExists(input.actionByFretMm, fretNumber);
  requireFinite(nutCompensationMm, "nutCompensationMm");
  requireFinite(saddleCompensationMm, "saddleCompensationMm");

  const currentFretPositionMm = calculateGoreFretPositionMm(input.scaleLengthMm, fretNumber);
  const previousFretNumber = fretNumber - 1;
  const previousFretPositionMm = calculateGoreFretPositionMm(
    input.scaleLengthMm,
    previousFretNumber,
  );
  const currentActionMm = input.actionByFretMm[fretNumber];
  const previousActionMm = input.actionByFretMm[previousFretNumber];

  const spacingMm = fretNumber === 1
    ? currentFretPositionMm - previousFretPositionMm - nutCompensationMm
    : currentFretPositionMm - previousFretPositionMm;
  const previousStringLengthMm = fretNumber === 1
    ? 0
    : Math.hypot(previousFretPositionMm, previousActionMm) - nutCompensationMm;
  const firstFretPositionMm = calculateGoreFretPositionMm(input.scaleLengthMm, 1);
  const fingerDeflectionAtFretMm = input.fingerDeflectionMm
    * input.playingPressure
    * spacingMm
    / firstFretPositionMm;
  const fingerContactLengthMm = Math.hypot(
    spacingMm,
    currentActionMm - previousActionMm,
  ) / 2;
  const frettedSegmentLengthMm = 2 * Math.hypot(
    fingerDeflectionAtFretMm,
    fingerContactLengthMm,
  );
  const vibratingSegmentLengthMm = Math.hypot(
    input.scaleLengthMm - currentFretPositionMm,
    currentActionMm,
  ) + saddleCompensationMm;
  const totalStringPathMm = previousStringLengthMm
    + frettedSegmentLengthMm
    + vibratingSegmentLengthMm;
  const stretchBeyondReferenceMm = totalStringPathMm
    - input.scaleLengthMm
    + nutCompensationMm
    - saddleCompensationMm;
  const compensatedSpeakingLengthM = (
    input.scaleLengthMm - nutCompensationMm + saddleCompensationMm
  ) / MILLIMETERS_PER_METER;
  const openTensionN = 4 * input.unitMassKgPerMeter
    * compensatedSpeakingLengthM ** 2
    * input.openFrequencyHz ** 2;
  const frettedTensionN = openTensionN
    + input.axialStiffnessN
      * stretchBeyondReferenceMm
      / (input.scaleLengthMm + input.extraStringLengthMm);
  if (frettedTensionN <= 0) throw new RangeError("fretted string tension must be positive");
  const frettedFrequencyHz = Math.sqrt(frettedTensionN / input.unitMassKgPerMeter)
    / (2 * vibratingSegmentLengthMm / MILLIMETERS_PER_METER);
  const targetFrequencyHz = input.openFrequencyHz * 2 ** (fretNumber / 12);
  return 1200 * Math.log2(frettedFrequencyHz / targetFrequencyHz);
}

export function calculateGoreCentsErrors(
  input: GoreCompensationInput,
  nutCompensationMm: number,
  saddleCompensationMm: number,
): number[] {
  validateGoreInput(input);
  return input.actionByFretMm.map((_, fretNumber) => fretNumber === 0
    ? 0
    : calculateGoreCentsError(
      input,
      fretNumber,
      nutCompensationMm,
      saddleCompensationMm,
    ));
}

export function calculateGoreTotalAbsoluteErrorCents(
  input: GoreCompensationInput,
  nutCompensationMm: number,
  saddleCompensationMm: number,
): number {
  return calculateGoreCentsErrors(input, nutCompensationMm, saddleCompensationMm)
    .reduce((total, error) => total + Math.abs(error), 0);
}

/**
 * Deterministic two-variable bounded minimizer for the Gore objective.
 *
 * The Python reference delegates this two-variable objective to SLSQP. The
 * objective and bounds remain identical here; alternating bounded golden
 * searches give a stable browser implementation while parity tests constrain
 * its result against the reference optimum.
 */
export function optimizeGoreCompensation({
  input,
  initialNutCompensationMm = 0.56,
  initialSaddleCompensationMm = 0.75,
  bounds = GORE_REFERENCE_BOUNDS,
}: {
  input: GoreCompensationInput;
  initialNutCompensationMm?: number;
  initialSaddleCompensationMm?: number;
  bounds?: GoreCompensationBounds;
}): GoreCompensationResult {
  validateBounds(bounds);
  validateGoreInput(input);

  let best = {
    nutCompensationMm: clamp(initialNutCompensationMm, bounds.nutMinMm, bounds.nutMaxMm),
    saddleCompensationMm: clamp(
      initialSaddleCompensationMm,
      bounds.saddleMinMm,
      bounds.saddleMaxMm,
    ),
  };
  let bestError = calculateGoreTotalAbsoluteErrorCents(
    input,
    best.nutCompensationMm,
    best.saddleCompensationMm,
  );

  for (let iteration = 0; iteration < 12; iteration += 1) {
    best.nutCompensationMm = minimizeOneCompensationAxis({
      minimumMm: bounds.nutMinMm,
      maximumMm: bounds.nutMaxMm,
      fixedCompensationMm: best.saddleCompensationMm,
      varyNut: true,
      input,
    });
    best.saddleCompensationMm = minimizeOneCompensationAxis({
      minimumMm: bounds.saddleMinMm,
      maximumMm: bounds.saddleMaxMm,
      fixedCompensationMm: best.nutCompensationMm,
      varyNut: false,
      input,
    });
    bestError = calculateGoreTotalAbsoluteErrorCents(
      input,
      best.nutCompensationMm,
      best.saddleCompensationMm,
    );
  }

  return {
    ...best,
    centsErrorByFret: calculateGoreCentsErrors(
      input,
      best.nutCompensationMm,
      best.saddleCompensationMm,
    ),
    totalAbsoluteErrorCents: bestError,
  };
}

function minimizeOneCompensationAxis({
  minimumMm,
  maximumMm,
  fixedCompensationMm,
  varyNut,
  input,
}: {
  minimumMm: number;
  maximumMm: number;
  fixedCompensationMm: number;
  varyNut: boolean;
  input: GoreCompensationInput;
}): number {
  const goldenRatio = (Math.sqrt(5) - 1) / 2;
  let leftMm = minimumMm;
  let rightMm = maximumMm;
  let firstMm = rightMm - goldenRatio * (rightMm - leftMm);
  let secondMm = leftMm + goldenRatio * (rightMm - leftMm);
  const evaluate = (variableMm: number): number => varyNut
    ? calculateGoreTotalAbsoluteErrorCents(input, variableMm, fixedCompensationMm)
    : calculateGoreTotalAbsoluteErrorCents(input, fixedCompensationMm, variableMm);
  let firstError = evaluate(firstMm);
  let secondError = evaluate(secondMm);
  while (rightMm - leftMm > 1e-9) {
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

function calculateGoreFretPositionMm(scaleLengthMm: number, fretNumber: number): number {
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}

function validateGoreInput(input: GoreCompensationInput): void {
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

function requireFretExists(actionByFretMm: number[], fretNumber: number): void {
  if (fretNumber >= actionByFretMm.length) throw new RangeError("fretNumber is outside actionByFretMm");
}

function validateBounds(bounds: GoreCompensationBounds): void {
  requireFinite(bounds.nutMinMm, "bounds.nutMinMm");
  requireFinite(bounds.nutMaxMm, "bounds.nutMaxMm");
  requireFinite(bounds.saddleMinMm, "bounds.saddleMinMm");
  requireFinite(bounds.saddleMaxMm, "bounds.saddleMaxMm");
  if (bounds.nutMinMm > bounds.nutMaxMm) throw new RangeError("nut bounds are reversed");
  if (bounds.saddleMinMm > bounds.saddleMaxMm) throw new RangeError("saddle bounds are reversed");
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function requirePositive(value: number, name: string): void {
  requireFinite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

function requireNonNegative(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0) throw new RangeError(`${name} must be non-negative`);
}

function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer`);
}

function requireOpenUnitInterval(value: number, name: string): void {
  requireFinite(value, name);
  if (value <= 0 || value >= 1) throw new RangeError(`${name} must be between 0 and 1`);
}
