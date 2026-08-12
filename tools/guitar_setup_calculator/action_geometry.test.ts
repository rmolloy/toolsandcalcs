import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateActionFromTopOfStringEnvelopeMm,
  calculateActionProfileFromBenchMeasurements,
  calculateFretPositionMm,
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

test("invalid measurement order and impossible derived action are rejected", () => {
  assert.throws(() => calculateActionProfileFromBenchMeasurements({
    ...benchMeasurements,
    reliefFretNumber: 22,
  }), /reliefFretNumber must be before heldFretNumber/);
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
