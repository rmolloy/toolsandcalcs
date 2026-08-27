import assert from "node:assert/strict";
import test from "node:test";

import {
  calibrateActionProfileFromSparseMeasurements,
  calculateActionFromTopOfStringEnvelopeMm,
  calculateActionProfileFromBenchMeasurements,
  calculateCircularReliefBelowReferenceMm,
  calculateEllipticalReliefBelowReferenceMm,
  calculateFretPositionMm,
  calculateGoreReliefBelowReferenceMm,
  calculateRadiusArcHeightAboveChordMm,
  calculateReliefBelowReferenceMm,
  calculateSaddleStringHeightMm,
  calculateTopOfStringClearanceMm,
} from "./action_geometry.ts";

const benchMeasurements = {
  scaleLengthMm: 647.7,
  capoFretNumber: 1,
  heldFretNumber: 22,
  reliefFretNumber: 7,
  reliefMm: 0.18,
  actionMeasurementFretNumber: 12,
  actionAtMeasurementWithCapoMm: 1.8,
  nutActionAtFirstFretMm: 0.25,
};

test("action is measured from fret top to string bottom", () => {
  assert.equal(calculateTopOfStringClearanceMm(0.2, 0.46), 0.66);
});

test("middle-string actions put string tops on the outer-string envelope", () => {
  const actionMm = calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: 2,
    stringCount: 5,
    stringDiameterMm: 0.5,
    firstStringActionMm: 0.15,
    firstStringDiameterMm: 0.25,
    lastStringActionMm: 0.25,
    lastStringDiameterMm: 1.15,
  });
  assert.ok(Math.abs(actionMm - 0.4) < 1e-12);
  assert.ok(Math.abs(actionMm + 0.5 - 0.9) < 1e-12);
});

test("outer-string action anchors are preserved", () => {
  const common = {
    stringCount: 6,
    firstStringActionMm: 1.5,
    firstStringDiameterMm: 0.25,
    lastStringActionMm: 2,
    lastStringDiameterMm: 1.15,
  };
  assert.equal(calculateActionFromTopOfStringEnvelopeMm({
    ...common,
    stringIndex: 0,
    stringDiameterMm: 0.25,
  }), 1.5);
  assert.equal(calculateActionFromTopOfStringEnvelopeMm({
    ...common,
    stringIndex: 5,
    stringDiameterMm: 1.15,
  }), 2);
});

test("relief is zero at both references and exact at the measured fret", () => {
  assert.equal(calculateReliefBelowReferenceMm(benchMeasurements, 1), 0);
  assert.equal(calculateReliefBelowReferenceMm(benchMeasurements, 7), 0.18);
  assert.equal(calculateReliefBelowReferenceMm(benchMeasurements, 22), 0);
});

test("Gore circular and elliptical relief components reproduce the measurement", () => {
  for (const calculateRelief of [
    calculateCircularReliefBelowReferenceMm,
    calculateEllipticalReliefBelowReferenceMm,
  ]) {
    assert.equal(calculateRelief(benchMeasurements, 1), 0);
    assert.ok(Math.abs(calculateRelief(benchMeasurements, 7) - 0.18) < 1e-7);
    assert.equal(calculateRelief(benchMeasurements, 22), 0);
  }
});

test("Gore relief defaults to an equal circle and ellipse blend", () => {
  const fretNumber = 12;
  const circularReliefMm = calculateCircularReliefBelowReferenceMm(
    benchMeasurements,
    fretNumber,
  );
  const ellipticalReliefMm = calculateEllipticalReliefBelowReferenceMm(
    benchMeasurements,
    fretNumber,
  );
  const expectedReliefMm = (circularReliefMm + ellipticalReliefMm) / 2;
  assert.ok(Math.abs(
    calculateGoreReliefBelowReferenceMm(benchMeasurements, fretNumber)
      - expectedReliefMm,
  ) < 1e-12);
});

test("Gore relief blend rejects weights outside zero to one", () => {
  assert.throws(
    () => calculateGoreReliefBelowReferenceMm(benchMeasurements, 12, 1.01),
    /circularWeight must be between 0 and 1/,
  );
});

test("bench measurements produce the requested first-fret nut action", () => {
  const profile = calculateActionProfileFromBenchMeasurements(benchMeasurements);
  assert.ok(Math.abs(profile[1].clearanceAboveFretMm - 0.25) < 1e-12);
});

test("bench measurements produce the requested capoed action", () => {
  const saddleStringHeightMm = calculateSaddleStringHeightMm(benchMeasurements);
  const firstFretPositionMm = calculateFretPositionMm(benchMeasurements.scaleLengthMm, 1);
  const measurementPositionMm = calculateFretPositionMm(benchMeasurements.scaleLengthMm, 12);
  const progress = (measurementPositionMm - firstFretPositionMm)
    / (benchMeasurements.scaleLengthMm - firstFretPositionMm);
  const capoedStringHeightMm = saddleStringHeightMm * progress;
  const fretSurfaceHeightMm = -calculateReliefBelowReferenceMm(benchMeasurements, 12);
  const capoedActionMm = capoedStringHeightMm - fretSurfaceHeightMm;
  assert.ok(Math.abs(capoedActionMm - 1.8) < 1e-12);
});

test("open-string action is distinct from the capoed action anchor", () => {
  const profile = calculateActionProfileFromBenchMeasurements(benchMeasurements);
  assert.ok(profile[12].clearanceAboveFretMm > 1.8);
});

test("sparse action measurements are exact and preserve the book boundaries", () => {
  const profile = calculateActionProfileFromBenchMeasurements(benchMeasurements);
  const measuredClearanceMm = profile[8].clearanceAboveFretMm + 0.2;
  const calibrated = calibrateActionProfileFromSparseMeasurements(profile, [{
    fretNumber: 8,
    clearanceAboveFretMm: measuredClearanceMm,
  }]);

  assert.equal(calibrated[0].clearanceAboveFretMm, profile[0].clearanceAboveFretMm);
  assert.equal(calibrated[8].clearanceAboveFretMm, measuredClearanceMm);
  assert.equal(calibrated[22].clearanceAboveFretMm, profile[22].clearanceAboveFretMm);
  assert.ok(calibrated[7].clearanceAboveFretMm > profile[7].clearanceAboveFretMm);
  assert.ok(calibrated[9].clearanceAboveFretMm > profile[9].clearanceAboveFretMm);
});

test("sparse action corrections interpolate between measured frets", () => {
  const profile = calculateActionProfileFromBenchMeasurements(benchMeasurements);
  const calibrated = calibrateActionProfileFromSparseMeasurements(profile, [
    {
      fretNumber: 5,
      clearanceAboveFretMm: profile[5].clearanceAboveFretMm + 0.1,
    },
    {
      fretNumber: 9,
      clearanceAboveFretMm: profile[9].clearanceAboveFretMm + 0.3,
    },
  ]);
  const progress = (profile[7].positionMm - profile[5].positionMm)
    / (profile[9].positionMm - profile[5].positionMm);
  const expectedCorrectionMm = 0.1 + (0.3 - 0.1) * progress;
  assert.ok(Math.abs(
    calibrated[7].clearanceAboveFretMm
      - profile[7].clearanceAboveFretMm
      - expectedCorrectionMm,
  ) < 1e-12);
});

test("sparse action calibration rejects repeated and out-of-range measurements", () => {
  const profile = calculateActionProfileFromBenchMeasurements(benchMeasurements);
  assert.throws(() => calibrateActionProfileFromSparseMeasurements(profile, [
    { fretNumber: 8, clearanceAboveFretMm: 1.2 },
    { fretNumber: 8, clearanceAboveFretMm: 1.3 },
  ]), /measurement fretNumber must be unique/);
  assert.throws(() => calibrateActionProfileFromSparseMeasurements(profile, [
    { fretNumber: 23, clearanceAboveFretMm: 1.2 },
  ]), /measurement fretNumber must be in the action profile/);
});

test("invalid measurement order and impossible derived action are rejected", () => {
  assert.throws(() => calculateActionProfileFromBenchMeasurements({
    ...benchMeasurements,
    reliefFretNumber: 22,
  }), /reliefFretNumber must be before heldFretNumber/);
  assert.throws(() => calculateActionProfileFromBenchMeasurements({
    ...benchMeasurements,
    actionMeasurementFretNumber: 22,
  }), /actionMeasurementFretNumber must be before heldFretNumber/);
  assert.throws(() => calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: 1,
    stringCount: 3,
    stringDiameterMm: 2,
    firstStringActionMm: 0.1,
    firstStringDiameterMm: 0.2,
    lastStringActionMm: 0.1,
    lastStringDiameterMm: 0.2,
  }), /derived action must not be negative/);
});

test("radius arc height is zero at the outer strings and maximal between them", () => {
  const arc = (lateralPositionMm: number) => calculateRadiusArcHeightAboveChordMm({
    lateralPositionMm,
    firstLateralPositionMm: -18,
    lastLateralPositionMm: 18,
    radiusMm: 304.8,
  });
  assert.equal(arc(-18), 0);
  assert.equal(arc(18), 0);
  assert.ok(Math.abs(arc(0) - 18 * 18 / (2 * 304.8)) < 1e-12);
  assert.ok(arc(-9) > 0 && arc(-9) < arc(0));
});

test("a flat radius produces no arc height", () => {
  assert.equal(calculateRadiusArcHeightAboveChordMm({
    lateralPositionMm: 0,
    firstLateralPositionMm: -18,
    lastLateralPositionMm: 18,
    radiusMm: Infinity,
  }), 0);
});

test("arc height rejects positions outside the outer strings", () => {
  assert.throws(() => calculateRadiusArcHeightAboveChordMm({
    lateralPositionMm: 20,
    firstLateralPositionMm: -18,
    lastLateralPositionMm: 18,
    radiusMm: 304.8,
  }), /between the outer strings/);
});
