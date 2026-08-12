import assert from "node:assert/strict";
import test from "node:test";

import {
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs";

test("string provenance keeps scale, mass, stiffness, and specification separate", () => {
  assert.equal(provenanceGroupForInput(stringInput("scaleLengthMm")), "scaleLength");
  assert.equal(provenanceGroupForInput(stringInput("gaugeMm")), "stringSpecification");
  assert.equal(provenanceGroupForInput(stringInput("unitMassKgPerMeter")), "unitMass");
  assert.equal(provenanceGroupForInput(stringInput("axialStiffnessN")), "stiffness");
});

test("calculation basis distinguishes defaults, mixed inputs, and measured setups", () => {
  assert.match(describeCalculationBasis(new Set()), /profile defaults/);
  assert.match(describeCalculationBasis(new Set(["relief"])), /1 user input groups with 7 profile defaults/);
  assert.equal(describeCalculationBasis(new Set([
    "scaleLength",
    "stringSpecification",
    "unitMass",
    "stiffness",
    "radius",
    "relief",
    "nutAction",
    "bridgeAction",
  ])), "Calculated from your measured setup.");
});

function stringInput(stringField) {
  return { id: "", name: "", dataset: { stringIndex: "0", stringField } };
}
