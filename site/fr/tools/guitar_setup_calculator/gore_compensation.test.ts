import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateGoreCentsError,
  GORE_REFERENCE_BOUNDS,
  optimizeGoreCompensation,
} from "./gore_compensation.ts";

const referenceInput = {
  scaleLengthMm: 645.16,
  openFrequencyHz: 440 * 2 ** ((55 - 69) / 12),
  actionByFretMm: [
    0.1, 0.401, 0.677, 0.931, 1.166, 1.381, 1.580, 1.764, 1.934,
    2.090, 2.235, 2.370, 2.494, 2.609, 2.716, 2.816, 2.908, 2.994,
    3.074,
  ],
  unitMassKgPerMeter: 0.002074,
  axialStiffnessN: 17726,
  extraStringLengthMm: 120,
  fingerDeflectionMm: 0.5,
  playingPressure: 0.75,
};

test("Gore fret error matches the supplied reference equation", () => {
  const error = calculateGoreCentsError(referenceInput, 12, 0.5370650916327806, 0.7560902917826148);
  assert.ok(Math.abs(error - 0.012675497831676073) < 1e-9);
});

test("Gore optimizer reaches the supplied SLSQP reference result", () => {
  const result = optimizeGoreCompensation({
    input: referenceInput,
    initialNutCompensationMm: 0.56,
    initialSaddleCompensationMm: 0.75,
    bounds: GORE_REFERENCE_BOUNDS,
  });
  assert.ok(Math.abs(result.nutCompensationMm - 0.5370650916327806) < 0.0001);
  assert.ok(Math.abs(result.saddleCompensationMm - 0.7560902917826148) < 0.0001);
  assert.ok(Math.abs(result.totalAbsoluteErrorCents - 0.39204416022238925) < 0.0001);
  assert.equal(result.centsErrorByFret.length, referenceInput.actionByFretMm.length);
});

test("Gore optimizer preserves signed reference bounds", () => {
  const result = optimizeGoreCompensation({
    input: referenceInput,
    initialNutCompensationMm: -4,
    initialSaddleCompensationMm: -4,
    bounds: GORE_REFERENCE_BOUNDS,
  });
  assert.ok(result.nutCompensationMm >= -5 && result.nutCompensationMm <= 5);
  assert.ok(result.saddleCompensationMm >= -5 && result.saddleCompensationMm <= 5);
});

test("Gore input rejects an incomplete measured action profile", () => {
  assert.throws(() => optimizeGoreCompensation({
    input: { ...referenceInput, actionByFretMm: [0.1] },
  }), /actionByFretMm/);
});

test("Gore input rejects nonphysical tension and action values", () => {
  assert.throws(() => optimizeGoreCompensation({
    input: { ...referenceInput, unitMassKgPerMeter: 0 },
  }), /unitMassKgPerMeter/);
  assert.throws(() => optimizeGoreCompensation({
    input: { ...referenceInput, axialStiffnessN: -1 },
  }), /axialStiffnessN/);
  assert.throws(() => optimizeGoreCompensation({
    input: { ...referenceInput, actionByFretMm: [0.1, -0.1] },
  }), /actionByFretMm\[1\]/);
});

test("Gore bounds reject reversed ranges", () => {
  assert.throws(() => optimizeGoreCompensation({
    input: referenceInput,
    bounds: { ...GORE_REFERENCE_BOUNDS, nutMinMm: 1, nutMaxMm: -1 },
  }), /nut bounds are reversed/);
});
