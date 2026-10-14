import assert from "node:assert/strict";
import test from "node:test";

import { deriveMeasurementRung, type SetupInputGroup } from "./measurement_rung.ts";

function measured(...groups: SetupInputGroup[]): ReadonlySet<SetupInputGroup> {
  return new Set(groups);
}

test("nothing measured stays on rung 1 with the starting-reference label", () => {
  const state = deriveMeasurementRung({ measuredGroups: measured() });
  assert.equal(state.rung, 1);
  assert.equal(state.basisLine, "Setup from profile defaults");
  assert.equal(state.compensationLabel, "starting reference");
  assert.equal(state.nutActionState, "modeled");
});

test("partial geometry keeps the lower rung", () => {
  const state = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength"),
  });
  assert.equal(state.rung, 1);
});

test("complete geometry reaches rung 2 with modeled nut action named", () => {
  const state = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength", "bridgeAction"),
  });
  assert.equal(state.rung, 2);
  assert.equal(state.basisLine, "Setup from your geometry · nut action modeled from radius");
  assert.equal(state.nutActionState, "modeled");
});

test("a measured nut action clears the modeled suffix without changing the rung", () => {
  const state = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength", "bridgeAction", "nutAction"),
  });
  assert.equal(state.rung, 2);
  assert.equal(state.basisLine, "Setup from your geometry");
  assert.equal(state.nutActionState, "measured");
});

test("rung 3 needs confirmed string specification and a mass source together", () => {
  for (const massGroup of ["unitMass", "stiffness"] as const) {
    const state = deriveMeasurementRung({
      measuredGroups: measured("relief", "scaleLength", "bridgeAction", "stringSpecification", massGroup),
    });
    assert.equal(state.rung, 3, massGroup);
    assert.equal(state.basisLine, "Setup from your geometry and strings");
    assert.equal(state.compensationLabel, "modeled for your strings");
  }
  const specificationOnly = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength", "bridgeAction", "stringSpecification"),
  });
  assert.equal(specificationOnly.rung, 2);
  const massOnly = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength", "bridgeAction", "unitMass"),
  });
  assert.equal(massOnly.rung, 2);
});

test("measured intonation readings reach rung 4 only on top of rung 3", () => {
  const rungFour = deriveMeasurementRung({
    measuredGroups: measured(
      "relief", "scaleLength", "bridgeAction", "stringSpecification", "unitMass",
    ),
    hasMeasuredIntonationReadings: true,
  });
  assert.equal(rungFour.rung, 4);
  assert.equal(rungFour.basisLine, "Optimized from measured intonation · current strings");
  assert.equal(rungFour.compensationLabel, "adjustment to this instrument");

  const withoutStrings = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength", "bridgeAction"),
    hasMeasuredIntonationReadings: true,
  });
  assert.equal(withoutStrings.rung, 2);
});

test("removing a measurement demotes the rung immediately", () => {
  const before = deriveMeasurementRung({
    measuredGroups: measured(
      "relief", "scaleLength", "bridgeAction", "stringSpecification", "unitMass",
    ),
  });
  const after = deriveMeasurementRung({
    measuredGroups: measured("relief", "scaleLength", "stringSpecification", "unitMass"),
  });
  assert.equal(before.rung, 3);
  assert.equal(after.rung, 1);
});
