import {
  applyTensionSourceRecord,
  findTensionSourceRecord,
} from "./tension_sources.mjs";
import {
  findInstrumentProfile,
} from "./instrument_profiles.ts";
import type {
  InstrumentProfile,
  InstrumentProfileId,
} from "./instrument_profiles.ts";
import { estimateStringMechanicalProperties } from "./setup_string_mechanics.ts";
import type {
  RadiusProfile,
  Setup,
  SetupString,
  TensionCatalog,
  TensionSourceSelection,
} from "./setup_model.ts";

const DEFAULT_EXTRA_STRING_LENGTH_MM = 120;
const DEFAULT_FINGER_DEFLECTION_MM = 0.5;
const DEFAULT_PLAYING_PRESSURE = 0.75;
const DEFAULT_FAN_NEUTRAL_FRET = 7;

export function applyTensionCatalogToSetup(
  setup: Setup,
  tensionCatalog: TensionCatalog | null | undefined,
  sourceSelection: TensionSourceSelection | null | undefined,
): Setup {
  return {
    ...setup,
    tensionCatalog,
    tensionDataSource: sourceSelection || null,
    strings: setup.strings.map((string) => {
      const estimatedProperties = estimateStringMechanicalProperties({
        gaugeMm: string.gaugeMm,
        construction: string.construction,
        materialFamily: string.materialFamily,
      });
      const sourceRecord = sourceSelection ? findTensionSourceRecord(tensionCatalog, {
        manufacturer: sourceSelection.manufacturer,
        setCode: sourceSelection.setCode,
        setCodes: sourceSelection.setCodes,
        sequenceNumber: string.tensionSequenceNumber,
        gaugeMm: string.gaugeMm,
        construction: string.construction,
      }) : null;
      return applyTensionSourceRecord({
        ...string,
        ...estimatedProperties,
      }, sourceRecord);
    }),
  };
}

export function createStringSetFromInstrumentProfile({
  profile,
  tensionCatalog = null,
}: {
  profile: InstrumentProfile;
  tensionCatalog?: TensionCatalog | null;
}): SetupString[] {
  return profile.strings.map((profileString, stringIndex) => {
    const estimatedProperties = estimateStringMechanicalProperties(profileString);
    const string = {
      ...profileString,
      stringIndex,
      scaleLengthMm: profile.scaleLengthMm,
      ...estimatedProperties,
    };
    return applyTensionSourceRecord(string, findTensionSourceRecord(tensionCatalog, {
      ...profile.tensionSet,
      sequenceNumber: profileString.tensionSequenceNumber,
      gaugeMm: profileString.gaugeMm,
      construction: profileString.construction,
    }));
  });
}

export function createDefaultSetup(): Setup {
  return createSetupFromInstrumentProfile("steel_string");
}

export function createSetupFromInstrumentProfile(profileId: InstrumentProfileId): Setup {
  const profile = findInstrumentProfile(profileId);
  return {
    instrumentProfileId: profile.id,
    courseCount: profile.courseCount,
    benchActionTargets: {
      capoFretNumber: 1,
      actionMeasurementFretNumber: 12,
      actionAtMeasurementWithCapoMm: { ...profile.actionAtFret12WithCapo1Mm },
      nutActionAtFirstFretMm: { ...profile.nutActionAtFret1Mm },
    },
    scaleLengthMm: profile.scaleLengthMm,
    fretCount: profile.fretCount,
    fanNeutralFret: DEFAULT_FAN_NEUTRAL_FRET,
    reliefAmountMm: profile.reliefMm,
    reliefPeakFret: profile.reliefFretNumber,
    extraStringLengthMm: DEFAULT_EXTRA_STRING_LENGTH_MM,
    tensionDataSource: { ...profile.tensionSet },
    fingerDeflectionMm: DEFAULT_FINGER_DEFLECTION_MM,
    playingPressure: DEFAULT_PLAYING_PRESSURE,
    stringSpacingMm: profile.outerStringSpreadMm / (profile.strings.length - 1),
    radiusProfile: createRadiusProfileFromInstrumentProfile(profile),
    strings: createStringSetFromInstrumentProfile({ profile }),
  };
}

export function createCustomSetupFromCourseMembers({
  baseSetup,
  membersByCourse,
}: {
  baseSetup: Setup;
  membersByCourse: number[];
}): Setup {
  if (membersByCourse.length < 1 || membersByCourse.length > 8) {
    throw new RangeError("Custom setup must contain between 1 and 8 courses");
  }
  if (membersByCourse.some((memberCount) => memberCount !== 1 && memberCount !== 2)) {
    throw new RangeError("Each custom course must contain 1 or 2 strings");
  }
  const stringLocations = membersByCourse.flatMap((memberCount, courseIndex) => (
    Array.from({ length: memberCount }, (_, memberIndex) => ({ courseIndex, memberIndex }))
  ));
  const strings = stringLocations.map(({ courseIndex, memberIndex }, stringIndex) => {
    const sourceStringIndex = calculateSourceStringIndex({
      targetStringIndex: stringIndex,
      targetStringCount: stringLocations.length,
      sourceStringCount: baseSetup.strings.length,
    });
    const sourceString = baseSetup.strings[sourceStringIndex];
    const gaugeMm = calculateInterpolatedGaugeMm({
      targetStringIndex: stringIndex,
      targetStringCount: stringLocations.length,
      sourceStrings: baseSetup.strings,
    });
    const estimatedProperties = estimateStringMechanicalProperties({ ...sourceString, gaugeMm });
    const courseSuffix = membersByCourse[courseIndex] === 2 ? ` ${memberIndex + 1}` : "";
    const {
      tensionSource: unusedTensionSource,
      tensionSequenceNumber: unusedSequence,
      ...editableString
    } = sourceString;
    return {
      ...editableString,
      ...estimatedProperties,
      gaugeMm,
      name: `${sourceString.name}${courseSuffix}`,
      stringIndex,
      courseIndex,
      scaleLengthMm: sourceString.scaleLengthMm ?? baseSetup.scaleLengthMm,
    };
  });
  const outerStringSpanMm = baseSetup.stringSpacingMm * Math.max(0, baseSetup.strings.length - 1);
  const stringSpacingMm = strings.length === 1 ? 0 : outerStringSpanMm / (strings.length - 1);
  return {
    ...baseSetup,
    instrumentProfileId: "custom",
    courseCount: membersByCourse.length,
    tensionDataSource: null,
    stringSpacingMm,
    strings,
  };
}

function calculateInterpolatedGaugeMm({
  targetStringIndex,
  targetStringCount,
  sourceStrings,
}: {
  targetStringIndex: number;
  targetStringCount: number;
  sourceStrings: SetupString[];
}): number {
  if (targetStringCount === 1 || sourceStrings.length === 1) return sourceStrings[0].gaugeMm;
  const sourcePosition = targetStringIndex * (sourceStrings.length - 1) / (targetStringCount - 1);
  const lowerIndex = Math.floor(sourcePosition);
  const upperIndex = Math.ceil(sourcePosition);
  const progress = sourcePosition - lowerIndex;
  return sourceStrings[lowerIndex].gaugeMm
    + (sourceStrings[upperIndex].gaugeMm - sourceStrings[lowerIndex].gaugeMm) * progress;
}

function calculateSourceStringIndex({
  targetStringIndex,
  targetStringCount,
  sourceStringCount,
}: {
  targetStringIndex: number;
  targetStringCount: number;
  sourceStringCount: number;
}): number {
  if (targetStringCount === 1 || sourceStringCount === 1) return 0;
  const targetProgress = targetStringIndex / (targetStringCount - 1);
  return Math.round(targetProgress * (sourceStringCount - 1));
}

function createRadiusProfileFromInstrumentProfile(profile: InstrumentProfile): RadiusProfile {
  if (profile.radius.kind === "none") {
    return { kind: "simple", radiusMm: Infinity };
  }
  if (profile.radius.kind === "simple") {
    return { kind: "simple", radiusMm: profile.radius.nutRadiusMm! };
  }
  return {
    kind: "compound",
    nutRadiusMm: profile.radius.nutRadiusMm!,
    bridgeRadiusMm: profile.radius.bridgeRadiusMm!,
  };
}
