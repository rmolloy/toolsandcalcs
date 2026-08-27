export interface EmpiricalCompensationGeometry {
  scaleLengthMm: number;
  nutCompensationMm: number;
  saddleCompensationMm: number;
}

export interface EmpiricalCompensationBounds {
  nutMinimumMm: number;
  nutMaximumMm: number;
  saddleMinimumMm: number;
  saddleMaximumMm: number;
}

export interface EmpiricalCompensationSearch {
  bounds: EmpiricalCompensationBounds;
  divisionsPerAxis: number;
  refinementPasses: number;
}

export interface EmpiricalCompensationResult {
  geometry: EmpiricalCompensationGeometry;
  residualCentsByFret: readonly number[];
  totalAbsoluteResidualCents: number;
}

export interface EmpiricalIntonationReading {
  fretNumber: number;
  measuredErrorCents: number;
}

export interface EmpiricalReadingResidual {
  fretNumber: number;
  residualCents: number;
}

/**
 * Adjustments are deltas from the instrument's CURRENT geometry as measured —
 * "move the nut/saddle by this much" — never absolute cut positions. Measured
 * cents errors already include whatever compensation the instrument has today.
 */
export interface EmpiricalAdjustmentResult {
  nutAdjustmentMm: number;
  saddleAdjustmentMm: number;
  residualCentsByReading: readonly EmpiricalReadingResidual[];
  totalAbsoluteResidualCents: number;
}

interface EmpiricalCompensationCandidate {
  geometry: EmpiricalCompensationGeometry;
  totalAbsoluteResidualCents: number;
}

export function calculateCompensatedOpenStringLengthMm(
  geometry: EmpiricalCompensationGeometry,
): number {
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

export function calculateStringLengthChangeMmForCents(
  scaleLengthMm: number,
  cents: number,
): number {
  if (!Number.isFinite(scaleLengthMm) || scaleLengthMm <= 0) {
    throw new RangeError("scaleLengthMm must be positive");
  }
  if (!Number.isFinite(cents)) throw new RangeError("cents must be finite");
  return scaleLengthMm * (1 - 2 ** (-cents / 1200));
}

export function calculateNutCompensationTonalShiftCents(
  geometry: EmpiricalCompensationGeometry,
): number {
  const compensatedLengthMm = calculateCompensatedOpenStringLengthMm(geometry);
  const oneCentLengthRatio = 1 - 2 ** (-1 / 1200);
  return -geometry.nutCompensationMm / (compensatedLengthMm * oneCentLengthRatio);
}

export function calculateSaddleCompensationTonalShiftCents(
  geometry: EmpiricalCompensationGeometry,
  fretNumber: number,
): number {
  if (!Number.isInteger(fretNumber) || fretNumber < 1) {
    throw new RangeError("fretNumber must be a positive integer");
  }

  const compensatedLengthMm = calculateCompensatedOpenStringLengthMm(geometry);
  const frettedLengthMm = compensatedLengthMm / 2 ** (fretNumber / 12);
  const oneCentLengthRatio = 1 - 2 ** (-1 / 1200);
  return -geometry.saddleCompensationMm / (frettedLengthMm * oneCentLengthRatio);
}

export function calculateCombinedCompensationTonalShiftCents(
  geometry: EmpiricalCompensationGeometry,
  fretNumber: number,
): number {
  return (
    calculateNutCompensationTonalShiftCents(geometry) +
    calculateSaddleCompensationTonalShiftCents(geometry, fretNumber)
  );
}

export function calculateResidualTonalErrorCents(
  measuredErrorCents: number,
  geometry: EmpiricalCompensationGeometry,
  fretNumber: number,
): number {
  if (!Number.isFinite(measuredErrorCents)) {
    throw new RangeError("measuredErrorCents must be finite");
  }
  return measuredErrorCents + calculateCombinedCompensationTonalShiftCents(geometry, fretNumber);
}

export function calculateTotalAbsoluteResidualCents(
  measuredErrorsCentsByFret: readonly number[],
  geometry: EmpiricalCompensationGeometry,
): number {
  if (measuredErrorsCentsByFret.length === 0) {
    throw new RangeError("measuredErrorsCentsByFret must include at least fret 1");
  }

  return measuredErrorsCentsByFret.reduce(
    (total, measuredErrorCents, index) =>
      total + Math.abs(calculateResidualTonalErrorCents(measuredErrorCents, geometry, index + 1)),
    0,
  );
}

export function calculateTotalAbsoluteResidualCentsForReadings(
  readings: readonly EmpiricalIntonationReading[],
  geometry: EmpiricalCompensationGeometry,
): number {
  if (readings.length === 0) {
    throw new RangeError("readings must include at least one measured fret");
  }
  return readings.reduce(
    (total, { fretNumber, measuredErrorCents }) =>
      total + Math.abs(calculateResidualTonalErrorCents(measuredErrorCents, geometry, fretNumber)),
    0,
  );
}

export function readingsFromDenseErrors(
  measuredErrorsCentsByFret: readonly number[],
): EmpiricalIntonationReading[] {
  return measuredErrorsCentsByFret.map((measuredErrorCents, index) => ({
    fretNumber: index + 1,
    measuredErrorCents,
  }));
}

export function optimizeEmpiricalCompensation({
  scaleLengthMm,
  measuredErrorsCentsByFret,
  search,
}: {
  scaleLengthMm: number;
  measuredErrorsCentsByFret: readonly number[];
  search: EmpiricalCompensationSearch;
}): EmpiricalCompensationResult {
  validateEmpiricalFretErrors(measuredErrorsCentsByFret);
  const adjustment = optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm,
    readings: readingsFromDenseErrors(measuredErrorsCentsByFret),
    search,
  });
  return {
    geometry: {
      scaleLengthMm,
      nutCompensationMm: adjustment.nutAdjustmentMm,
      saddleCompensationMm: adjustment.saddleAdjustmentMm,
    },
    residualCentsByFret: adjustment.residualCentsByReading.map(({ residualCents }) => residualCents),
    totalAbsoluteResidualCents: adjustment.totalAbsoluteResidualCents,
  };
}

export function optimizeEmpiricalAdjustmentFromReadings({
  scaleLengthMm,
  readings,
  search,
}: {
  scaleLengthMm: number;
  readings: readonly EmpiricalIntonationReading[];
  search: EmpiricalCompensationSearch;
}): EmpiricalAdjustmentResult {
  validateEmpiricalReadings(readings);
  validateEmpiricalCompensationSearch(scaleLengthMm, search);

  let window = search.bounds;
  let best = findBestEmpiricalCompensationInWindow(
    scaleLengthMm,
    readings,
    window,
    search.divisionsPerAxis,
  );

  for (let pass = 1; pass < search.refinementPasses; pass += 1) {
    window = refineEmpiricalCompensationWindow(window, best.geometry, search.divisionsPerAxis);
    best = findBestEmpiricalCompensationInWindow(
      scaleLengthMm,
      readings,
      window,
      search.divisionsPerAxis,
    );
  }

  return {
    nutAdjustmentMm: best.geometry.nutCompensationMm,
    saddleAdjustmentMm: best.geometry.saddleCompensationMm,
    residualCentsByReading: readings.map(({ fretNumber, measuredErrorCents }) => ({
      fretNumber,
      residualCents: calculateResidualTonalErrorCents(measuredErrorCents, best.geometry, fretNumber),
    })),
    totalAbsoluteResidualCents: best.totalAbsoluteResidualCents,
  };
}

function findBestEmpiricalCompensationInWindow(
  scaleLengthMm: number,
  readings: readonly EmpiricalIntonationReading[],
  bounds: EmpiricalCompensationBounds,
  divisionsPerAxis: number,
): EmpiricalCompensationCandidate {
  const candidates = createEmpiricalCompensationCandidates(
    scaleLengthMm,
    readings,
    bounds,
    divisionsPerAxis,
  );
  return candidates.reduce((best, candidate) =>
    isBetterEmpiricalCompensationCandidate(candidate, best) ? candidate : best);
}

function createEmpiricalCompensationCandidates(
  scaleLengthMm: number,
  readings: readonly EmpiricalIntonationReading[],
  bounds: EmpiricalCompensationBounds,
  divisionsPerAxis: number,
): EmpiricalCompensationCandidate[] {
  const nutValues = createSearchAxis(bounds.nutMinimumMm, bounds.nutMaximumMm, divisionsPerAxis);
  const saddleValues = createSearchAxis(
    bounds.saddleMinimumMm,
    bounds.saddleMaximumMm,
    divisionsPerAxis,
  );
  return nutValues.flatMap((nutCompensationMm) =>
    saddleValues.map((saddleCompensationMm) => createEmpiricalCompensationCandidate(
      scaleLengthMm,
      readings,
      nutCompensationMm,
      saddleCompensationMm,
    )));
}

function createEmpiricalCompensationCandidate(
  scaleLengthMm: number,
  readings: readonly EmpiricalIntonationReading[],
  nutCompensationMm: number,
  saddleCompensationMm: number,
): EmpiricalCompensationCandidate {
  const geometry = { scaleLengthMm, nutCompensationMm, saddleCompensationMm };
  return {
    geometry,
    totalAbsoluteResidualCents: calculateTotalAbsoluteResidualCentsForReadings(
      readings,
      geometry,
    ),
  };
}

function createSearchAxis(minimum: number, maximum: number, divisions: number): number[] {
  if (minimum === maximum) return [minimum];
  const step = (maximum - minimum) / divisions;
  return Array.from({ length: divisions + 1 }, (_, index) =>
    index === divisions ? maximum : minimum + index * step);
}

function isBetterEmpiricalCompensationCandidate(
  candidate: EmpiricalCompensationCandidate,
  current: EmpiricalCompensationCandidate | undefined,
): boolean {
  if (!current) return true;
  if (candidate.totalAbsoluteResidualCents !== current.totalAbsoluteResidualCents) {
    return candidate.totalAbsoluteResidualCents < current.totalAbsoluteResidualCents;
  }
  return calculateTotalCompensationMovementMm(candidate.geometry)
    < calculateTotalCompensationMovementMm(current.geometry);
}

function calculateTotalCompensationMovementMm(geometry: EmpiricalCompensationGeometry): number {
  return Math.abs(geometry.nutCompensationMm) + Math.abs(geometry.saddleCompensationMm);
}

function refineEmpiricalCompensationWindow(
  bounds: EmpiricalCompensationBounds,
  geometry: EmpiricalCompensationGeometry,
  divisions: number,
): EmpiricalCompensationBounds {
  const nutStep = (bounds.nutMaximumMm - bounds.nutMinimumMm) / divisions;
  const saddleStep = (bounds.saddleMaximumMm - bounds.saddleMinimumMm) / divisions;
  return {
    nutMinimumMm: Math.max(bounds.nutMinimumMm, geometry.nutCompensationMm - nutStep),
    nutMaximumMm: Math.min(bounds.nutMaximumMm, geometry.nutCompensationMm + nutStep),
    saddleMinimumMm: Math.max(
      bounds.saddleMinimumMm,
      geometry.saddleCompensationMm - saddleStep,
    ),
    saddleMaximumMm: Math.min(
      bounds.saddleMaximumMm,
      geometry.saddleCompensationMm + saddleStep,
    ),
  };
}

function validateEmpiricalCompensationSearch(
  scaleLengthMm: number,
  search: EmpiricalCompensationSearch,
): void {
  validateEmpiricalScaleLength(scaleLengthMm);
  validateEmpiricalCompensationBounds(scaleLengthMm, search.bounds);
  validateEmpiricalSearchResolution(search);
}

function validateEmpiricalReadings(readings: readonly EmpiricalIntonationReading[]): void {
  if (readings.length === 0) {
    throw new RangeError("readings must include at least one measured fret");
  }
  const seenFretNumbers = new Set<number>();
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

function validateEmpiricalScaleLength(scaleLengthMm: number): void {
  if (!Number.isFinite(scaleLengthMm) || scaleLengthMm <= 0) {
    throw new RangeError("scaleLengthMm must be positive");
  }
}

function validateEmpiricalFretErrors(measuredErrorsCentsByFret: readonly number[]): void {
  if (measuredErrorsCentsByFret.length === 0 || !measuredErrorsCentsByFret.every(Number.isFinite)) {
    throw new RangeError("measuredErrorsCentsByFret must contain finite fret errors");
  }
}

function validateEmpiricalCompensationBounds(
  scaleLengthMm: number,
  bounds: EmpiricalCompensationBounds,
): void {
  const boundValues = [
    bounds.nutMinimumMm,
    bounds.nutMaximumMm,
    bounds.saddleMinimumMm,
    bounds.saddleMaximumMm,
  ];
  if (!boundValues.every(Number.isFinite)) throw new RangeError("search bounds must be finite");
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

function validateEmpiricalSearchResolution(search: EmpiricalCompensationSearch): void {
  if (!Number.isInteger(search.divisionsPerAxis) || search.divisionsPerAxis < 2) {
    throw new RangeError("divisionsPerAxis must be an integer of at least two");
  }
  if (!Number.isInteger(search.refinementPasses) || search.refinementPasses < 1) {
    throw new RangeError("refinementPasses must be a positive integer");
  }
}
