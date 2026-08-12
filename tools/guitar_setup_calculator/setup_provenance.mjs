const SETUP_INPUT_GROUPS = [
  "scaleLength",
  "stringSpecification",
  "unitMass",
  "stiffness",
  "radius",
  "relief",
  "nutAction",
  "bridgeAction",
];

export function provenanceGroupForInput(input) {
  if (input.id === "tension_data_source") return "unitMass";
  if (input.id === "fan_neutral_fret") return "scaleLength";
  if (input.dataset.stringIndex !== undefined) {
    return provenanceGroupForStringField(input.dataset.stringField);
  }
  if (input.name === "radius_kind" || input.id.includes("radius")) return "radius";
  if (input.id.startsWith("relief_")) return "relief";
  if (input.id.startsWith("nut_action_")) return "nutAction";
  if (input.id.startsWith("action_")) return "bridgeAction";
  if (input.id === "fret_count" || input.id === "extra_string_length_mm") return "intonation";
  return null;
}

export function describeCalculationBasis(userEntryGroups) {
  const userMeasurementCount = SETUP_INPUT_GROUPS.filter((group) => (
    userEntryGroups.has(group)
  )).length;
  const profileDefaultCount = SETUP_INPUT_GROUPS.length - userMeasurementCount;
  if (userMeasurementCount === 0) {
    return "Preview from profile defaults. Enter your measurements before using the compensation pattern.";
  }
  if (profileDefaultCount === 0) {
    return "Calculated from your measured setup.";
  }
  return `Preview mixes ${userMeasurementCount} user input groups with ${profileDefaultCount} profile defaults.`;
}

function provenanceGroupForStringField(field) {
  if (field === "scaleLengthMm") return "scaleLength";
  if (field === "unitMassKgPerMeter") return "unitMass";
  if (field === "axialStiffnessN") return "stiffness";
  return "stringSpecification";
}
