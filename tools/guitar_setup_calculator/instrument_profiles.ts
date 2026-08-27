export type InstrumentProfileId =
  | "steel_string"
  | "electric"
  | "tenor_ukulele"
  | "twelve_string"
  | "four_string_bass"
  | "classical"
  | "mandolin";

export type ProfileStringConstruction = "plain" | "wound";
export type ProfileMaterialFamily = "steel" | "nylon";

export interface InstrumentProfileString {
  name: string;
  openMidiNote: number;
  gaugeMm: number;
  construction: ProfileStringConstruction;
  materialFamily: ProfileMaterialFamily;
  courseIndex: number;
  tensionSequenceNumber?: number;
}

export interface InstrumentProfile {
  id: InstrumentProfileId;
  label: string;
  description: string;
  courseCount: number;
  strings: InstrumentProfileString[];
  scaleLengthMm: number;
  outerStringSpreadMm: number;
  fretCount: number;
  radius: {
    kind: "simple" | "compound" | "none";
    nutRadiusMm?: number;
    bridgeRadiusMm?: number;
  };
  reliefMm: number;
  reliefFretNumber: number;
  actionAtFret12WithCapo1Mm: {
    firstStringMm: number;
    lastStringMm: number;
  };
  nutActionAtFret1Mm: {
    firstStringMm: number;
    lastStringMm: number;
  };
  tensionSet: {
    manufacturer: "D'Addario";
    setCode: string;
  };
}

const STEEL_STRING_NOTES = [64, 59, 55, 50, 45, 40];

export const INSTRUMENT_PROFILES: readonly InstrumentProfile[] = [
  {
    id: "steel_string",
    label: "Steel-string guitar",
    description: "Six single courses · D'Addario EJ16 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["High E", "B", "G", "D", "A", "Low E"],
      midiNotes: STEEL_STRING_NOTES,
      gaugesIn: [0.012, 0.016, 0.024, 0.032, 0.042, 0.053],
      woundFromIndex: 2,
    }),
    scaleLengthMm: 645.16,
    outerStringSpreadMm: 36,
    fretCount: 20,
    radius: { kind: "compound", nutRadiusMm: 304.8, bridgeRadiusMm: 406.4 },
    reliefMm: 0.18,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.8, lastStringMm: 2.2 },
    nutActionAtFret1Mm: { firstStringMm: 0.22, lastStringMm: 0.32 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ16" },
  },
  {
    id: "electric",
    label: "Electric guitar",
    description: "Six single courses · D'Addario EXL110 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["High E", "B", "G", "D", "A", "Low E"],
      midiNotes: STEEL_STRING_NOTES,
      gaugesIn: [0.01, 0.013, 0.017, 0.026, 0.036, 0.046],
      woundFromIndex: 3,
    }),
    scaleLengthMm: 647.7,
    outerStringSpreadMm: 35,
    fretCount: 22,
    radius: { kind: "compound", nutRadiusMm: 241.3, bridgeRadiusMm: 355.6 },
    reliefMm: 0.2,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.6, lastStringMm: 2 },
    nutActionAtFret1Mm: { firstStringMm: 0.38, lastStringMm: 0.48 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EXL110" },
  },
  {
    id: "tenor_ukulele",
    label: "Tenor ukulele",
    description: "Four re-entrant nylon courses · D'Addario EJ65T gauges",
    courseCount: 4,
    strings: createStrings({
      names: ["A4", "E4", "C4", "G4"],
      midiNotes: [69, 64, 60, 67],
      gaugesIn: [0.0287, 0.0327, 0.041, 0.03],
      materialFamily: "nylon",
    }),
    scaleLengthMm: 431.8,
    outerStringSpreadMm: 30,
    fretCount: 18,
    radius: { kind: "none" },
    reliefMm: 0,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 2, lastStringMm: 2.2 },
    nutActionAtFret1Mm: { firstStringMm: 0.55, lastStringMm: 0.65 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ65T" },
  },
  {
    id: "twelve_string",
    label: "12-string guitar",
    description: "Six double courses · D'Addario EJ38 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["E4", "E4", "B3", "B3", "G4", "G3", "D4", "D3", "A3", "A2", "E3", "E2"],
      midiNotes: [64, 64, 59, 59, 67, 55, 62, 50, 57, 45, 52, 40],
      gaugesIn: [0.01, 0.01, 0.014, 0.014, 0.008, 0.023, 0.012, 0.03, 0.018, 0.039, 0.027, 0.047],
      woundIndices: [5, 7, 9, 10, 11],
      tensionSequenceNumbers: [1, 2, 3, 4, 6, 5, 8, 7, 10, 9, 12, 11],
      courseForString: (_, stringIndex) => Math.floor(stringIndex / 2),
    }),
    scaleLengthMm: 645.16,
    outerStringSpreadMm: 38,
    fretCount: 20,
    radius: { kind: "compound", nutRadiusMm: 304.8, bridgeRadiusMm: 406.4 },
    reliefMm: 0.18,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.8, lastStringMm: 2.2 },
    nutActionAtFret1Mm: { firstStringMm: 0.22, lastStringMm: 0.32 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ38" },
  },
  {
    id: "four_string_bass",
    label: "4-string bass",
    description: "Four single courses · D'Addario EXL170 gauges",
    courseCount: 4,
    strings: createStrings({
      names: ["G2", "D2", "A1", "E1"],
      midiNotes: [43, 38, 33, 28],
      gaugesIn: [0.045, 0.065, 0.08, 0.1],
      woundFromIndex: 0,
    }),
    scaleLengthMm: 863.6,
    outerStringSpreadMm: 54,
    fretCount: 20,
    radius: { kind: "simple", nutRadiusMm: 241.3 },
    reliefMm: 0.3,
    reliefFretNumber: 8,
    actionAtFret12WithCapo1Mm: { firstStringMm: 2, lastStringMm: 2.4 },
    nutActionAtFret1Mm: { firstStringMm: 0.3, lastStringMm: 0.4 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EXL170" },
  },
  {
    id: "classical",
    label: "Classical guitar",
    description: "Six nylon courses · flat fingerboard · D'Addario EJ45 gauges",
    courseCount: 6,
    strings: createStrings({
      names: ["E4", "B3", "G3", "D3", "A2", "E2"],
      midiNotes: STEEL_STRING_NOTES,
      gaugesIn: [0.028, 0.0322, 0.0403, 0.029, 0.035, 0.043],
      woundFromIndex: 3,
      materialFamily: "nylon",
    }),
    scaleLengthMm: 650,
    outerStringSpreadMm: 44,
    fretCount: 19,
    radius: { kind: "none" },
    reliefMm: 0,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 2.8, lastStringMm: 3.5 },
    nutActionAtFret1Mm: { firstStringMm: 0.5, lastStringMm: 0.7 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ45" },
  },
  {
    id: "mandolin",
    label: "Mandolin",
    description: "Four double courses · D'Addario EJ74 gauges",
    courseCount: 4,
    strings: createStrings({
      names: ["E5", "E5", "A4", "A4", "D4", "D4", "G3", "G3"],
      midiNotes: [76, 76, 69, 69, 62, 62, 55, 55],
      gaugesIn: [0.011, 0.011, 0.015, 0.015, 0.026, 0.026, 0.04, 0.04],
      woundFromIndex: 4,
      courseForString: (_, stringIndex) => Math.floor(stringIndex / 2),
    }),
    scaleLengthMm: 352.43,
    outerStringSpreadMm: 28,
    fretCount: 20,
    radius: { kind: "simple", nutRadiusMm: 304.8 },
    reliefMm: 0.1,
    reliefFretNumber: 7,
    actionAtFret12WithCapo1Mm: { firstStringMm: 1.2, lastStringMm: 1.5 },
    nutActionAtFret1Mm: { firstStringMm: 0.2, lastStringMm: 0.3 },
    tensionSet: { manufacturer: "D'Addario", setCode: "EJ74" },
  },
] as const;

export function findInstrumentProfile(profileId: string): InstrumentProfile {
  const profile = INSTRUMENT_PROFILES.find(({ id }) => id === profileId);
  if (!profile) throw new RangeError(`Unknown instrument profile: ${profileId}`);
  return profile;
}

function createStrings({
  names,
  midiNotes,
  gaugesIn,
  woundFromIndex = Infinity,
  woundIndices = [],
  tensionSequenceNumbers,
  materialFamily = "steel",
  courseForString = (_, stringIndex) => stringIndex,
}: {
  names: string[];
  midiNotes: number[];
  gaugesIn: number[];
  woundFromIndex?: number;
  woundIndices?: number[];
  tensionSequenceNumbers?: number[];
  materialFamily?: ProfileMaterialFamily;
  courseForString?: (name: string, stringIndex: number) => number;
}): InstrumentProfileString[] {
  if (names.length !== midiNotes.length || names.length !== gaugesIn.length) {
    throw new RangeError("Profile string names, notes, and gauges must have equal lengths");
  }
  return names.map((name, stringIndex) => ({
    name,
    openMidiNote: midiNotes[stringIndex],
    gaugeMm: gaugesIn[stringIndex] * 25.4,
    construction: stringIndex >= woundFromIndex || woundIndices.includes(stringIndex)
      ? "wound"
      : "plain",
    materialFamily,
    courseIndex: courseForString(name, stringIndex),
    tensionSequenceNumber: tensionSequenceNumbers?.[stringIndex] ?? stringIndex + 1,
  }));
}
