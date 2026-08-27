import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateGoreCentsError,
  GORE_REFERENCE_BOUNDS,
  optimizeGoreCompensation,
} from "./gore_compensation.ts";
import { optimizeGoreBookCompensation } from "./gore_book_model.ts";

// Gore companion design worksheet, sixth-string tab (PB053), transcribed from
// the user's copy on 2026-08-25. See understanding-intonation.md, Batch 6.
// The selected action model in the worksheet is the parabola method; the k and
// mu values come from a measured core diameter (0.017 in) and the
// manufacturer tension chart. L_extra is the measured nut-to-tuner distance.

const WORKSHEET_ACTION_BY_FRET_MM = [
  0.100, 0.446, 0.764, 1.059, 1.331, 1.582, 1.815, 2.030, 2.230, 2.415,
  2.586, 2.746, 2.894, 3.032, 3.160, 3.279, 3.391, 3.494, 3.591,
];
const WORKSHEET_CENTS_BY_FRET = [
  -0.388, -0.087, -0.071, -0.045, -0.021, 0.000, 0.017, 0.030, 0.039,
  0.044, 0.045, 0.041, 0.032, 0.019, 0.000, -0.024, -0.054, -0.091,
];
const WORKSHEET_NUT_MM = 1.23;
const WORKSHEET_SADDLE_MM = 2.47;
const OPEN_E2_HZ = 440 * 2 ** ((40 - 69) / 12);
const SCALE_MM = 645.16;
const UNIT_MASS_KG_PER_M = 9.739e-3;
const STIFFNESS_N = 30_313;
const STRETCHABLE_MM = 710.2;
const ALL_FRETS = Array.from({ length: 18 }, (_, index) => index + 1);

const legacyInput = {
  scaleLengthMm: SCALE_MM,
  openFrequencyHz: OPEN_E2_HZ,
  actionByFretMm: WORKSHEET_ACTION_BY_FRET_MM,
  unitMassKgPerMeter: UNIT_MASS_KG_PER_M,
  axialStiffnessN: STIFFNESS_N,
  extraStringLengthMm: STRETCHABLE_MM - SCALE_MM,
  fingerDeflectionMm: 0.5,
  playingPressure: 0.75,
};

test("the cents path reproduces the worksheet's per-fret errors at its printed optimum", () => {
  for (const fretNumber of ALL_FRETS) {
    const centsError = calculateGoreCentsError(
      legacyInput,
      fretNumber,
      WORKSHEET_NUT_MM,
      WORKSHEET_SADDLE_MM,
    );
    assert.ok(
      Math.abs(centsError - WORKSHEET_CENTS_BY_FRET[fretNumber - 1]) < 0.25,
      `fret ${fretNumber}: ${centsError} vs worksheet ${WORKSHEET_CENTS_BY_FRET[fretNumber - 1]}`,
    );
  }
});

test("the cents optimizer lands on the worksheet's compensation from its exact inputs", () => {
  const optimized = optimizeGoreCompensation({
    input: legacyInput,
    bounds: GORE_REFERENCE_BOUNDS,
  });
  assert.ok(Math.abs(optimized.nutCompensationMm - WORKSHEET_NUT_MM) < 0.05);
  assert.ok(Math.abs(optimized.saddleCompensationMm - WORKSHEET_SADDLE_MM) < 0.05);
});

test("the book length objective lands within a tenth of a millimetre of the worksheet", () => {
  const optimized = optimizeGoreBookCompensation({
    input: {
      scaleLengthMm: SCALE_MM,
      openFrequencyHz: OPEN_E2_HZ,
      actionByFretMm: WORKSHEET_ACTION_BY_FRET_MM,
      unitMassKgPerMeter: UNIT_MASS_KG_PER_M,
      axialStiffnessN: STIFFNESS_N,
      stretchableLengthMm: STRETCHABLE_MM,
      fingerRestDeflectionMm: 0.5,
      playerPressureFactor: 0.75,
    },
    fretNumbers: ALL_FRETS,
  });
  assert.ok(Math.abs(optimized.nutCompensationMm - WORKSHEET_NUT_MM) < 0.1);
  assert.ok(Math.abs(optimized.saddleCompensationMm - WORKSHEET_SADDLE_MM) < 0.1);
  assert.ok(optimized.totalAbsoluteErrorCents < 1.2);
});

test("k = EA from the worksheet's measured cores reproduces its per-string stiffness", () => {
  // The worksheet derives k from measured core diameter and E = 207 GPa.
  // The third-string values (PB024) are the constants frozen in
  // reference/gore_reference.py, which ties the golden oracle to this tab.
  const CORE_MODULUS_PA = 207e9;
  const worksheetStrings = [
    { product: "PL012", coreDiameterIn: 0.012, stiffnessN: 15_104 },
    { product: "PL016", coreDiameterIn: 0.016, stiffnessN: 26_851 },
    { product: "PB024", coreDiameterIn: 0.013, stiffnessN: 17_726 },
    { product: "PB032", coreDiameterIn: 0.015, stiffnessN: 23_600 },
    { product: "PB042", coreDiameterIn: 0.016, stiffnessN: 26_851 },
    { product: "PB053", coreDiameterIn: 0.017, stiffnessN: 30_313 },
  ];
  for (const { product, coreDiameterIn, stiffnessN } of worksheetStrings) {
    const coreRadiusM = (coreDiameterIn * 25.4) / 2 / 1000;
    const calculatedStiffnessN = CORE_MODULUS_PA * Math.PI * coreRadiusM ** 2;
    assert.ok(
      Math.abs(calculatedStiffnessN - stiffnessN) / stiffnessN < 0.005,
      `${product}: ${calculatedStiffnessN.toFixed(0)} vs worksheet ${stiffnessN}`,
    );
  }
});
