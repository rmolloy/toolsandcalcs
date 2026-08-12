import {
  applyTensionSourceRecord,
  findTensionSourceRecord,
} from "./tension_sources.mjs";
import {
  calculateGoreCentsError,
  GORE_REFERENCE_BOUNDS,
  optimizeGoreCompensation,
} from "./gore_compensation.ts";
import type {
  GoreCompensationBounds,
  GoreCompensationInput,
} from "./gore_compensation.ts";
import {
  calculateActionFromTopOfStringEnvelopeMm,
  calculateActionProfileFromBenchMeasurements,
} from "./action_geometry.ts";
import {
  findInstrumentProfile,
  INSTRUMENT_PROFILES,
} from "./instrument_profiles.ts";
import type {
  InstrumentProfile,
  InstrumentProfileId,
  ProfileMaterialFamily,
} from "./instrument_profiles.ts";

export {
  calculateGoreCentsError,
  calculateGoreCentsErrors,
  calculateGoreTotalAbsoluteErrorCents,
  GORE_REFERENCE_BOUNDS,
  optimizeGoreCompensation,
} from "./gore_compensation.ts";

export type {
  GoreCompensationBounds,
  GoreCompensationInput,
  GoreCompensationResult,
} from "./gore_compensation.ts";

export {
  findInstrumentProfile,
  INSTRUMENT_PROFILES,
} from "./instrument_profiles.ts";

const MILLIMETERS_PER_METER = 1000;
const MILLIMETERS_PER_INCH = 25.4;
const DEFAULT_STRING_SPACING_MM = 7.2;
const DEFAULT_EXTRA_STRING_LENGTH_MM = 120;
const DEFAULT_FINGER_DEFLECTION_MM = 0.5;
const DEFAULT_PLAYING_PRESSURE = 0.75;
const DEFAULT_FAN_NEUTRAL_FRET = 7;
const DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER = 7850;
const DEFAULT_STEEL_YOUNG_MODULUS_PA = 195_000_000_000;
const DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER = 1140;
const DEFAULT_NYLON_YOUNG_MODULUS_PA = 3_000_000_000;

export type StringConstruction = "plain" | "wound";

export interface SimpleRadiusProfile {
  kind: "simple";
  radiusMm: number;
  nutRadiusMm?: number;
  bridgeRadiusMm?: number;
}

export interface CompoundRadiusProfile {
  kind: "compound";
  nutRadiusMm: number;
  bridgeRadiusMm: number;
  radiusMm?: number;
}

export type RadiusProfile = SimpleRadiusProfile | CompoundRadiusProfile;

export interface SetupString {
  name: string;
  openMidiNote: number;
  gaugeMm: number;
  construction: StringConstruction;
  materialFamily: ProfileMaterialFamily;
  stringIndex: number;
  courseIndex: number;
  tensionSequenceNumber?: number;
  scaleLengthMm?: number;
  extraStringLengthMm?: number;
  openFrequencyHz?: number;
  unitMassKgPerMeter: number;
  axialStiffnessN: number;
  tensionSource?: TensionSource;
}

export interface OuterStringActionPair {
  firstStringMm: number;
  lastStringMm: number;
}

export interface BenchActionTargets {
  capoFretNumber: number;
  actionMeasurementFretNumber: number;
  actionAtMeasurementWithCapoMm: OuterStringActionPair;
  nutActionAtFirstFretMm: OuterStringActionPair;
}

export interface TensionSource {
  manufacturer: string;
  sourceKind: string;
  sourceId: string;
  sourceUrl: string;
}

export interface TensionRecord {
  manufacturer: string;
  sourceKind: string;
  sourceId: string;
  sourceUrl: string;
  setCode?: string;
  sequenceNumber?: number;
  productCode?: string | null;
  gaugeIn: number | null;
  gaugeMm: number | null;
  construction: StringConstruction;
  unitWeightLbPerIn: number;
}

export interface TensionCatalog {
  records?: TensionRecord[];
  all?: TensionRecord[];
}

export interface TensionSourceSelection {
  manufacturer: string;
  setCode?: string;
  setCodes?: string[];
}

export interface ActionPoint {
  fretNumber: number;
  positionMm: number;
  normalizedPosition: number;
  clearanceAboveFretMm: number;
  baseClearanceAboveFretMm: number;
  radiusClearanceAdjustmentMm: number;
  fingerboardRadiusMm: number;
  lateralPositionMm: number;
  stringTopHeightMm: number;
}

export interface IntonationResult {
  nutCompensationMm: number;
  saddleCompensationMm: number;
  centsErrorByFret: number[];
  totalAbsoluteErrorCents: number;
}

export interface Setup {
  instrumentProfileId: InstrumentProfileId | "custom";
  courseCount: number;
  benchActionTargets: BenchActionTargets;
  scaleLengthMm: number;
  fretCount: number;
  fanNeutralFret: number;
  reliefAmountMm: number;
  reliefPeakFret: number;
  extraStringLengthMm: number;
  tensionDataSource?: TensionSourceSelection | null;
  tensionCatalog?: TensionCatalog | null;
  fingerDeflectionMm: number;
  playingPressure: number;
  stringSpacingMm: number;
  radiusProfile: RadiusProfile;
  strings: SetupString[];
}

export interface StringSetupResult {
  string: SetupString;
  actionByFret: ActionPoint[];
  intonation: IntonationResult;
}

export function calculateFretPositionMm(scaleLengthMm: number, fretNumber: number): number {
  requirePositive(scaleLengthMm, "scaleLengthMm");
  requireNonNegativeInteger(fretNumber, "fretNumber");
  return scaleLengthMm * (1 - 2 ** (-fretNumber / 12));
}

export function calculateFrequencyHzFromMidi(midiNote: number): number {
  requireFinite(midiNote, "midiNote");
  return 440 * 2 ** ((midiNote - 69) / 12);
}

export function calculateMaximumAbsoluteCentsError(centsErrors: number[]): number {
  centsErrors.forEach((error, index) => requireFinite(error, `centsErrors[${index}]`));
  return centsErrors.reduce((maximum, error) => Math.max(maximum, Math.abs(error)), 0);
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

export function estimateStringMechanicalProperties({
  gaugeMm,
  construction = "plain",
  materialFamily = "steel",
  densityKgPerCubicMeter,
  youngModulusPa,
}: {
  gaugeMm: number;
  construction?: StringConstruction;
  materialFamily?: ProfileMaterialFamily;
  densityKgPerCubicMeter?: number;
  youngModulusPa?: number;
}): { unitMassKgPerMeter: number; axialStiffnessN: number } {
  requirePositive(gaugeMm, "gaugeMm");
  const materialDefaults = materialFamily === "nylon"
    ? {
      densityKgPerCubicMeter: DEFAULT_NYLON_DENSITY_KG_PER_CUBIC_METER,
      youngModulusPa: DEFAULT_NYLON_YOUNG_MODULUS_PA,
    }
    : {
      densityKgPerCubicMeter: DEFAULT_STRING_DENSITY_KG_PER_CUBIC_METER,
      youngModulusPa: DEFAULT_STEEL_YOUNG_MODULUS_PA,
    };
  const radiusM = gaugeMm / 2 / MILLIMETERS_PER_METER;
  const outsideAreaM2 = Math.PI * radiusM ** 2;
  const unitMassFillFactor = construction === "wound" ? 0.72 : 1;
  const axialDiameterMm = estimateAxialDiameterMm({
    outsideDiameterMm: gaugeMm,
    construction,
    materialFamily,
  });
  const axialRadiusM = axialDiameterMm / 2 / MILLIMETERS_PER_METER;
  const axialAreaM2 = Math.PI * axialRadiusM ** 2;
  if (construction !== "plain" && construction !== "wound") {
    throw new RangeError("construction must be plain or wound");
  }
  return {
    unitMassKgPerMeter: (densityKgPerCubicMeter ?? materialDefaults.densityKgPerCubicMeter)
      * outsideAreaM2
      * unitMassFillFactor,
    axialStiffnessN: (youngModulusPa ?? materialDefaults.youngModulusPa)
      * axialAreaM2,
  };
}

function estimateAxialDiameterMm({
  outsideDiameterMm,
  construction,
  materialFamily,
}: {
  outsideDiameterMm: number;
  construction: StringConstruction;
  materialFamily: ProfileMaterialFamily;
}): number {
  if (construction === "plain") return outsideDiameterMm;
  if (materialFamily === "nylon") return outsideDiameterMm * 0.6;
  const outsideDiameterIn = outsideDiameterMm / MILLIMETERS_PER_INCH;
  const estimatedCoreDiameterIn = 0.008 + 0.224 * outsideDiameterIn;
  return Math.min(outsideDiameterMm, estimatedCoreDiameterIn * MILLIMETERS_PER_INCH);
}

export function calculateFrettedPitchErrorCents({
  string,
  fretNumber,
  actionByFret,
  nutCompensationMm,
  saddleCompensationMm,
  fingerDeflectionMm = DEFAULT_FINGER_DEFLECTION_MM,
  playingPressure = DEFAULT_PLAYING_PRESSURE,
}: {
  string: SetupString & {
    scaleLengthMm: number;
    openFrequencyHz: number;
    extraStringLengthMm: number;
  };
  fretNumber: number;
  actionByFret: ActionPoint[];
  nutCompensationMm: number;
  saddleCompensationMm: number;
  fingerDeflectionMm?: number;
  playingPressure?: number;
}): number {
  requirePositiveInteger(fretNumber, "fretNumber");
  requireFinite(nutCompensationMm, "nutCompensationMm");
  requireFinite(saddleCompensationMm, "saddleCompensationMm");
  const goreInput = createGoreInput({
    string,
    actionByFret,
    fingerDeflectionMm,
    playingPressure,
  });
  return calculateGoreCentsError(
    goreInput,
    fretNumber,
    nutCompensationMm,
    saddleCompensationMm,
  );
}

export function optimizeNutAndSaddleCompensation({
  string,
  actionByFret,
  lastFret = actionByFret.length - 1,
  initialNutCompensationMm = 0.56,
  initialSaddleCompensationMm = 0.75,
  bounds = GORE_REFERENCE_BOUNDS,
  fingerDeflectionMm = DEFAULT_FINGER_DEFLECTION_MM,
  playingPressure = DEFAULT_PLAYING_PRESSURE,
}: {
  string: SetupString & {
    scaleLengthMm: number;
    openFrequencyHz: number;
    extraStringLengthMm: number;
  };
  actionByFret: ActionPoint[];
  lastFret?: number;
  initialNutCompensationMm?: number;
  initialSaddleCompensationMm?: number;
  bounds?: GoreCompensationBounds;
  fingerDeflectionMm?: number;
  playingPressure?: number;
}): IntonationResult {
  requirePositiveInteger(lastFret, "lastFret");
  if (lastFret >= actionByFret.length) {
    throw new RangeError("lastFret is outside actionByFret");
  }
  const goreInput = createGoreInput({
    string,
    actionByFret,
    fingerDeflectionMm,
    playingPressure,
  });
  const optimized = optimizeGoreCompensation({
    input: goreInput,
    initialNutCompensationMm,
    initialSaddleCompensationMm,
    bounds,
  });
  return {
    nutCompensationMm: optimized.nutCompensationMm,
    saddleCompensationMm: optimized.saddleCompensationMm,
    centsErrorByFret: optimized.centsErrorByFret.slice(1, lastFret + 1),
    totalAbsoluteErrorCents: optimized.centsErrorByFret
      .slice(1, lastFret + 1)
      .reduce((total, error) => total + Math.abs(error), 0),
  };
}

function createGoreInput({
  string,
  actionByFret,
  fingerDeflectionMm,
  playingPressure,
}: {
  string: SetupString & {
    scaleLengthMm: number;
    openFrequencyHz: number;
    extraStringLengthMm: number;
  };
  actionByFret: ActionPoint[];
  fingerDeflectionMm: number;
  playingPressure: number;
}): GoreCompensationInput {
  return {
    scaleLengthMm: string.scaleLengthMm,
    openFrequencyHz: string.openFrequencyHz,
    actionByFretMm: actionByFret.map((fret) => fret.clearanceAboveFretMm),
    unitMassKgPerMeter: string.unitMassKgPerMeter,
    axialStiffnessN: string.axialStiffnessN,
    extraStringLengthMm: string.extraStringLengthMm,
    fingerDeflectionMm,
    playingPressure,
  };
}

export function calculateSetupForString({
  string,
  sharedSetup,
}: {
  string: SetupString;
  sharedSetup: Setup;
}): StringSetupResult {
  const scaleLengthMm = string.scaleLengthMm ?? sharedSetup.scaleLengthMm;
  const actionByFret = calculateBenchActionProfile({ string, sharedSetup, scaleLengthMm });
  const intonation = optimizeNutAndSaddleCompensation({
    string: {
      ...string,
      scaleLengthMm,
      openFrequencyHz: calculateFrequencyHzFromMidi(string.openMidiNote),
      extraStringLengthMm: sharedSetup.extraStringLengthMm,
    },
    actionByFret,
    lastFret: sharedSetup.fretCount,
    fingerDeflectionMm: sharedSetup.fingerDeflectionMm,
    playingPressure: sharedSetup.playingPressure,
  });
  return { string, actionByFret, intonation };
}

export function calculateSetup(sharedSetup: Setup): { strings: StringSetupResult[] } {
  return {
    strings: sharedSetup.strings.map((string) => calculateSetupForString({
      string,
      sharedSetup,
    })),
  };
}

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
    const { tensionSource: _tensionSource, tensionSequenceNumber: _sequence, ...editableString } = sourceString;
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

function calculateBenchActionProfile({
  string,
  sharedSetup,
  scaleLengthMm,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
}): ActionPoint[] {
  const firstString = sharedSetup.strings[0];
  const lastString = sharedSetup.strings[sharedSetup.strings.length - 1];
  const actionAtMeasurementWithCapoMm = calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringDiameterMm: string.gaugeMm,
    firstStringActionMm:
      sharedSetup.benchActionTargets.actionAtMeasurementWithCapoMm.firstStringMm,
    firstStringDiameterMm: firstString.gaugeMm,
    lastStringActionMm:
      sharedSetup.benchActionTargets.actionAtMeasurementWithCapoMm.lastStringMm,
    lastStringDiameterMm: lastString.gaugeMm,
  });
  const nutActionAtFirstFretMm = calculateActionFromTopOfStringEnvelopeMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringDiameterMm: string.gaugeMm,
    firstStringActionMm:
      sharedSetup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm,
    firstStringDiameterMm: firstString.gaugeMm,
    lastStringActionMm:
      sharedSetup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm,
    lastStringDiameterMm: lastString.gaugeMm,
  });
  const calculatedProfile = calculateActionProfileFromBenchMeasurements({
    scaleLengthMm,
    capoFretNumber: sharedSetup.benchActionTargets.capoFretNumber,
    heldFretNumber: sharedSetup.fretCount,
    reliefFretNumber: sharedSetup.reliefPeakFret,
    reliefMm: sharedSetup.reliefAmountMm,
    actionMeasurementFretNumber:
      sharedSetup.benchActionTargets.actionMeasurementFretNumber,
    actionAtMeasurementWithCapoMm,
    nutActionAtFirstFretMm,
  });
  const lateralPositionMm = calculateStringLateralPositionMm({
    stringIndex: string.stringIndex,
    stringCount: sharedSetup.strings.length,
    stringSpacingMm: sharedSetup.stringSpacingMm,
  });
  return calculatedProfile.map((point) => {
    const normalizedPosition = point.positionMm / scaleLengthMm;
    const fingerboardRadiusMm = calculateRadiusAtFretMm({
      radiusProfile: sharedSetup.radiusProfile,
      normalizedFretPosition: normalizedPosition,
    });
    return {
      fretNumber: point.fretNumber,
      positionMm: point.positionMm,
      normalizedPosition,
      clearanceAboveFretMm: point.clearanceAboveFretMm,
      baseClearanceAboveFretMm: point.clearanceAboveFretMm,
      radiusClearanceAdjustmentMm: 0,
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

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function requirePositive(value: number, name: string): void {
  requireFinite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

function requirePositiveOrInfinity(value: number, name: string): void {
  if (value !== Infinity) requirePositive(value, name);
}

function requireNonNegative(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative`);
}

function requirePositiveInteger(value: number, name: string): void {
  requirePositive(value, name);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

function requireNonNegativeInteger(value: number, name: string): void {
  requireNonNegative(value, name);
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

function requireUnitInterval(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1`);
}
