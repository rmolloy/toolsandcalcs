export type SetupInputGroup =
  | "scaleLength"
  | "stringSpecification"
  | "unitMass"
  | "stiffness"
  | "radius"
  | "relief"
  | "nutAction"
  | "bridgeAction"
  | "measuredAction"
  | "intonation";

export type MeasurementRung = 1 | 2 | 3 | 4;

export type NutActionState = "measured" | "modeled";

export interface MeasurementRungState {
  rung: MeasurementRung;
  basisLine: string;
  compensationLabel: string;
  nutActionState: NutActionState;
}

const RUNG_TWO_GROUPS: readonly SetupInputGroup[] = ["relief", "scaleLength", "bridgeAction"];
const RUNG_THREE_MASS_GROUPS: readonly SetupInputGroup[] = ["unitMass", "stiffness"];

export function deriveMeasurementRung({
  measuredGroups,
  hasMeasuredIntonationReadings = false,
}: {
  measuredGroups: ReadonlySet<SetupInputGroup>;
  hasMeasuredIntonationReadings?: boolean;
}): MeasurementRungState {
  const nutActionState: NutActionState = measuredGroups.has("nutAction") ? "measured" : "modeled";
  const geometryMeasured = RUNG_TWO_GROUPS.every((group) => measuredGroups.has(group));
  // Rung 3 needs confirmed gauges and construction AND a mass source
  // (tension source, measured unit mass, or measured stiffness) — per
  // docs/guitar-setup-calculator-modes.md.
  const stringsMeasured = measuredGroups.has("stringSpecification")
    && RUNG_THREE_MASS_GROUPS.some((group) => measuredGroups.has(group));

  if (geometryMeasured && stringsMeasured && hasMeasuredIntonationReadings) {
    return {
      rung: 4,
      basisLine: "Optimized from measured intonation · current strings",
      compensationLabel: "adjustment to this instrument",
      nutActionState,
    };
  }
  if (geometryMeasured && stringsMeasured) {
    return {
      rung: 3,
      basisLine: "Setup from your geometry and strings",
      compensationLabel: "modeled for your strings",
      nutActionState,
    };
  }
  if (geometryMeasured) {
    return {
      rung: 2,
      basisLine: nutActionState === "measured"
        ? "Setup from your geometry"
        : "Setup from your geometry · nut action modeled from radius",
      compensationLabel: "modeled for your neck",
      nutActionState,
    };
  }
  return {
    rung: 1,
    basisLine: "Setup from profile defaults",
    compensationLabel: "starting reference",
    nutActionState,
  };
}
