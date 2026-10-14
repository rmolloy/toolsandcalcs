import {
  calibrateActionProfileFromSparseMeasurements,
  calculateActionFromTopOfStringEnvelopeMm,
  calculateActionProfileFromBenchMeasurements,
  calculateFretPositionMm,
} from "./action_geometry.ts";
import type { CalculatedActionPoint } from "./action_geometry.ts";
import {
  requireFinite,
  requireNonNegative,
  requireNonNegativeInteger,
  requirePositive,
  requirePositiveInteger,
  requirePositiveOrInfinity,
  requireUnitInterval,
} from "./numeric_validation.ts";
import type {
  ActionPoint,
  OuterStringActionPair,
  RadiusProfile,
  Setup,
  SetupString,
} from "./setup_model.ts";

const DEFAULT_STRING_SPACING_MM = 7.2;

interface StringActionAnchorsMm {
  actionAtMeasurementWithCapoMm: number;
  nutActionAtFirstFretMm: number;
}

export function calculateRadiusDropMm(radiusMm: number, lateralOffsetMm: number): number {
  requireFinite(lateralOffsetMm, "lateralOffsetMm");
  if (radiusMm === Infinity) return 0;
  requirePositive(radiusMm, "radiusMm");
  if (Math.abs(lateralOffsetMm) > radiusMm) {
    throw new RangeError("lateralOffsetMm must fit inside the fingerboard radius");
  }
  return radiusMm - Math.sqrt(radiusMm ** 2 - lateralOffsetMm ** 2);
}

export function calculateRadiusAtFretMm({
  radiusProfile,
  normalizedFretPosition,
}: {
  radiusProfile: RadiusProfile;
  normalizedFretPosition: number;
}): number {
  requireUnitInterval(normalizedFretPosition, "normalizedFretPosition");
  if (radiusProfile.kind === "simple") {
    requirePositiveOrInfinity(radiusProfile.radiusMm, "radiusProfile.radiusMm");
    return radiusProfile.radiusMm;
  }
  if (radiusProfile.kind !== "compound") {
    throw new RangeError("radiusProfile.kind must be simple or compound");
  }
  requirePositiveOrInfinity(radiusProfile.nutRadiusMm, "radiusProfile.nutRadiusMm");
  requirePositiveOrInfinity(radiusProfile.bridgeRadiusMm, "radiusProfile.bridgeRadiusMm");
  return radiusProfile.nutRadiusMm
    + (radiusProfile.bridgeRadiusMm - radiusProfile.nutRadiusMm) * normalizedFretPosition;
}

export function calculateStringLateralPositionMm({
  stringIndex,
  stringCount,
  stringSpacingMm = DEFAULT_STRING_SPACING_MM,
}: {
  stringIndex: number;
  stringCount: number;
  stringSpacingMm?: number;
}): number {
  requireNonNegativeInteger(stringIndex, "stringIndex");
  requirePositiveInteger(stringCount, "stringCount");
  requirePositive(stringSpacingMm, "stringSpacingMm");
  if (stringIndex >= stringCount) {
    throw new RangeError("stringIndex must be less than stringCount");
  }
  return (stringIndex - (stringCount - 1) / 2) * stringSpacingMm;
}

export function calculateStringTopHeightMm({
  clearanceAboveFretMm,
  stringDiameterMm,
  fingerboardRadiusMm,
  lateralPositionMm,
}: {
  clearanceAboveFretMm: number;
  stringDiameterMm: number;
  fingerboardRadiusMm: number;
  lateralPositionMm: number;
}): number {
  requireNonNegative(clearanceAboveFretMm, "clearanceAboveFretMm");
  requirePositive(stringDiameterMm, "stringDiameterMm");
  return clearanceAboveFretMm + stringDiameterMm
    - calculateRadiusDropMm(fingerboardRadiusMm, lateralPositionMm);
}

export function calculateClearanceFromStringTopMm({
  stringTopHeightMm,
  stringDiameterMm,
  fingerboardRadiusMm,
  lateralPositionMm,
}: {
  stringTopHeightMm: number;
  stringDiameterMm: number;
  fingerboardRadiusMm: number;
  lateralPositionMm: number;
}): number {
  requireFinite(stringTopHeightMm, "stringTopHeightMm");
  requirePositive(stringDiameterMm, "stringDiameterMm");
  return stringTopHeightMm - stringDiameterMm
    + calculateRadiusDropMm(fingerboardRadiusMm, lateralPositionMm);
}

export function calculateBenchActionProfile({
  string,
  sharedSetup,
  scaleLengthMm,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
}): ActionPoint[] {
  const baselineRadiusAwareProfile = calculateAnchoredActionProfile({
    sharedSetup,
    scaleLengthMm,
    anchors: calculateStringActionAnchorsMm({
      string,
      sharedSetup,
      scaleLengthMm,
      radiusAware: true,
    }),
  });
  const baselineChordOnlyProfile = calculateAnchoredActionProfile({
    sharedSetup,
    scaleLengthMm,
    anchors: calculateStringActionAnchorsMm({
      string,
      sharedSetup,
      scaleLengthMm,
      radiusAware: false,
    }),
  });
  const radiusAwareProfile = calibrateActionProfileFromSparseMeasurements(
    baselineRadiusAwareProfile,
    string.actionMeasurements ?? [],
  );
  const chordOnlyProfile = applyActionCorrections({
    baselineProfile: baselineChordOnlyProfile,
    sourceProfile: baselineRadiusAwareProfile,
    calibratedSourceProfile: radiusAwareProfile,
  });
  return createActionPoints({
    string,
    sharedSetup,
    scaleLengthMm,
    radiusAwareProfile,
    chordOnlyProfile,
  });
}

function calculateStringActionAnchorsMm({
  string,
  sharedSetup,
  scaleLengthMm,
  radiusAware,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
  radiusAware: boolean;
}): StringActionAnchorsMm {
  return {
    actionAtMeasurementWithCapoMm: calculateStringActionAnchorMm({
      string,
      sharedSetup,
      scaleLengthMm,
      outerActionPair: sharedSetup.benchActionTargets.actionAtMeasurementWithCapoMm,
      anchorFretNumber: sharedSetup.benchActionTargets.actionMeasurementFretNumber,
      radiusAware,
    }),
    nutActionAtFirstFretMm: calculateStringActionAnchorMm({
      string,
      sharedSetup,
      scaleLengthMm,
      outerActionPair: sharedSetup.benchActionTargets.nutActionAtFirstFretMm,
      anchorFretNumber: 1,
      radiusAware,
    }),
  };
}

function calculateStringActionAnchorMm({
  string,
  sharedSetup,
  scaleLengthMm,
  outerActionPair,
  anchorFretNumber,
  radiusAware,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
  outerActionPair: OuterStringActionPair;
  anchorFretNumber: number;
  radiusAware: boolean;
}): number {
  const firstString = sharedSetup.strings[0];
  const lastString = sharedSetup.strings[sharedSetup.strings.length - 1];
  const stringCount = sharedSetup.strings.length;
  const radiusArguments = radiusAware
    ? createRadiusArguments({ string, sharedSetup, scaleLengthMm, anchorFretNumber })
    : {};
  return calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: string.stringIndex,
    stringCount,
    stringDiameterMm: string.gaugeMm,
    firstStringActionMm: outerActionPair.firstStringMm,
    firstStringDiameterMm: firstString.gaugeMm,
    lastStringActionMm: outerActionPair.lastStringMm,
    lastStringDiameterMm: lastString.gaugeMm,
    ...radiusArguments,
  });
}

function createRadiusArguments({
  string,
  sharedSetup,
  scaleLengthMm,
  anchorFretNumber,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
  anchorFretNumber: number;
}) {
  const stringCount = sharedSetup.strings.length;
  return {
    fingerboardRadiusMm: calculateRadiusAtFretMm({
      radiusProfile: sharedSetup.radiusProfile,
      normalizedFretPosition: calculateFretPositionMm(scaleLengthMm, anchorFretNumber)
        / scaleLengthMm,
    }),
    lateralPositionMm: calculateStringLateralPositionMm({
      stringIndex: string.stringIndex,
      stringCount,
      stringSpacingMm: sharedSetup.stringSpacingMm,
    }),
    firstLateralPositionMm: calculateStringLateralPositionMm({
      stringIndex: 0,
      stringCount,
      stringSpacingMm: sharedSetup.stringSpacingMm,
    }),
    lastLateralPositionMm: calculateStringLateralPositionMm({
      stringIndex: stringCount - 1,
      stringCount,
      stringSpacingMm: sharedSetup.stringSpacingMm,
    }),
  };
}

function calculateAnchoredActionProfile({
  sharedSetup,
  scaleLengthMm,
  anchors,
}: {
  sharedSetup: Setup;
  scaleLengthMm: number;
  anchors: StringActionAnchorsMm;
}) {
  return calculateActionProfileFromBenchMeasurements({
    scaleLengthMm,
    capoFretNumber: sharedSetup.benchActionTargets.capoFretNumber,
    heldFretNumber: sharedSetup.fretCount,
    reliefFretNumber: sharedSetup.reliefPeakFret,
    reliefMm: sharedSetup.reliefAmountMm,
    actionMeasurementFretNumber:
      sharedSetup.benchActionTargets.actionMeasurementFretNumber,
    actionAtMeasurementWithCapoMm: anchors.actionAtMeasurementWithCapoMm,
    nutActionAtFirstFretMm: anchors.nutActionAtFirstFretMm,
  });
}

function createActionPoints({
  string,
  sharedSetup,
  scaleLengthMm,
  radiusAwareProfile,
  chordOnlyProfile,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
  radiusAwareProfile: readonly CalculatedActionPoint[];
  chordOnlyProfile: readonly CalculatedActionPoint[];
}): ActionPoint[] {
  const lateralPositionMm = calculateStringLateralPositionMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringSpacingMm: sharedSetup.stringSpacingMm,
  });
  return radiusAwareProfile.map((point, pointIndex) => {
    const normalizedPosition = point.positionMm / scaleLengthMm;
    const fingerboardRadiusMm = calculateRadiusAtFretMm({
      radiusProfile: sharedSetup.radiusProfile,
      normalizedFretPosition: normalizedPosition,
    });
    const baseClearanceAboveFretMm = chordOnlyProfile[pointIndex].clearanceAboveFretMm;
    return {
      fretNumber: point.fretNumber,
      positionMm: point.positionMm,
      normalizedPosition,
      clearanceAboveFretMm: point.clearanceAboveFretMm,
      baseClearanceAboveFretMm,
      radiusClearanceAdjustmentMm: point.clearanceAboveFretMm - baseClearanceAboveFretMm,
      fingerboardRadiusMm,
      lateralPositionMm,
      stringTopHeightMm: calculateStringTopHeightMm({
        clearanceAboveFretMm: point.clearanceAboveFretMm,
        stringDiameterMm: string.gaugeMm,
        fingerboardRadiusMm,
        lateralPositionMm,
      }),
    };
  });
}

function applyActionCorrections({
  baselineProfile,
  sourceProfile,
  calibratedSourceProfile,
}: {
  baselineProfile: readonly CalculatedActionPoint[];
  sourceProfile: readonly CalculatedActionPoint[];
  calibratedSourceProfile: readonly CalculatedActionPoint[];
}): CalculatedActionPoint[] {
  return baselineProfile.map((point, pointIndex) => {
    const correctionMm = calibratedSourceProfile[pointIndex].clearanceAboveFretMm
      - sourceProfile[pointIndex].clearanceAboveFretMm;
    return {
      ...point,
      openStringHeightMm: point.openStringHeightMm + correctionMm,
      clearanceAboveFretMm: point.clearanceAboveFretMm + correctionMm,
    };
  });
}
