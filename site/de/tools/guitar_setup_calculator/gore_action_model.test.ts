import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateGoreActionAtFretMm,
  calculateGoreActionProfileMm,
  calculateGoreActionRadiusMm,
  calculateGoreCircularComponentMm,
  calculateGoreEllipseMinorAxisMm,
  calculateGoreEllipticalComponentMm,
  calculateGoreLastFretActionMm,
  calculateGoreLinearComponentMm,
  calculateGoreNeckParabolaComponentMm,
} from "./gore_action_model.ts";
import {
  GORE_REFERENCE_BOUNDS,
  optimizeGoreCompensation,
} from "./gore_compensation.ts";

// Sixth-string tab of the companion worksheet (Batch 6 in
// docs/understanding-intonation.md). Values are the sheet's own cached cell
// results at full precision; deltaC is back-derived from the yp column
// (yp1 / (x1 * (xLast - x1))) because the summary shows it rounded.
const WORKSHEET_INPUT = {
  scaleLengthMm: 645.16,
  lastFretNumber: 18,
  nutHeightMm: 0.1,
  reliefMm: 0.1,
  reliefFretNumber: 7,
  actionMm: 2.8,
  actionFretNumber: 12,
  neckDeflectionConstantPerMm: 3.086817e-6,
};

// Columns yc, he, yl, yp, d_prbl, d_book for frets 0..18.
const WORKSHEET_COLUMNS: [number, number, number, number, number, number][] = [
  [0, 0, 0.1, 0, 0.1, 0.1037],
  [0.0381840045, 0.0891564737, 0.4030787115, 0.0425691677, 0.4456478793, 0.481662863],
  [0.0675639325, 0.1076194651, 0.689146922, 0.0753231791, 0.7644701012, 0.802237057],
  [0.0893606424, 0.1142166146, 0.9591593576, 0.0996230952, 1.058782453, 1.096436882],
  [0.1046471837, 0.1148788094, 1.21401716, 0.1166651952, 1.330682355, 1.368698791],
  [0.1143657434, 0.111980824, 1.454570892, 0.1274998683, 1.582070761, 1.621563299],
  [0.1193426976, 0.1067703133, 1.681623382, 0.1330483935, 1.814671775, 1.856899952],
  [0.1203019772, 0.1, 1.895932394, 0.1341178401, 2.030050234, 2.076232881],
  [0.1178769346, 0.0921636682, 2.098213165, 0.1314142971, 2.229627462, 2.280867354],
  [0.112620877, 0.0836036229, 2.289140789, 0.1255546152, 2.414695405, 2.471951249],
  [0.1050164136, 0.0745663943, 2.46935247, 0.1170768288, 2.586429298, 2.650509915],
  [0.0954837491, 0.0652344052, 2.639449645, 0.1064494003, 2.745899045, 2.817468359],
  [0.0843880389, 0.055745266, 2.8, 0.0940794212, 2.894079421, 2.973666653],
  [0.0720459122, 0.0462041845, 2.951539356, 0.0803198839, 3.03185924, 3.11987136],
  [0.0587312535, 0.0366923002, 3.094573461, 0.0654761269, 3.160049588, 3.256784456],
  [0.0446803267, 0.0272724836, 3.229579679, 0.0498115476, 3.279391226, 3.385050532],
  [0.0300963135, 0.0179934921, 3.35700858, 0.0335526618, 3.390561242, 3.5052628],
  [0.0151533332, 0.0088930223, 3.477285446, 0.0168935854, 3.494179032, 3.617968185],
  [0, 0, 3.590811691, 0, 3.590811691, 3.723671723],
];

test("the action radius and ellipse axis reproduce the worksheet exactly", () => {
  assert.ok(Math.abs(calculateGoreActionRadiusMm(WORKSHEET_INPUT) - 180_581.5972) < 0.05);
  assert.ok(Math.abs(calculateGoreEllipseMinorAxisMm(WORKSHEET_INPUT) - 0.2779722357) < 1e-9);
  assert.ok(Math.abs(calculateGoreLastFretActionMm(WORKSHEET_INPUT) - 3.590811691) < 1e-8);
});

test("every component column reproduces the worksheet at every fret", () => {
  WORKSHEET_COLUMNS.forEach(([yc, he, yl, yp, dParabola, dBook], fretNumber) => {
    const tolerance = 1e-6;
    assert.ok(
      Math.abs(calculateGoreCircularComponentMm(WORKSHEET_INPUT, fretNumber) - yc) < tolerance,
      `yc fret ${fretNumber}`,
    );
    assert.ok(
      Math.abs(calculateGoreEllipticalComponentMm(WORKSHEET_INPUT, fretNumber) - he) < tolerance,
      `he fret ${fretNumber}`,
    );
    assert.ok(
      Math.abs(calculateGoreLinearComponentMm(WORKSHEET_INPUT, fretNumber) - yl) < tolerance,
      `yl fret ${fretNumber}`,
    );
    assert.ok(
      Math.abs(
        calculateGoreNeckParabolaComponentMm(WORKSHEET_INPUT, fretNumber) - yp,
      ) < tolerance,
      `yp fret ${fretNumber}`,
    );
    assert.ok(
      Math.abs(
        calculateGoreActionAtFretMm(WORKSHEET_INPUT, fretNumber, "parabola") - dParabola,
      ) < tolerance,
      `d_parabola fret ${fretNumber}`,
    );
    assert.ok(
      Math.abs(
        calculateGoreActionAtFretMm(WORKSHEET_INPUT, fretNumber, "circleEllipse") - dBook,
      ) < tolerance,
      `d_book fret ${fretNumber}`,
    );
  });
});

test("the generated parabola profile drives the optimizer onto the worksheet compensation", () => {
  const profile = calculateGoreActionProfileMm(WORKSHEET_INPUT, "parabola");
  const optimized = optimizeGoreCompensation({
    input: {
      scaleLengthMm: 645.16,
      openFrequencyHz: 440 * 2 ** ((40 - 69) / 12),
      actionByFretMm: profile.map((point) => point.clearanceAboveFretMm),
      unitMassKgPerMeter: 9.739e-3,
      axialStiffnessN: 30_313,
      extraStringLengthMm: 710.2 - 645.16,
      fingerDeflectionMm: 0.5,
      playingPressure: 0.75,
    },
    bounds: GORE_REFERENCE_BOUNDS,
  });
  assert.ok(Math.abs(optimized.nutCompensationMm - 1.23) < 0.05);
  assert.ok(Math.abs(optimized.saddleCompensationMm - 2.47) < 0.05);
});

test("the action model rejects nonsensical layouts", () => {
  assert.throws(() => calculateGoreActionProfileMm({
    ...WORKSHEET_INPUT,
    reliefFretNumber: 18,
  }), /between fret 1 and the last fret/);
  assert.throws(() => calculateGoreActionProfileMm({
    ...WORKSHEET_INPUT,
    actionFretNumber: 18,
  }), /before the last fret/);
  assert.throws(() => calculateGoreActionAtFretMm(WORKSHEET_INPUT, 19), /between the nut/);
});
