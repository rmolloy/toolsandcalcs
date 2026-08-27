import {
  calculateGoreCentsError,
  GORE_REFERENCE_BOUNDS,
  optimizeGoreCompensation,
} from "./gore_compensation.ts";
import type {
  GoreCompensationBounds,
  GoreCompensationInput,
} from "./gore_compensation.ts";
import type { SparseActionMeasurement } from "./action_geometry.ts";
import { optimizeEmpiricalAdjustmentFromReadings } from "./empirical_compensation.ts";
import { optimizeGoreBookCompensation } from "./gore_book_model.ts";
import type {
  EmpiricalAdjustmentResult,
  EmpiricalCompensationSearch,
  EmpiricalIntonationReading,
} from "./empirical_compensation.ts";
import {
  requireFinite,
  requireNonNegative,
  requireNonNegativeInteger,
  requirePositive,
  requirePositiveInteger,
  requirePositiveOrInfinity,
  requireUnitInterval,
} from "./numeric_validation.ts";
import { calculateBenchActionProfile } from "./setup_action_profile.ts";
import { estimateStringMechanicalProperties } from "./setup_string_mechanics.ts";
import type {
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

export {
  optimizeEmpiricalAdjustmentFromReadings,
  readingsFromDenseErrors,
} from "./empirical_compensation.ts";

export type { SparseActionMeasurement } from "./action_geometry.ts";

export {
  calculateClearanceFromStringTopMm,
  calculateRadiusAtFretMm,
  calculateRadiusDropMm,
  calculateStringLateralPositionMm,
  calculateStringTopHeightMm,
} from "./setup_action_profile.ts";

export { estimateStringMechanicalProperties } from "./setup_string_mechanics.ts";

export {
  applyTensionCatalogToSetup,
  createCustomSetupFromCourseMembers,
  createDefaultSetup,
  createSetupFromInstrumentProfile,
  createStringSetFromInstrumentProfile,
} from "./setup_factory.ts";

export {
  calculateGoreBookFretState,
  GORE_BOOK_REFERENCE_BOUNDS,
  optimizeGoreBookCompensation,
} from "./gore_book_model.ts";

export type {
  GoreBookCompensationResult,
  GoreBookStringInput,
} from "./gore_book_model.ts";

export type {
  EmpiricalAdjustmentResult,
  EmpiricalCompensationSearch,
  EmpiricalIntonationReading,
} from "./empirical_compensation.ts";

const DEFAULT_FINGER_DEFLECTION_MM = 0.5;
const DEFAULT_PLAYING_PRESSURE = 0.75;

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
  actionMeasurements?: SparseActionMeasurement[];
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
  lengthErrorByFretMm: number[];
  totalAbsoluteLengthErrorMm: number;
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
  const fretNumbers = Array.from({ length: lastFret }, (_, index) => index + 1);
  const optimized = optimizeGoreBookCompensation({
    input: {
      scaleLengthMm: string.scaleLengthMm,
      openFrequencyHz: string.openFrequencyHz,
      actionByFretMm: actionByFret.map((fret) => fret.clearanceAboveFretMm),
      unitMassKgPerMeter: string.unitMassKgPerMeter,
      axialStiffnessN: string.axialStiffnessN,
      stretchableLengthMm: string.scaleLengthMm + string.extraStringLengthMm,
      fingerRestDeflectionMm: fingerDeflectionMm,
      playerPressureFactor: playingPressure,
    },
    fretNumbers,
    initialNutCompensationMm,
    initialSaddleCompensationMm,
    bounds,
  });
  return {
    nutCompensationMm: optimized.nutCompensationMm,
    saddleCompensationMm: optimized.saddleCompensationMm,
    centsErrorByFret: optimized.states.map((state) => state.centsError),
    totalAbsoluteErrorCents: optimized.totalAbsoluteErrorCents,
    lengthErrorByFretMm: optimized.states.map((state) => state.lengthErrorMm),
    totalAbsoluteLengthErrorMm: optimized.totalAbsoluteLengthErrorMm,
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

export interface CompensationComparison {
  actionByFret: ActionPoint[];
  nutAndSaddle: IntonationResult;
  saddleOnly: IntonationResult;
}

function createGoreOptimizationRequest({
  string,
  sharedSetup,
  scaleLengthMm,
  actionByFret,
}: {
  string: SetupString;
  sharedSetup: Setup;
  scaleLengthMm: number;
  actionByFret: ActionPoint[];
}) {
  return {
    string: {
      ...string,
      scaleLengthMm,
      openFrequencyHz: calculateFrequencyHzFromMidi(string.openMidiNote),
      extraStringLengthMm: string.extraStringLengthMm ?? sharedSetup.extraStringLengthMm,
    },
    actionByFret,
    lastFret: sharedSetup.fretCount,
    fingerDeflectionMm: sharedSetup.fingerDeflectionMm,
    playingPressure: sharedSetup.playingPressure,
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
  const intonation = optimizeNutAndSaddleCompensation(
    createGoreOptimizationRequest({ string, sharedSetup, scaleLengthMm, actionByFret }),
  );
  return { string, actionByFret, intonation };
}

export const EMPIRICAL_REFERENCE_SEARCH: EmpiricalCompensationSearch = {
  bounds: { nutMinimumMm: -5, nutMaximumMm: 5, saddleMinimumMm: -5, saddleMaximumMm: 5 },
  divisionsPerAxis: 40,
  refinementPasses: 6,
};

export function optimizeEmpiricalAdjustmentForString({
  string,
  sharedSetup,
  readings,
  search = EMPIRICAL_REFERENCE_SEARCH,
}: {
  string: SetupString;
  sharedSetup: Setup;
  readings: readonly EmpiricalIntonationReading[];
  search?: EmpiricalCompensationSearch;
}): EmpiricalAdjustmentResult {
  for (const reading of readings) {
    if (Number.isInteger(reading.fretNumber) && reading.fretNumber > sharedSetup.fretCount) {
      throw new RangeError(
        `reading at fret ${reading.fretNumber} is beyond the instrument's last fret (${sharedSetup.fretCount})`,
      );
    }
  }
  return optimizeEmpiricalAdjustmentFromReadings({
    scaleLengthMm: string.scaleLengthMm ?? sharedSetup.scaleLengthMm,
    readings,
    search,
  });
}

export function calculateCompensationComparisonForString({
  string,
  sharedSetup,
}: {
  string: SetupString;
  sharedSetup: Setup;
}): CompensationComparison {
  const scaleLengthMm = string.scaleLengthMm ?? sharedSetup.scaleLengthMm;
  const actionByFret = calculateBenchActionProfile({ string, sharedSetup, scaleLengthMm });
  const request = createGoreOptimizationRequest({
    string,
    sharedSetup,
    scaleLengthMm,
    actionByFret,
  });
  return {
    actionByFret,
    nutAndSaddle: optimizeNutAndSaddleCompensation(request),
    saddleOnly: optimizeNutAndSaddleCompensation({
      ...request,
      initialNutCompensationMm: 0,
      bounds: { ...GORE_REFERENCE_BOUNDS, nutMinMm: 0, nutMaxMm: 0 },
    }),
  };
}

export function calculateSetup(sharedSetup: Setup): { strings: StringSetupResult[] } {
  return {
    strings: sharedSetup.strings.map((string) => calculateSetupForString({
      string,
      sharedSetup,
    })),
  };
}
