import assert from "node:assert/strict";
import test from "node:test";

import {
  describeActionProvenance,
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs?rev=37b595148646";

const provenanceMessages = Object.freeze({
  calculatedFromMeasurements: "Calculated from your measured setup.",
  measuredAtFrets: "Measured at frets",
  mixedInputs: "Preview mixes {userMeasurementCount} user input groups with {profileDefaultCount} profile defaults.",
  previewFromDefaults: "Preview from profile defaults. Enter your measurements before using the compensation pattern.",
  profileDefault: "Profile default",
  userEntry: "User entry",
});

test("string provenance keeps scale, mass, stiffness, and specification separate", () => {
  assert.equal(provenanceGroupForInput(stringInput("scaleLengthMm")), "scaleLength");
  assert.equal(provenanceGroupForInput(stringInput("gaugeMm")), "stringSpecification");
  assert.equal(provenanceGroupForInput(stringInput("unitMassKgPerMeter")), "unitMass");
  assert.equal(provenanceGroupForInput(stringInput("axialStiffnessN")), "stiffness");
});

test("the fret-12 action anchor has its own provenance group", () => {
  assert.equal(provenanceGroupForInput({
    id: "action_first_string_mm",
    name: "",
    dataset: {},
  }), "bridgeAction");
});

test("sparse action readings have stronger provenance without becoming a required input group", () => {
  assert.equal(describeActionProvenance(new Set(), provenanceMessages), "Profile default");
  assert.equal(describeActionProvenance(new Set(["bridgeAction"]), provenanceMessages), "User entry");
  assert.equal(describeActionProvenance(new Set(["measuredAction"]), provenanceMessages), "Measured at frets");
  assert.match(
    describeCalculationBasis(new Set(["measuredAction"]), provenanceMessages),
    /profile defaults/,
  );
});

test("calculation basis distinguishes defaults, mixed inputs, and measured setups", () => {
  assert.equal(
    describeCalculationBasis(new Set(), provenanceMessages),
    "Preview from profile defaults. Enter your measurements before using the compensation pattern.",
  );
  assert.equal(
    describeCalculationBasis(new Set(["relief"]), provenanceMessages),
    "Preview mixes 1 user input groups with 7 profile defaults.",
  );
  assert.equal(describeCalculationBasis(new Set([
    "scaleLength",
    "stringSpecification",
    "unitMass",
    "stiffness",
    "radius",
    "relief",
    "nutAction",
    "bridgeAction",
  ]), provenanceMessages), "Calculated from your measured setup.");
});

function stringInput(stringField) {
  return { id: "", name: "", dataset: { stringIndex: "0", stringField } };
}
