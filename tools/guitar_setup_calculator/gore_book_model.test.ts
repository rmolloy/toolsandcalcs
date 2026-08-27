import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateGoreBookFretState,
  calculateGoreBookFrettedPathMm,
  calculateGoreBookTotalAbsoluteLengthErrorMm,
  GORE_BOOK_REFERENCE_BOUNDS,
  optimizeGoreBookCompensation,
} from "./gore_book_model.ts";
import { optimizeGoreCompensation } from "./gore_compensation.ts";

const referenceInput = {
  scaleLengthMm: 645.16,
  openFrequencyHz: 440 * 2 ** ((55 - 69) / 12),
  actionByFretMm: [
    0.1, 0.401, 0.677, 0.931, 1.166, 1.381, 1.580, 1.764, 1.934,
    2.090, 2.235, 2.370, 2.494, 2.609, 2.716, 2.816, 2.908, 2.994, 3.074,
  ],
  unitMassKgPerMeter: 0.002074,
  axialStiffnessN: 17726,
  stretchableLengthMm: 645.16 + 120,
  fingerRestDeflectionMm: 0.5,
  playerPressureFactor: 0.75,
};
const allFrets = Array.from({ length: 18 }, (_, index) => index + 1);

test("the book optimizer minimizes absolute stopped-length error (4.7-37)", () => {
  const result = optimizeGoreBookCompensation({ input: referenceInput, fretNumbers: allFrets });
  assert.ok(Math.abs(result.nutCompensationMm - 0.541352) < 1e-4);
  assert.ok(Math.abs(result.saddleCompensationMm - 0.781378) < 1e-4);
  assert.ok(Math.abs(result.totalAbsoluteLengthErrorMm - 0.070650) < 1e-4);
  // Any perturbation of the optimum must not reduce the 4.7-37 objective.
  for (const [dNut, dSaddle] of [[0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05]]) {
    const perturbed = calculateGoreBookTotalAbsoluteLengthErrorMm(
      referenceInput,
      allFrets,
      result.nutCompensationMm + dNut,
      result.saddleCompensationMm + dSaddle,
    );
    assert.ok(perturbed >= result.totalAbsoluteLengthErrorMm - 1e-9);
  }
});

test("the selected fret range is part of the objective, not a report filter", () => {
  const full = optimizeGoreBookCompensation({ input: referenceInput, fretNumbers: allFrets });
  const lowRange = optimizeGoreBookCompensation({
    input: referenceInput,
    fretNumbers: allFrets.slice(0, 8),
  });
  assert.notEqual(full.nutCompensationMm.toFixed(4), lowRange.nutCompensationMm.toFixed(4));
  assert.notEqual(full.saddleCompensationMm.toFixed(4), lowRange.saddleCompensationMm.toFixed(4));
  assert.equal(lowRange.states.length, 8);
  const lowRangeLengthErrorMm = calculateGoreBookTotalAbsoluteLengthErrorMm(
    referenceInput,
    allFrets.slice(0, 8),
    full.nutCompensationMm,
    full.saddleCompensationMm,
  );
  assert.ok(lowRange.totalAbsoluteLengthErrorMm <= lowRangeLengthErrorMm + 1e-9);
});

test("the book optimum stays near the supplied cents-domain reference", () => {
  const book = optimizeGoreBookCompensation({ input: referenceInput, fretNumbers: allFrets });
  const legacy = optimizeGoreCompensation({
    input: {
      scaleLengthMm: referenceInput.scaleLengthMm,
      openFrequencyHz: referenceInput.openFrequencyHz,
      actionByFretMm: referenceInput.actionByFretMm,
      unitMassKgPerMeter: referenceInput.unitMassKgPerMeter,
      axialStiffnessN: referenceInput.axialStiffnessN,
      extraStringLengthMm: 120,
      fingerDeflectionMm: referenceInput.fingerRestDeflectionMm,
      playingPressure: referenceInput.playerPressureFactor,
    },
  });
  assert.ok(Math.abs(book.nutCompensationMm - legacy.nutCompensationMm) < 0.05);
  assert.ok(Math.abs(book.saddleCompensationMm - legacy.saddleCompensationMm) < 0.05);
});

test("saddle-only compensation zeroed at fret 12 reproduces the Figure 4.7-1 shape", () => {
  const saddleOnly = optimizeGoreBookCompensation({
    input: referenceInput,
    fretNumbers: [12],
    initialNutCompensationMm: 0,
    bounds: { ...GORE_BOOK_REFERENCE_BOUNDS, nutMinMm: 0, nutMaxMm: 0 },
  });
  assert.equal(saddleOnly.nutCompensationMm, 0);
  assert.ok(Math.abs(saddleOnly.states[0].centsError) < 0.01);
  const errors = allFrets.map((fretNumber) => calculateGoreBookFretState(
    referenceInput,
    fretNumber,
    0,
    saddleOnly.saddleCompensationMm,
  ).centsError);
  assert.ok(errors[0] > 0.5);
  assert.ok(errors[1] > 0.5);
  assert.ok(errors[17] < -0.5);
  assert.ok(Math.max(...errors.slice(0, 5)) > Math.max(...errors.slice(12)));
});

test("fretting always lengthens the string path", () => {
  for (const fretNumber of allFrets) {
    const pathMm = calculateGoreBookFrettedPathMm(referenceInput, fretNumber, 0, 0);
    assert.ok(pathMm > referenceInput.scaleLengthMm, `fret ${fretNumber}`);
  }
});

test("book inputs are validated at the library boundary", () => {
  assert.throws(() => optimizeGoreBookCompensation({
    input: referenceInput,
    fretNumbers: [],
  }), /at least one fret/);
  assert.throws(() => optimizeGoreBookCompensation({
    input: referenceInput,
    fretNumbers: [3, 3],
  }), /must not repeat/);
  assert.throws(() => optimizeGoreBookCompensation({
    input: referenceInput,
    fretNumbers: [99],
  }), /outside actionByFretMm/);
  assert.throws(() => optimizeGoreBookCompensation({
    input: { ...referenceInput, playerPressureFactor: 1.2 },
    fretNumbers: allFrets,
  }), /between 0 and 1/);
  assert.throws(() => optimizeGoreBookCompensation({
    input: { ...referenceInput, axialStiffnessN: 0 },
    fretNumbers: allFrets,
  }), /must be positive/);
});
