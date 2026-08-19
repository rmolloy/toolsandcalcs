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

export function optimizeEmpiricalCompensation({
  scaleLengthMm,
  measuredErrorsCentsByFret,
  search,
}: {
  scaleLengthMm: number;
  measuredErrorsCentsByFret: readonly number[];
  search: EmpiricalCompensationSearch;
}): EmpiricalCompensationResult {
  validateEmpiricalCompensationSearch(scaleLengthMm, measuredErrorsCentsByFret, search);

  let window = search.bounds;
  let best = findBestEmpiricalCompensationInWindow(
    scaleLengthMm,
    measuredErrorsCentsByFret,
    window,
    search.divisionsPerAxis,
  );

  for (let pass = 1; pass < search.refinementPasses; pass += 1) {
    window = refineEmpiricalCompensationWindow(window, best.geometry, search.divisionsPerAxis);
    best = findBestEmpiricalCompensationInWindow(
      scaleLengthMm,
      measuredErrorsCentsByFret,
      window,
      search.divisionsPerAxis,
    );
  }

  return {
    geometry: best.geometry,
    residualCentsByFret: measuredErrorsCentsByFret.map((measuredErrorCents, index) =>
      calculateResidualTonalErrorCents(measuredErrorCents, best.geometry, index + 1)),
    totalAbsoluteResidualCents: best.totalAbsoluteResidualCents,
  };
}

function findBestEmpiricalCompensationInWindow(
  scaleLengthMm: number,
  measuredErrorsCentsByFret: readonly number[],
  bounds: EmpiricalCompensationBounds,
  divisionsPerAxis: number,
): EmpiricalCompensationCandidate {
  const candidates = createEmpiricalCompensationCandidates(
    scaleLengthMm,
    measuredErrorsCentsByFret,
    bounds,
    divisionsPerAxis,
  );
  return candidates.reduce((best, candidate) =>
    isBetterEmpiricalCompensationCandidate(candidate, best) ? candidate : best);
}

function createEmpiricalCompensationCandidates(
  scaleLengthMm: number,
  measuredErrorsCentsByFret: readonly number[],
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
      measuredErrorsCentsByFret,
      nutCompensationMm,
      saddleCompensationMm,
    )));
}

function createEmpiricalCompensationCandidate(
  scaleLengthMm: number,
  measuredErrorsCentsByFret: readonly number[],
  nutCompensationMm: number,
  saddleCompensationMm: number,
): EmpiricalCompensationCandidate {
  const geometry = { scaleLengthMm, nutCompensationMm, saddleCompensationMm };
  return {
    geometry,
    totalAbsoluteResidualCents: calculateTotalAbsoluteResidualCents(
      measuredErrorsCentsByFret,
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
  measuredErrorsCentsByFret: readonly number[],
  search: EmpiricalCompensationSearch,
): void {
  validateEmpiricalScaleLength(scaleLengthMm);
  validateEmpiricalFretErrors(measuredErrorsCentsByFret);
  validateEmpiricalCompensationBounds(scaleLengthMm, search.bounds);
  validateEmpiricalSearchResolution(search);
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
