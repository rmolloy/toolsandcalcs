/**
 * Gore's action model, formula-literal from the companion worksheet
 * (per-string tabs, section 4.7.3) and equations 4.7-13 through 4.7-22.
 *
 * The worksheet computes an ABSOLUTE open-string clearance d_{s,n} for every
 * fret from design parameters — it is not a relief correction under a
 * measured string line. Two composites exist side by side:
 *
 * - circle+ellipse:  d = alpha*yc + (1-alpha)*he + beta1*yl
 * - parabola:        d = gamma*yp + beta2*yl        (the worksheet's selection)
 *
 * The parabola component IS the neck-deflection model: yp = deltaC*x*(xLast-x)
 * with deltaC = M/(2*E*I) from the neck sheet. Frames are deliberately mixed,
 * exactly as the worksheet has them: the circle radius comes from fret-1-based
 * spans (4.7-14) while yc is evaluated over the nut-to-last-fret chord, and
 * the ellipse is nut-anchored (4.7-15..18).
 */

import { calculateFretPositionMm } from "./action_geometry.ts";

export type GoreActionMethod = "parabola" | "circleEllipse";

export interface GoreActionModelInput {
  scaleLengthMm: number;
  lastFretNumber: number;
  /** h_0: nut slot height above the fret plane. */
  nutHeightMm: number;
  /** h_mid: relief at the mid fret. */
  reliefMm: number;
  reliefFretNumber: number;
  /** h_12: preferred open-string action at the action fret. */
  actionMm: number;
  actionFretNumber: number;
  /** deltaC = M/(2*E*I): neck deflection constant, 1/mm. Drives the parabola. */
  neckDeflectionConstantPerMm: number;
  circularWeight?: number;
  circleEllipseLinearWeight?: number;
  parabolicWeight?: number;
  parabolaLinearWeight?: number;
}

export interface GoreActionPoint {
  fretNumber: number;
  positionMm: number;
  clearanceAboveFretMm: number;
}

export const GORE_WORKSHEET_ACTION_WEIGHTS = {
  circularWeight: 0.5,
  circleEllipseLinearWeight: 1.037,
  parabolicWeight: 1,
  parabolaLinearWeight: 1,
} as const;

function lastFretPositionMm(input: GoreActionModelInput): number {
  return calculateFretPositionMm(input.scaleLengthMm, input.lastFretNumber);
}

/** Equation 4.7-14 with the worksheet's fret-1-based spans. */
export function calculateGoreActionRadiusMm(input: GoreActionModelInput): number {
  validateGoreActionInput(input);
  const firstFretMm = calculateFretPositionMm(input.scaleLengthMm, 1);
  const reliefPositionMm = calculateFretPositionMm(input.scaleLengthMm, input.reliefFretNumber);
  const beforeReliefMm = reliefPositionMm - firstFretMm;
  const afterReliefMm = lastFretPositionMm(input) - reliefPositionMm;
  return (beforeReliefMm * afterReliefMm / input.reliefMm + input.reliefMm) / 2;
}

/** Equation 4.7-13 evaluated over the nut-to-last-fret chord, as the worksheet does. */
export function calculateGoreCircularComponentMm(
  input: GoreActionModelInput,
  fretNumber: number,
): number {
  validateGoreActionFret(input, fretNumber);
  const radiusMm = calculateGoreActionRadiusMm(input);
  const chordMm = lastFretPositionMm(input);
  const positionMm = calculateFretPositionMm(input.scaleLengthMm, fretNumber);
  return Math.sqrt(
    4 * radiusMm ** 2 - chordMm ** 2 - 4 * positionMm ** 2 + 4 * chordMm * positionMm,
  ) / 2 - Math.sqrt(radiusMm ** 2 - chordMm ** 2 / 4);
}

function ellipticalShape(positionMm: number, semiMajorAxisMm: number): number {
  return Math.sqrt(1 - ((positionMm - semiMajorAxisMm) ** 2) / semiMajorAxisMm ** 2)
    - positionMm / semiMajorAxisMm;
}

/** Equation 4.7-17: semi-minor axis from the measured relief. */
export function calculateGoreEllipseMinorAxisMm(input: GoreActionModelInput): number {
  validateGoreActionInput(input);
  const reliefPositionMm = calculateFretPositionMm(input.scaleLengthMm, input.reliefFretNumber);
  return input.reliefMm / ellipticalShape(reliefPositionMm, lastFretPositionMm(input));
}

/** Equation 4.7-18. */
export function calculateGoreEllipticalComponentMm(
  input: GoreActionModelInput,
  fretNumber: number,
): number {
  validateGoreActionFret(input, fretNumber);
  const positionMm = calculateFretPositionMm(input.scaleLengthMm, fretNumber);
  return calculateGoreEllipseMinorAxisMm(input)
    * ellipticalShape(positionMm, lastFretPositionMm(input));
}

/** Worksheet h_last: the nut-height-to-action line extended to the last fret. */
export function calculateGoreLastFretActionMm(input: GoreActionModelInput): number {
  validateGoreActionInput(input);
  const actionPositionMm = calculateFretPositionMm(input.scaleLengthMm, input.actionFretNumber);
  return (lastFretPositionMm(input) / actionPositionMm)
    * (input.actionMm - input.nutHeightMm)
    + input.nutHeightMm;
}

/** Equation 4.7-21: the inclined line through nut height and last-fret action. */
export function calculateGoreLinearComponentMm(
  input: GoreActionModelInput,
  fretNumber: number,
): number {
  validateGoreActionFret(input, fretNumber);
  const positionMm = calculateFretPositionMm(input.scaleLengthMm, fretNumber);
  return positionMm
    * (calculateGoreLastFretActionMm(input) - input.nutHeightMm)
    / lastFretPositionMm(input)
    + input.nutHeightMm;
}

/** The neck-deflection parabola: yp = deltaC * x * (xLast - x). */
export function calculateGoreNeckParabolaComponentMm(
  input: GoreActionModelInput,
  fretNumber: number,
): number {
  validateGoreActionFret(input, fretNumber);
  const positionMm = calculateFretPositionMm(input.scaleLengthMm, fretNumber);
  return input.neckDeflectionConstantPerMm
    * positionMm
    * (lastFretPositionMm(input) - positionMm);
}

/** Equation 4.7-22 / the worksheet's selected composite. */
export function calculateGoreActionAtFretMm(
  input: GoreActionModelInput,
  fretNumber: number,
  method: GoreActionMethod = "parabola",
): number {
  const linearMm = calculateGoreLinearComponentMm(input, fretNumber);
  if (method === "parabola") {
    const parabolicWeight = input.parabolicWeight
      ?? GORE_WORKSHEET_ACTION_WEIGHTS.parabolicWeight;
    const linearWeight = input.parabolaLinearWeight
      ?? GORE_WORKSHEET_ACTION_WEIGHTS.parabolaLinearWeight;
    return parabolicWeight * calculateGoreNeckParabolaComponentMm(input, fretNumber)
      + linearWeight * linearMm;
  }
  const circularWeight = input.circularWeight
    ?? GORE_WORKSHEET_ACTION_WEIGHTS.circularWeight;
  const linearWeight = input.circleEllipseLinearWeight
    ?? GORE_WORKSHEET_ACTION_WEIGHTS.circleEllipseLinearWeight;
  return circularWeight * calculateGoreCircularComponentMm(input, fretNumber)
    + (1 - circularWeight) * calculateGoreEllipticalComponentMm(input, fretNumber)
    + linearWeight * linearMm;
}

export function calculateGoreActionProfileMm(
  input: GoreActionModelInput,
  method: GoreActionMethod = "parabola",
): GoreActionPoint[] {
  validateGoreActionInput(input);
  return Array.from({ length: input.lastFretNumber + 1 }, (_, fretNumber) => ({
    fretNumber,
    positionMm: calculateFretPositionMm(input.scaleLengthMm, fretNumber),
    clearanceAboveFretMm: calculateGoreActionAtFretMm(input, fretNumber, method),
  }));
}

function validateGoreActionInput(input: GoreActionModelInput): void {
  requirePositive(input.scaleLengthMm, "scaleLengthMm");
  requirePositive(input.reliefMm, "reliefMm");
  requirePositive(input.actionMm, "actionMm");
  requireNonNegative(input.nutHeightMm, "nutHeightMm");
  requireNonNegative(input.neckDeflectionConstantPerMm, "neckDeflectionConstantPerMm");
  requireFretInteger(input.lastFretNumber, "lastFretNumber");
  requireFretInteger(input.reliefFretNumber, "reliefFretNumber");
  requireFretInteger(input.actionFretNumber, "actionFretNumber");
  if (input.reliefFretNumber <= 1 || input.reliefFretNumber >= input.lastFretNumber) {
    throw new RangeError("reliefFretNumber must be between fret 1 and the last fret");
  }
  if (input.actionFretNumber >= input.lastFretNumber) {
    throw new RangeError("actionFretNumber must be before the last fret");
  }
}

function validateGoreActionFret(input: GoreActionModelInput, fretNumber: number): void {
  validateGoreActionInput(input);
  if (!Number.isInteger(fretNumber) || fretNumber < 0 || fretNumber > input.lastFretNumber) {
    throw new RangeError("fretNumber must be between the nut and the last fret");
  }
}

function requireFretInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function requirePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive`);
}

function requireNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must not be negative`);
}
