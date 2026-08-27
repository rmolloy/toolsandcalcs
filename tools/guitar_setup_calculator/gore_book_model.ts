/**
 * Literal implementation of the Gore physical compensation chain as recorded in
 * docs/understanding-intonation.md, equations 4.7-23 through 4.7-37.
 *
 * Coordinates: fret positions are laid out from the virtual zero-fret datum.
 * The path geometry works in nut-referenced coordinates (x'_k = x_k - x_N),
 * which is the reading that makes equation 4.7-36's geometric length
 * (L_c - x_s,n) self-consistent. Positive compensation is toward the tail.
 *
 * The optimizer minimizes the L1 sum of absolute stopped-length errors over
 * the selected frets (equation 4.7-37) - length domain, not cents domain.
 */

export interface GoreBookStringInput {
  scaleLengthMm: number;
  openFrequencyHz: number;
  /** d_{s,n}: open-string clearance above fret n; index 0 is the nut datum. */
  actionByFretMm: readonly number[];
  unitMassKgPerMeter: number;
  /** k_s = EA, force-valued longitudinal unit stiffness (equation 4.7-12). */
  axialStiffnessN: number;
  /** L'_s: stretchable length, speaking length plus participating extra string. */
  stretchableLengthMm: number;
  /** g0: observed maximum finger deflection between nut and fret 1. */
  fingerRestDeflectionMm: number;
  /** F_p: player pressure factor, an open unit-interval heuristic. */
  playerPressureFactor: number;
}

export interface GoreBookCompensationBounds {
  nutMinMm: number;
  nutMaxMm: number;
  saddleMinMm: number;
  saddleMaxMm: number;
}

export interface GoreBookFretState {
  fretNumber: number;
  frettedPathLengthMm: number;
  pathExtensionMm: number;
  addedTensionN: number;
  requiredStoppedLengthMm: number;
  geometricStoppedLengthMm: number;
  lengthErrorMm: number;
  centsError: number;
}

export interface GoreBookCompensationResult {
  nutCompensationMm: number;
  saddleCompensationMm: number;
  fretNumbers: readonly number[];
  states: readonly GoreBookFretState[];
  totalAbsoluteLengthErrorMm: number;
  totalAbsoluteErrorCents: number;
}

export const GORE_BOOK_REFERENCE_BOUNDS: GoreBookCompensationBounds = {
  nutMinMm: -5,
  nutMaxMm: 5,
  saddleMinMm: -5,
  saddleMaxMm: 5,
};

const MILLIMETERS_PER_METER = 1000;

function fretPositionFromZeroFretMm(scaleLengthMm: number, fretNumber: number): number {
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}

/** Compensated speaking length L_c = L - x_N + x_S (also 4.7-24's L_s). */
export function calculateGoreBookSpeakingLengthMm(
  scaleLengthMm: number,
  nutCompensationMm: number,
  saddleCompensationMm: number,
): number {
  const speakingLengthMm = scaleLengthMm - nutCompensationMm + saddleCompensationMm;
  if (!(speakingLengthMm > 0)) {
    throw new RangeError("compensated speaking length must be positive");
  }
  return speakingLengthMm;
}

/** Equations 4.7-23 and 4.7-25 through 4.7-30: the three-segment fretted path. */
export function calculateGoreBookFrettedPathMm(
  input: GoreBookStringInput,
  fretNumber: number,
  nutCompensationMm: number,
  saddleCompensationMm: number,
): number {
  validateGoreBookInput(input);
  requireModelFret(input, fretNumber);
  const speakingLengthMm = calculateGoreBookSpeakingLengthMm(
    input.scaleLengthMm,
    nutCompensationMm,
    saddleCompensationMm,
  );
  const nutReferencedPositionMm = (fret: number) => (fret === 0
    ? 0
    : fretPositionFromZeroFretMm(input.scaleLengthMm, fret) - nutCompensationMm);

  const previousFret = fretNumber - 1;
  const previousPositionMm = nutReferencedPositionMm(previousFret);
  const currentPositionMm = nutReferencedPositionMm(fretNumber);
  const previousClearanceMm = input.actionByFretMm[previousFret];
  const currentClearanceMm = input.actionByFretMm[fretNumber];

  // 4.7-25: nut to the previous support; zero when the previous support is the nut.
  const nutSegmentMm = fretNumber === 1
    ? 0
    : Math.hypot(previousPositionMm, previousClearanceMm);

  // 4.7-27 through 4.7-30: the finger segment between the adjacent supports.
  const spacingMm = currentPositionMm - previousPositionMm;
  const firstFretSpacingMm = nutReferencedPositionMm(1);
  const fingerDeflectionMm = input.fingerRestDeflectionMm
    * input.playerPressureFactor
    * (spacingMm / firstFretSpacingMm);
  const halfContactMm = 0.5 * Math.hypot(spacingMm, currentClearanceMm - previousClearanceMm);
  const fingerSegmentMm = 2 * Math.hypot(fingerDeflectionMm, halfContactMm);

  // 4.7-26: played fret to the compensated saddle.
  const saddleSegmentMm = Math.hypot(speakingLengthMm - currentPositionMm, currentClearanceMm);

  return nutSegmentMm + fingerSegmentMm + saddleSegmentMm;
}

/** Equations 4.7-24 and 4.7-31 through 4.7-36 for one fret. */
export function calculateGoreBookFretState(
  input: GoreBookStringInput,
  fretNumber: number,
  nutCompensationMm: number,
  saddleCompensationMm: number,
): GoreBookFretState {
  const speakingLengthMm = calculateGoreBookSpeakingLengthMm(
    input.scaleLengthMm,
    nutCompensationMm,
    saddleCompensationMm,
  );
  const frettedPathLengthMm = calculateGoreBookFrettedPathMm(
    input,
    fretNumber,
    nutCompensationMm,
    saddleCompensationMm,
  );
  const pathExtensionMm = frettedPathLengthMm - speakingLengthMm;

  const speakingLengthM = speakingLengthMm / MILLIMETERS_PER_METER;
  const openTensionN = 4 * input.unitMassKgPerMeter
    * speakingLengthM ** 2
    * input.openFrequencyHz ** 2;
  const addedTensionN = input.axialStiffnessN * pathExtensionMm / input.stretchableLengthMm;
  const frettedTensionN = openTensionN + addedTensionN;
  if (frettedTensionN <= 0) throw new RangeError("fretted string tension must be positive");

  const targetFrequencyHz = input.openFrequencyHz * 2 ** (fretNumber / 12);
  const requiredStoppedLengthMm = (1 / (2 * targetFrequencyHz))
    * Math.sqrt(frettedTensionN / input.unitMassKgPerMeter)
    * MILLIMETERS_PER_METER;
  const geometricStoppedLengthMm = speakingLengthMm
    - (fretPositionFromZeroFretMm(input.scaleLengthMm, fretNumber) - nutCompensationMm);
  const lengthErrorMm = requiredStoppedLengthMm - geometricStoppedLengthMm;

  return {
    fretNumber,
    frettedPathLengthMm,
    pathExtensionMm,
    addedTensionN,
    requiredStoppedLengthMm,
    geometricStoppedLengthMm,
    lengthErrorMm,
    centsError: 1200 * Math.log2(requiredStoppedLengthMm / geometricStoppedLengthMm),
  };
}

/** Equation 4.7-37 objective over the selected frets. */
export function calculateGoreBookTotalAbsoluteLengthErrorMm(
  input: GoreBookStringInput,
  fretNumbers: readonly number[],
  nutCompensationMm: number,
  saddleCompensationMm: number,
): number {
  validateFretSelection(input, fretNumbers);
  return fretNumbers.reduce((total, fretNumber) => total + Math.abs(
    calculateGoreBookFretState(input, fretNumber, nutCompensationMm, saddleCompensationMm)
      .lengthErrorMm,
  ), 0);
}

export function optimizeGoreBookCompensation({
  input,
  fretNumbers,
  initialNutCompensationMm = 0.56,
  initialSaddleCompensationMm = 0.75,
  bounds = GORE_BOOK_REFERENCE_BOUNDS,
}: {
  input: GoreBookStringInput;
  fretNumbers: readonly number[];
  initialNutCompensationMm?: number;
  initialSaddleCompensationMm?: number;
  bounds?: GoreBookCompensationBounds;
}): GoreBookCompensationResult {
  validateFretSelection(input, fretNumbers);
  validateBounds(bounds);
  let nutCompensationMm = clamp(initialNutCompensationMm, bounds.nutMinMm, bounds.nutMaxMm);
  let saddleCompensationMm = clamp(
    initialSaddleCompensationMm,
    bounds.saddleMinMm,
    bounds.saddleMaxMm,
  );
  for (let iteration = 0; iteration < 12; iteration += 1) {
    nutCompensationMm = minimizeOneAxis({
      minimumMm: bounds.nutMinMm,
      maximumMm: bounds.nutMaxMm,
      evaluate: (candidateMm) => calculateGoreBookTotalAbsoluteLengthErrorMm(
        input,
        fretNumbers,
        candidateMm,
        saddleCompensationMm,
      ),
    });
    saddleCompensationMm = minimizeOneAxis({
      minimumMm: bounds.saddleMinMm,
      maximumMm: bounds.saddleMaxMm,
      evaluate: (candidateMm) => calculateGoreBookTotalAbsoluteLengthErrorMm(
        input,
        fretNumbers,
        nutCompensationMm,
        candidateMm,
      ),
    });
  }
  const states = fretNumbers.map((fretNumber) => calculateGoreBookFretState(
    input,
    fretNumber,
    nutCompensationMm,
    saddleCompensationMm,
  ));
  return {
    nutCompensationMm,
    saddleCompensationMm,
    fretNumbers,
    states,
    totalAbsoluteLengthErrorMm: states.reduce(
      (total, state) => total + Math.abs(state.lengthErrorMm),
      0,
    ),
    totalAbsoluteErrorCents: states.reduce(
      (total, state) => total + Math.abs(state.centsError),
      0,
    ),
  };
}

function minimizeOneAxis({
  minimumMm,
  maximumMm,
  evaluate,
}: {
  minimumMm: number;
  maximumMm: number;
  evaluate: (candidateMm: number) => number;
}): number {
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

function validateGoreBookInput(input: GoreBookStringInput): void {
  requirePositive(input.scaleLengthMm, "scaleLengthMm");
  requirePositive(input.openFrequencyHz, "openFrequencyHz");
  requirePositive(input.unitMassKgPerMeter, "unitMassKgPerMeter");
  requirePositive(input.axialStiffnessN, "axialStiffnessN");
  requirePositive(input.stretchableLengthMm, "stretchableLengthMm");
  requireNonNegative(input.fingerRestDeflectionMm, "fingerRestDeflectionMm");
  if (!(input.playerPressureFactor > 0 && input.playerPressureFactor < 1)) {
    throw new RangeError("playerPressureFactor must be between 0 and 1");
  }
  if (input.actionByFretMm.length < 2) {
    throw new RangeError("actionByFretMm must include the nut and at least one fret");
  }
  input.actionByFretMm.forEach((clearance, fretNumber) => {
    requireNonNegative(clearance, `actionByFretMm[${fretNumber}]`);
  });
}

function requireModelFret(input: GoreBookStringInput, fretNumber: number): void {
  if (!Number.isInteger(fretNumber) || fretNumber < 1) {
    throw new RangeError("fretNumber must be a positive integer");
  }
  if (fretNumber >= input.actionByFretMm.length) {
    throw new RangeError("fretNumber is outside actionByFretMm");
  }
}

function validateFretSelection(
  input: GoreBookStringInput,
  fretNumbers: readonly number[],
): void {
  validateGoreBookInput(input);
  if (fretNumbers.length === 0) {
    throw new RangeError("fretNumbers must select at least one fret");
  }
  const seen = new Set<number>();
  for (const fretNumber of fretNumbers) {
    requireModelFret(input, fretNumber);
    if (seen.has(fretNumber)) throw new RangeError("fretNumbers must not repeat a fret");
    seen.add(fretNumber);
  }
}

function validateBounds(bounds: GoreBookCompensationBounds): void {
  const values = [bounds.nutMinMm, bounds.nutMaxMm, bounds.saddleMinMm, bounds.saddleMaxMm];
  if (!values.every(Number.isFinite)) throw new RangeError("bounds must be finite");
  if (bounds.nutMinMm > bounds.nutMaxMm) throw new RangeError("nut bounds are reversed");
  if (bounds.saddleMinMm > bounds.saddleMaxMm) throw new RangeError("saddle bounds are reversed");
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function requirePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive`);
}

function requireNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must not be negative`);
}
