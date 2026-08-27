import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCombinedCompensationTonalShiftCents,
  calculateCompensatedOpenStringLengthMm,
  calculateNutCompensationTonalShiftCents,
  calculateResidualTonalErrorCents,
  calculateSaddleCompensationTonalShiftCents,
  calculateStringLengthChangeMmForCents,
  calculateTotalAbsoluteResidualCents,
  optimizeEmpiricalAdjustmentFromReadings,
  optimizeEmpiricalCompensation,
  readingsFromDenseErrors,
} from "./empirical_compensation.ts";

test("equation 4.7-1 reproduces the published one-cent scale example", () => {
  const lengthChangeMm = calculateStringLengthChangeMmForCents(650, 1);

  assert.ok(Math.abs(lengthChangeMm - 0.3753) < 0.0001);
});

test("compensated length follows the published nut and saddle sign convention", () => {
  const compensatedLengthMm = calculateCompensatedOpenStringLengthMm({
    scaleLengthMm: 650,
    nutCompensationMm: 1.5,
    saddleCompensationMm: 3,
  });

  assert.equal(compensatedLengthMm, 651.5);
});

test("equation 4.7-2 applies one constant tonal shift from nut compensation", () => {
  const shiftCents = calculateNutCompensationTonalShiftCents({
    scaleLengthMm: 650,
    nutCompensationMm: -1,
    saddleCompensationMm: 0,
  });

  assert.ok(Math.abs(shiftCents - 2.6601138206) < 1e-9);
});

test("equation 4.7-3 doubles the saddle shift one octave higher", () => {
  const geometry = {
    scaleLengthMm: 650,
    nutCompensationMm: 0,
    saddleCompensationMm: 3,
  };

  const firstFretShift = calculateSaddleCompensationTonalShiftCents(geometry, 1);
  const thirteenthFretShift = calculateSaddleCompensationTonalShiftCents(geometry, 13);

  assert.ok(Math.abs(thirteenthFretShift - 2 * firstFretShift) < 1e-12);
});

test("equation 4.7-4 combines the nut and saddle tonal shifts", () => {
  const geometry = {
    scaleLengthMm: 650,
    nutCompensationMm: -1,
    saddleCompensationMm: 3,
  };

  const combinedShift = calculateCombinedCompensationTonalShiftCents(geometry, 7);
  const componentSum =
    calculateNutCompensationTonalShiftCents(geometry) +
    calculateSaddleCompensationTonalShiftCents(geometry, 7);

  assert.equal(combinedShift, componentSum);
});

test("a fret residual adds the measured error to the compensation shift", () => {
  const geometry = {
    scaleLengthMm: 650,
    nutCompensationMm: -1,
    saddleCompensationMm: 3,
  };

  const residualCents = calculateResidualTonalErrorCents(4.5, geometry, 7);
  const expectedCents = 4.5 + calculateCombinedCompensationTonalShiftCents(geometry, 7);

  assert.equal(residualCents, expectedCents);
});

test("equation 4.7-5 sums absolute residuals without sharp-flat cancellation", () => {
  const totalResidualCents = calculateTotalAbsoluteResidualCents([3, -2, 1], {
    scaleLengthMm: 650,
    nutCompensationMm: 0,
    saddleCompensationMm: 0,
  });

  assert.equal(totalResidualCents, 6);
});

test("the empirical equation helpers reject invalid measurement inputs", () => {
  assert.throws(
    () => calculateCompensatedOpenStringLengthMm({
      scaleLengthMm: 0,
      nutCompensationMm: 0,
      saddleCompensationMm: 0,
    }),
    RangeError,
  );
  assert.throws(
    () => calculateCompensatedOpenStringLengthMm({
      scaleLengthMm: 10,
      nutCompensationMm: 11,
      saddleCompensationMm: 0,
    }),
    RangeError,
  );
  assert.throws(() => calculateStringLengthChangeMmForCents(0, 1), RangeError);
  assert.throws(() => calculateStringLengthChangeMmForCents(650, Number.NaN), RangeError);
  assert.throws(
    () => calculateSaddleCompensationTonalShiftCents({
      scaleLengthMm: 650,
      nutCompensationMm: 0,
      saddleCompensationMm: 1,
    }, 0),
    RangeError,
  );
  assert.throws(
    () => calculateResidualTonalErrorCents(Number.NaN, {
      scaleLengthMm: 650,
      nutCompensationMm: 0,
      saddleCompensationMm: 0,
    }, 1),
    RangeError,
  );
  assert.throws(
    () => calculateTotalAbsoluteResidualCents([], {
      scaleLengthMm: 650,
      nutCompensationMm: 0,
      saddleCompensationMm: 0,
    }),
    RangeError,
  );
});

test("the bounded empirical search recovers a known compensation geometry", () => {
  const expectedGeometry = {
    scaleLengthMm: 650,
    nutCompensationMm: -1.25,
    saddleCompensationMm: 2.75,
  };
  const measuredErrorsCentsByFret = Array.from({ length: 15 }, (_, index) =>
    -calculateCombinedCompensationTonalShiftCents(expectedGeometry, index + 1));

  const result = optimizeEmpiricalCompensation({
    scaleLengthMm: 650,
    measuredErrorsCentsByFret,
    search: {
      bounds: {
        nutMinimumMm: -5,
        nutMaximumMm: 5,
        saddleMinimumMm: -5,
        saddleMaximumMm: 5,
      },
      divisionsPerAxis: 20,
      refinementPasses: 6,
    },
  });

  assert.deepEqual(result.geometry, expectedGeometry);
  assert.equal(result.totalAbsoluteResidualCents, 0);
  assert.deepEqual(result.residualCentsByFret, Array(15).fill(0));
});

test("the empirical optimizer rejects invalid search inputs", () => {
  const optimize = ({
    scaleLengthMm = 650,
    measuredErrorsCentsByFret = [0],
    bounds = {
      nutMinimumMm: -5,
      nutMaximumMm: 5,
      saddleMinimumMm: -5,
      saddleMaximumMm: 5,
    },
    divisionsPerAxis = 10,
    refinementPasses = 2,
  } = {}) => optimizeEmpiricalCompensation({
    scaleLengthMm,
    measuredErrorsCentsByFret,
    search: { bounds, divisionsPerAxis, refinementPasses },
  });

  assert.throws(() => optimize({ scaleLengthMm: 0 }), RangeError);
  assert.throws(() => optimize({ measuredErrorsCentsByFret: [] }), RangeError);
  assert.throws(() => optimize({ measuredErrorsCentsByFret: [Number.NaN] }), RangeError);
  assert.throws(() => optimize({
    bounds: {
      nutMinimumMm: Number.NaN,
      nutMaximumMm: 5,
      saddleMinimumMm: -5,
      saddleMaximumMm: 5,
    },
  }), RangeError);
  assert.throws(() => optimize({
    bounds: {
      nutMinimumMm: 5,
      nutMaximumMm: -5,
      saddleMinimumMm: -5,
      saddleMaximumMm: 5,
    },
  }), RangeError);
  assert.throws(() => optimize({
    bounds: {
      nutMinimumMm: -5,
      nutMaximumMm: 5,
      saddleMinimumMm: 5,
      saddleMaximumMm: -5,
    },
  }), RangeError);
  assert.throws(() => optimize({
    scaleLengthMm: 10,
    bounds: {
      nutMinimumMm: 10,
      nutMaximumMm: 11,
      saddleMinimumMm: 0,
      saddleMaximumMm: 1,
    },
  }), RangeError);
  assert.throws(() => optimize({ divisionsPerAxis: 1 }), RangeError);
  assert.throws(() => optimize({ refinementPasses: 0 }), RangeError);
});

test("an equal empirical fit prefers less physical compensation movement", () => {
  const zeroMovementGeometry = {
    scaleLengthMm: 650,
    nutCompensationMm: 0,
    saddleCompensationMm: 0,
  };
  const movedGeometry = {
    scaleLengthMm: 650,
    nutCompensationMm: 0.5,
    saddleCompensationMm: 0,
  };
  const measuredErrorCents = -(
    calculateNutCompensationTonalShiftCents(zeroMovementGeometry) +
    calculateNutCompensationTonalShiftCents(movedGeometry)
  ) / 2;

  const result = optimizeEmpiricalCompensation({
    scaleLengthMm: 650,
    measuredErrorsCentsByFret: [measuredErrorCents],
    search: {
      bounds: {
        nutMinimumMm: 0,
        nutMaximumMm: 1,
        saddleMinimumMm: 0,
        saddleMaximumMm: 0,
      },
      divisionsPerAxis: 2,
      refinementPasses: 1,
    },
  });

  assert.deepEqual(result.geometry, zeroMovementGeometry);
});

test("sparse readings reach the same optimum as the equivalent dense errors", () => {
  const scaleLengthMm = 645.16;
  const search = {
    bounds: { nutMinimumMm: -2, nutMaximumMm: 2, saddleMinimumMm: -2, saddleMaximumMm: 2 },
    divisionsPerAxis: 20,
    refinementPasses: 4,
  };
  const denseErrors = [4.2, 3.1, 2.4, 1.9, 1.5, 1.2];
  const dense = optimizeEmpiricalCompensation({
    scaleLengthMm,
    measuredErrorsCentsByFret: denseErrors,
    search,
  });
  const sparse = optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm,
    readings: readingsFromDenseErrors(denseErrors),
    search,
  });
  assert.equal(sparse.nutAdjustmentMm, dense.geometry.nutCompensationMm);
  assert.equal(sparse.saddleAdjustmentMm, dense.geometry.saddleCompensationMm);
  assert.equal(sparse.totalAbsoluteResidualCents, dense.totalAbsoluteResidualCents);
});

test("the bench protocol subset optimizes without dense measurements", () => {
  const result = optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: 645.16,
    readings: [
      { fretNumber: 1, measuredErrorCents: 5.5 },
      { fretNumber: 2, measuredErrorCents: 4.6 },
      { fretNumber: 3, measuredErrorCents: 3.9 },
      { fretNumber: 4, measuredErrorCents: 3.4 },
      { fretNumber: 5, measuredErrorCents: 3.0 },
      { fretNumber: 12, measuredErrorCents: 1.8 },
    ],
    search: {
      bounds: { nutMinimumMm: -3, nutMaximumMm: 3, saddleMinimumMm: -3, saddleMaximumMm: 3 },
      divisionsPerAxis: 24,
      refinementPasses: 5,
    },
  });
  assert.equal(result.residualCentsByReading.length, 6);
  assert.equal(result.residualCentsByReading[5].fretNumber, 12);
  const measuredTotalCents = 5.5 + 4.6 + 3.9 + 3.4 + 3.0 + 1.8;
  assert.ok(result.totalAbsoluteResidualCents < measuredTotalCents / 2);
  assert.ok(Math.abs(result.nutAdjustmentMm) <= 3);
  assert.ok(Math.abs(result.saddleAdjustmentMm) <= 3);
});

test("readings reject repeats, bad frets, and non-finite cents", () => {
  const search = {
    bounds: { nutMinimumMm: -2, nutMaximumMm: 2, saddleMinimumMm: -2, saddleMaximumMm: 2 },
    divisionsPerAxis: 8,
    refinementPasses: 2,
  };
  assert.throws(() => optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: 645.16,
    readings: [],
    search,
  }), /at least one measured fret/);
  assert.throws(() => optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: 645.16,
    readings: [
      { fretNumber: 3, measuredErrorCents: 1 },
      { fretNumber: 3, measuredErrorCents: 2 },
    ],
    search,
  }), /must not repeat a fret/);
  assert.throws(() => optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: 645.16,
    readings: [{ fretNumber: 0, measuredErrorCents: 1 }],
    search,
  }), /positive integer/);
  assert.throws(() => optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: 645.16,
    readings: [{ fretNumber: 1, measuredErrorCents: Number.NaN }],
    search,
  }), /must be finite/);
});
