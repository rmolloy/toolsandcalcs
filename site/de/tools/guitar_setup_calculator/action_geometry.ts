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

export interface SparseActionMeasurement {
  fretNumber: number;
  clearanceAboveFretMm: number;
}

export const GORE_DEFAULT_CIRCULAR_RELIEF_WEIGHT = 0.5;

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

export function calculateRadiusArcHeightAboveChordMm({
  lateralPositionMm,
  firstLateralPositionMm,
  lastLateralPositionMm,
  radiusMm,
}: {
  lateralPositionMm: number;
  firstLateralPositionMm: number;
  lastLateralPositionMm: number;
  radiusMm: number;
}): number {
  if (radiusMm === Infinity) return 0;
  requirePositive(radiusMm, "radiusMm");
  const minimumMm = Math.min(firstLateralPositionMm, lastLateralPositionMm);
  const maximumMm = Math.max(firstLateralPositionMm, lastLateralPositionMm);
  if (lateralPositionMm < minimumMm || lateralPositionMm > maximumMm) {
    throw new RangeError("lateralPositionMm must lie between the outer strings");
  }
  // Parabolic sagitta of the fingerboard arc above the chord through the outer
  // strings. Exact circular error is O((spread / radius)^3): sub-micron at bench scales.
  return (lateralPositionMm - firstLateralPositionMm)
    * (lastLateralPositionMm - lateralPositionMm)
    / (2 * radiusMm);
}

export function calculateActionFromTopOfStringEnvelopeMm({
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
  lastLateralPositionMm,
}: {
  stringIndex: number;
  stringCount: number;
  stringDiameterMm: number;
  firstStringActionMm: number;
  firstStringDiameterMm: number;
  lastStringActionMm: number;
  lastStringDiameterMm: number;
  fingerboardRadiusMm?: number;
  lateralPositionMm?: number;
  firstLateralPositionMm?: number;
  lastLateralPositionMm?: number;
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
  const chordTopClearanceMm = interpolate(
    firstTopClearanceMm,
    lastTopClearanceMm,
    positionAcrossStrings,
  );
  const radiusArcHeightMm = fingerboardRadiusMm !== undefined
      && lateralPositionMm !== undefined
      && firstLateralPositionMm !== undefined
      && lastLateralPositionMm !== undefined
    ? calculateRadiusArcHeightAboveChordMm({
      lateralPositionMm,
      firstLateralPositionMm,
      lastLateralPositionMm,
      radiusMm: fingerboardRadiusMm,
    })
    : 0;
  const actionMm = chordTopClearanceMm + radiusArcHeightMm - stringDiameterMm;
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
  return calculateGoreReliefBelowReferenceMm(measurement, fretNumber);
}

export function calculateCircularReliefBelowReferenceMm(
  measurement: ReliefMeasurement,
  fretNumber: number,
): number {
  validateReliefEvaluation(measurement, fretNumber);
  if (isOutsideReliefSpan(measurement, fretNumber) || measurement.reliefMm === 0) {
    return 0;
  }
  if (fretNumber === measurement.reliefFretNumber) return measurement.reliefMm;

  const positions = calculateReliefPositions(measurement, fretNumber);
  const chordLengthMm = positions.heldMm - positions.capoMm;
  const beforeMeasurementMm = positions.reliefMm - positions.capoMm;
  const afterMeasurementMm = positions.heldMm - positions.reliefMm;
  const radiusMm = 0.5 * (
    beforeMeasurementMm * afterMeasurementMm / measurement.reliefMm
    + measurement.reliefMm
  );
  const localPositionMm = positions.currentMm - positions.capoMm;
  const firstRadicand = 4 * radiusMm ** 2
    - chordLengthMm ** 2
    - 4 * localPositionMm ** 2
    + 4 * chordLengthMm * localPositionMm;
  const secondRadicand = radiusMm ** 2 - 0.25 * chordLengthMm ** 2;
  return 0.5 * Math.sqrt(Math.max(0, firstRadicand))
    - Math.sqrt(Math.max(0, secondRadicand));
}

export function calculateEllipticalReliefBelowReferenceMm(
  measurement: ReliefMeasurement,
  fretNumber: number,
): number {
  validateReliefEvaluation(measurement, fretNumber);
  if (isOutsideReliefSpan(measurement, fretNumber) || measurement.reliefMm === 0) {
    return 0;
  }
  if (fretNumber === measurement.reliefFretNumber) return measurement.reliefMm;

  const positions = calculateReliefPositions(measurement, fretNumber);
  const semiMajorAxisMm = positions.heldMm;
  const measuredShape = calculateEllipticalReliefShape(
    positions.reliefMm,
    semiMajorAxisMm,
  );
  const semiMinorAxisMm = measurement.reliefMm / measuredShape;
  return semiMinorAxisMm * calculateEllipticalReliefShape(
    positions.currentMm,
    semiMajorAxisMm,
  );
}

export function calculateGoreReliefBelowReferenceMm(
  measurement: ReliefMeasurement,
  fretNumber: number,
  circularWeight = GORE_DEFAULT_CIRCULAR_RELIEF_WEIGHT,
): number {
  validateReliefEvaluation(measurement, fretNumber);
  requireUnitInterval(circularWeight, "circularWeight");
  if (isOutsideReliefSpan(measurement, fretNumber)) return 0;
  if (fretNumber === measurement.reliefFretNumber) return measurement.reliefMm;
  const circularReliefMm = calculateCircularReliefBelowReferenceMm(
    measurement,
    fretNumber,
  );
  const ellipticalReliefMm = calculateEllipticalReliefBelowReferenceMm(
    measurement,
    fretNumber,
  );
  return circularWeight * circularReliefMm
    + (1 - circularWeight) * ellipticalReliefMm;
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

export function calibrateActionProfileFromSparseMeasurements(
  profile: readonly CalculatedActionPoint[],
  measurements: readonly SparseActionMeasurement[],
): CalculatedActionPoint[] {
  if (profile.length === 0) {
    if (measurements.length > 0) {
      throw new RangeError("measurements require a non-empty action profile");
    }
    return [];
  }
  const sortedMeasurements = validateAndSortSparseMeasurements(
    profile,
    measurements,
  );
  if (sortedMeasurements.length === 0) return profile.map(copyActionPoint);

  const correctionAnchors = createSparseCorrectionAnchors(
    profile,
    sortedMeasurements,
  );
  return profile.map((point) => applySparseCorrection(point, correctionAnchors));
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

interface ActionCorrectionAnchor {
  positionMm: number;
  correctionMm: number;
}

function validateAndSortSparseMeasurements(
  profile: readonly CalculatedActionPoint[],
  measurements: readonly SparseActionMeasurement[],
): SparseActionMeasurement[] {
  const pointsByFret = new Map(profile.map((point) => [point.fretNumber, point]));
  const seenFrets = new Set<number>();
  const sortedMeasurements = measurements.map((measurement) => {
    requireNonNegativeInteger(measurement.fretNumber, "measurement fretNumber");
    requireNonNegative(
      measurement.clearanceAboveFretMm,
      "measurement clearanceAboveFretMm",
    );
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

function createSparseCorrectionAnchors(
  profile: readonly CalculatedActionPoint[],
  measurements: readonly SparseActionMeasurement[],
): ActionCorrectionAnchor[] {
  const pointsByFret = new Map(profile.map((point) => [point.fretNumber, point]));
  const measurementAnchors = measurements.map((measurement) => {
    const point = pointsByFret.get(measurement.fretNumber)!;
    return {
      positionMm: point.positionMm,
      correctionMm: measurement.clearanceAboveFretMm - point.clearanceAboveFretMm,
    };
  });
  return includeBookBoundaryAnchors(profile, measurementAnchors);
}

function includeBookBoundaryAnchors(
  profile: readonly CalculatedActionPoint[],
  measurementAnchors: readonly ActionCorrectionAnchor[],
): ActionCorrectionAnchor[] {
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

function applySparseCorrection(
  point: CalculatedActionPoint,
  anchors: readonly ActionCorrectionAnchor[],
): CalculatedActionPoint {
  const correctionMm = interpolateCorrectionAtPosition(point.positionMm, anchors);
  const clearanceAboveFretMm = point.clearanceAboveFretMm + correctionMm;
  requireNonNegative(clearanceAboveFretMm, `clearance at fret ${point.fretNumber}`);
  return {
    ...point,
    openStringHeightMm: point.openStringHeightMm + correctionMm,
    clearanceAboveFretMm,
  };
}

function interpolateCorrectionAtPosition(
  positionMm: number,
  anchors: readonly ActionCorrectionAnchor[],
): number {
  const exactAnchor = anchors.find((anchor) => anchor.positionMm === positionMm);
  if (exactAnchor) return exactAnchor.correctionMm;
  const upperIndex = anchors.findIndex((anchor) => anchor.positionMm > positionMm);
  if (upperIndex <= 0) return anchors[0].correctionMm;
  const lowerAnchor = anchors[upperIndex - 1];
  const upperAnchor = anchors[upperIndex];
  const progress = (positionMm - lowerAnchor.positionMm)
    / (upperAnchor.positionMm - lowerAnchor.positionMm);
  return interpolate(lowerAnchor.correctionMm, upperAnchor.correctionMm, progress);
}

function copyActionPoint(point: CalculatedActionPoint): CalculatedActionPoint {
  return { ...point };
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

function validateReliefEvaluation(
  measurement: ReliefMeasurement,
  fretNumber: number,
): void {
  validateReliefMeasurement(measurement);
  requireNonNegativeInteger(fretNumber, "fretNumber");
}

function isOutsideReliefSpan(
  measurement: ReliefMeasurement,
  fretNumber: number,
): boolean {
  return fretNumber <= measurement.capoFretNumber
    || fretNumber >= measurement.heldFretNumber;
}

function calculateReliefPositions(
  measurement: ReliefMeasurement,
  fretNumber: number,
): {
  currentMm: number;
  capoMm: number;
  reliefMm: number;
  heldMm: number;
} {
  return {
    currentMm: calculateFretPositionMm(measurement.scaleLengthMm, fretNumber),
    capoMm: calculateFretPositionMm(
      measurement.scaleLengthMm,
      measurement.capoFretNumber,
    ),
    reliefMm: calculateFretPositionMm(
      measurement.scaleLengthMm,
      measurement.reliefFretNumber,
    ),
    heldMm: calculateFretPositionMm(
      measurement.scaleLengthMm,
      measurement.heldFretNumber,
    ),
  };
}

function calculateEllipticalReliefShape(
  positionMm: number,
  semiMajorAxisMm: number,
): number {
  const centeredPosition = (positionMm - semiMajorAxisMm) / semiMajorAxisMm;
  return Math.sqrt(Math.max(0, 1 - centeredPosition ** 2))
    - positionMm / semiMajorAxisMm;
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

import {
  requireFinite,
  requireNonNegative,
  requireNonNegativeInteger,
  requirePositive,
  requirePositiveInteger,
  requireUnitInterval,
} from "./numeric_validation.ts";
