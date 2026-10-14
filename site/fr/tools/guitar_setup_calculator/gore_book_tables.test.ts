import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateResidualTonalErrorCents,
  optimizeEmpiricalAdjustmentFromReadings,
} from "./empirical_compensation.ts";

// Tables 4.7-1 and 4.7-2 as transcribed in docs/understanding-intonation.md.
// Transcription status: first-pass, pending a second independent transcription.
// These fixtures pin the equations against the book's published example; they
// are not authority over the transcription itself.

const SCALE_LENGTH_MM = 650;

// Measured cents errors, columns are strings 6..1, rows are frets 1..15.
const MEASURED_ERRORS: (number | null)[][] = [
  [6, 1, 0, -2, 0, 0],
  [9, 2, 0, -3, 0, 1],
  [10, -3, 2, -2, 2, 0],
  [2, -6, 0, -2, -1, -1],
  [0, 0, 1, -1, 4, -2],
  [-1.5, 0, 1, -2, 1, -1],
  [0.5, 6, 0, -3, 0, 0],
  [3, 9, 0, -2, 1, 0],
  [3, 9, 2, -3, 2, 0],
  [3, 9, 1, -2, 2, 0],
  [8, 9, 2, -2, 4, 0],
  [18, 9, 2, -2, 6, 2],
  [null, null, null, -1, 7, 2],
  [null, null, null, 0, 9, 3],
  [null, null, null, 0, 10, 5],
];

// Printed nut and saddle compensation, strings 6..1.
const PRINTED_COMPENSATION_MM: [number, number][] = [
  [1.1, 0.0], [-3.5, 3.6], [-0.8, 0.8], [-1.4, 0.5], [-4.1, 3.1], [-2.0, 1.3],
];

// Published residuals, strings 6..1, frets 1..15.
const PUBLISHED_RESIDUALS: (number | null)[][] = [
  [3, 0, 0, 0, 2, 2],
  [6, 0, 0, -1, 1, 2],
  [7, -5, 2, 0, 3, 1],
  [-1, -9, 0, 0, -1, 0],
  [-3, -4, 0, 1, 4, -1],
  [-4, -4, 0, 0, 0, -1],
  [-2, 1, -1, -1, -2, 0],
  [0, 3, -1, 0, -1, 0],
  [0, 2, 1, -1, -1, 0],
  [0, 1, -1, 0, -2, -1],
  [5, 0, 0, -1, -1, -1],
  [15, -1, 0, -1, 0, 0],
  [null, null, null, 0, 0, 0],
  [null, null, null, 1, 1, 1],
  [null, null, null, 1, 1, 2],
];

function readingsForString(column: number) {
  return MEASURED_ERRORS
    .map((row, index) => ({ fretNumber: index + 1, measuredErrorCents: row[column] }))
    .filter((reading): reading is { fretNumber: number; measuredErrorCents: number } => (
      reading.measuredErrorCents !== null
    ));
}

test("equations 4.7-2..4 reproduce the published residual table from the printed compensation", () => {
  let exact = 0;
  let offByOne = 0;
  let total = 0;
  for (let column = 0; column < 6; column += 1) {
    const [nutMm, saddleMm] = PRINTED_COMPENSATION_MM[column];
    const geometry = {
      scaleLengthMm: SCALE_LENGTH_MM,
      nutCompensationMm: nutMm,
      saddleCompensationMm: saddleMm,
    };
    for (let row = 0; row < 15; row += 1) {
      const measured = MEASURED_ERRORS[row][column];
      const published = PUBLISHED_RESIDUALS[row][column];
      if (measured === null || published === null) continue;
      total += 1;
      const residual = Math.round(
        calculateResidualTonalErrorCents(measured, geometry, row + 1),
      );
      const difference = Math.abs(residual - published);
      if (difference === 0) exact += 1;
      else if (difference === 1) offByOne += 1;
      else assert.fail(`string ${6 - column} fret ${row + 1}: off by ${difference} cents`);
    }
  }
  // Consistent with the source computing from unrounded optimizer output.
  assert.equal(total, 81);
  assert.equal(exact, 73);
  assert.equal(offByOne, 8);
});

test("the empirical optimizer matches or beats the printed compensation on every string", () => {
  const search = {
    bounds: { nutMinimumMm: -5, nutMaximumMm: 5, saddleMinimumMm: -5, saddleMaximumMm: 5 },
    divisionsPerAxis: 100,
    refinementPasses: 6,
  };
  for (let column = 0; column < 6; column += 1) {
    const readings = readingsForString(column);
    const [printedNutMm, printedSaddleMm] = PRINTED_COMPENSATION_MM[column];
    const printedL1 = readings.reduce((totalCents, reading) => totalCents + Math.abs(
      calculateResidualTonalErrorCents(reading.measuredErrorCents, {
        scaleLengthMm: SCALE_LENGTH_MM,
        nutCompensationMm: printedNutMm,
        saddleCompensationMm: printedSaddleMm,
      }, reading.fretNumber),
    ), 0);
    const ours = optimizeEmpiricalAdjustmentFromReadings({
      scaleLengthMm: SCALE_LENGTH_MM,
      readings,
      search,
    });
    assert.ok(
      ours.totalAbsoluteResidualCents <= printedL1 + 1e-6,
      `string ${6 - column}: ${ours.totalAbsoluteResidualCents} vs printed ${printedL1}`,
    );
    assert.ok(Math.abs(ours.nutAdjustmentMm - printedNutMm) < 0.5, `string ${6 - column} nut`);
    assert.ok(
      Math.abs(ours.saddleAdjustmentMm - printedSaddleMm) < 0.5,
      `string ${6 - column} saddle`,
    );
  }
});
