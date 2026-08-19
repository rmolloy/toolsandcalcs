export interface ReliefMeasurement {
  scaleLengthMm: number;
  capoFretNumber: number;
  heldFretNumber: number;
  reliefFretNumber: number;
  reliefMm: number;
}

export interface BenchActionMeasurements extends ReliefMeasurement {
  actionMeasurementFretNumber: number;
  actionAtMeasurementWithCapoMm: number;
  nutActionAtFirstFretMm: number;
}

export interface CalculatedActionPoint {
  fretNumber: number;
  positionMm: number;
  fretSurfaceHeightMm: number;
  openStringHeightMm: number;
  clearanceAboveFretMm: number;
}

export function calculateFretPositionMm(
  scaleLengthMm: number,
  fretNumber: number,
): number {
  requirePositive(scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(fretNumber, "fretNumber");
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}

export function calculateTopOfStringClearanceMm(
  actionFromFretTopToStringBottomMm: number,
  stringDiameterMm: number,
): number {
  requireNonNegative(
    actionFromFretTopToStringBottomMm,
    "actionFromFretTopToStringBottomMm",
  );
  requirePositive(stringDiameterMm, "stringDiameterMm");
  return actionFromFretTopToStringBottomMm + stringDiameterMm;
}

export function calculateActionFromTopOfStringEnvelopeMm({
  stringIndex,
  stringCount,
  stringDiameterMm,
  firstStringActionMm,
  firstStringDiameterMm,
  lastStringActionMm,
  lastStringDiameterMm,
}: {
  stringIndex: number;
  stringCount: number;
  stringDiameterMm: number;
  firstStringActionMm: number;
  firstStringDiameterMm: number;
  lastStringActionMm: number;
  lastStringDiameterMm: number;
}): number {
  requireStringIndex(stringIndex, stringCount);
  const firstTopClearanceMm = calculateTopOfStringClearanceMm(
    firstStringActionMm,
    firstStringDiameterMm,
  );
  const lastTopClearanceMm = calculateTopOfStringClearanceMm(
    lastStringActionMm,
    lastStringDiameterMm,
  );
  const positionAcrossStrings = stringCount === 1
    ? 0
    : stringIndex / (stringCount - 1);
  const topClearanceMm = interpolate(
    firstTopClearanceMm,
    lastTopClearanceMm,
    positionAcrossStrings,
  );
  const actionMm = topClearanceMm - stringDiameterMm;
  requireNonNegative(actionMm, "derived action");
  return actionMm;
}

export function calculateReliefBelowReferenceMm(
  measurement: ReliefMeasurement,
  fretNumber: number,
): number {
  validateReliefMeasurement(measurement);
  requireNonNegativeInteger(fretNumber, "fretNumber");
  if (
    fretNumber <= measurement.capoFretNumber
    || fretNumber >= measurement.heldFretNumber
  ) return 0;

  const currentPositionMm = calculateFretPositionMm(
    measurement.scaleLengthMm,
    fretNumber,
  );
  const capoPositionMm = calculateFretPositionMm(
    measurement.scaleLengthMm,
    measurement.capoFretNumber,
  );
  const reliefPositionMm = calculateFretPositionMm(
    measurement.scaleLengthMm,
    measurement.reliefFretNumber,
  );
  if (fretNumber <= measurement.reliefFretNumber) {
    const progress = (currentPositionMm - capoPositionMm)
      / (reliefPositionMm - capoPositionMm);
    return measurement.reliefMm * smoothStep(progress);
  }

  const heldPositionMm = calculateFretPositionMm(
    measurement.scaleLengthMm,
    measurement.heldFretNumber,
  );
  const progress = (currentPositionMm - reliefPositionMm)
    / (heldPositionMm - reliefPositionMm);
  return measurement.reliefMm * (1 - smoothStep(progress));
}

export function calculateSaddleStringHeightMm(
  measurements: BenchActionMeasurements,
): number {
  validateBenchActionMeasurements(measurements);
  const capoPositionMm = calculateFretPositionMm(
    measurements.scaleLengthMm,
    measurements.capoFretNumber,
  );
  const measurementPositionMm = calculateFretPositionMm(
    measurements.scaleLengthMm,
    measurements.actionMeasurementFretNumber,
  );
  const fretHeightAtMeasurementMm = -calculateReliefBelowReferenceMm(
    measurements,
    measurements.actionMeasurementFretNumber,
  );
  const measurementProgress = (measurementPositionMm - capoPositionMm)
    / (measurements.scaleLengthMm - capoPositionMm);
  return (
    measurements.actionAtMeasurementWithCapoMm
    + fretHeightAtMeasurementMm
  ) / measurementProgress;
}

export function calculateNutStringHeightMm(
  measurements: BenchActionMeasurements,
  saddleStringHeightMm = calculateSaddleStringHeightMm(measurements),
): number {
  validateBenchActionMeasurements(measurements);
  requireFinite(saddleStringHeightMm, "saddleStringHeightMm");
  const firstFretPositionMm = calculateFretPositionMm(measurements.scaleLengthMm, 1);
  const progressToFirstFret = firstFretPositionMm / measurements.scaleLengthMm;
  return (
    measurements.nutActionAtFirstFretMm
    - progressToFirstFret * saddleStringHeightMm
  ) / (1 - progressToFirstFret);
}

export function calculateActionProfileFromBenchMeasurements(
  measurements: BenchActionMeasurements,
): CalculatedActionPoint[] {
  validateBenchActionMeasurements(measurements);
  const saddleStringHeightMm = calculateSaddleStringHeightMm(measurements);
  const nutStringHeightMm = calculateNutStringHeightMm(
    measurements,
    saddleStringHeightMm,
  );
  return Array.from(
    { length: measurements.heldFretNumber + 1 },
    (_, fretNumber) => calculateActionPoint({
      measurements,
      fretNumber,
      nutStringHeightMm,
      saddleStringHeightMm,
    }),
  );
}

function calculateActionPoint({
  measurements,
  fretNumber,
  nutStringHeightMm,
  saddleStringHeightMm,
}: {
  measurements: BenchActionMeasurements;
  fretNumber: number;
  nutStringHeightMm: number;
  saddleStringHeightMm: number;
}): CalculatedActionPoint {
  const positionMm = calculateFretPositionMm(measurements.scaleLengthMm, fretNumber);
  const progressAlongScale = positionMm / measurements.scaleLengthMm;
  const fretSurfaceHeightMm = -calculateReliefBelowReferenceMm(
    measurements,
    fretNumber,
  );
  const openStringHeightMm = interpolate(
    nutStringHeightMm,
    saddleStringHeightMm,
    progressAlongScale,
  );
  const clearanceAboveFretMm = openStringHeightMm - fretSurfaceHeightMm;
  requireNonNegative(clearanceAboveFretMm, `clearance at fret ${fretNumber}`);
  return {
    fretNumber,
    positionMm,
    fretSurfaceHeightMm,
    openStringHeightMm,
    clearanceAboveFretMm,
  };
}

function validateReliefMeasurement(measurement: ReliefMeasurement): void {
  requirePositive(measurement.scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(measurement.capoFretNumber, "capoFretNumber");
  requirePositiveInteger(measurement.heldFretNumber, "heldFretNumber");
  requirePositiveInteger(measurement.reliefFretNumber, "reliefFretNumber");
  requireNonNegative(measurement.reliefMm, "reliefMm");
  if (measurement.reliefFretNumber <= measurement.capoFretNumber) {
    throw new RangeError("reliefFretNumber must be after capoFretNumber");
  }
  if (measurement.reliefFretNumber >= measurement.heldFretNumber) {
    throw new RangeError("reliefFretNumber must be before heldFretNumber");
  }
}

function validateBenchActionMeasurements(
  measurements: BenchActionMeasurements,
): void {
  validateReliefMeasurement(measurements);
  requirePositiveInteger(
    measurements.actionMeasurementFretNumber,
    "actionMeasurementFretNumber",
  );
  requireNonNegative(
    measurements.actionAtMeasurementWithCapoMm,
    "actionAtMeasurementWithCapoMm",
  );
  requireNonNegative(
    measurements.nutActionAtFirstFretMm,
    "nutActionAtFirstFretMm",
  );
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

function requireStringIndex(stringIndex: number, stringCount: number): void {
  requireNonNegativeInteger(stringIndex, "stringIndex");
  requirePositiveInteger(stringCount, "stringCount");
  if (stringIndex >= stringCount) {
    throw new RangeError("stringIndex must be less than stringCount");
  }
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function smoothStep(value: number): number {
  const boundedValue = Math.min(1, Math.max(0, value));
  return boundedValue * boundedValue * (3 - 2 * boundedValue);
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
  if (value < 0) throw new RangeError(`${name} must not be negative`);
}

function requirePositiveInteger(value: number, name: string): void {
  requirePositive(value, name);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

function requireNonNegativeInteger(value: number, name: string): void {
  requireNonNegative(value, name);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}
