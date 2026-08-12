import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFretPositionMm,
  calculateRadiusDropMm,
  calculateRadiusAtFretMm,
  calculateStringTopHeightMm,
  calculateClearanceFromStringTopMm,
  calculateFrettedPitchErrorCents,
  calculateMaximumAbsoluteCentsError,
  optimizeNutAndSaddleCompensation,
  calculateSetup,
  applyTensionCatalogToSetup,
  createDefaultSetup,
  createCustomSetupFromCourseMembers,
  createSetupFromInstrumentProfile,
  estimateStringMechanicalProperties,
} from "./setup_model.ts";
import { calculateGoreCentsError } from "./gore_compensation.ts";
import { readFile } from "node:fs/promises";

test("fret positions preserve the octave relationship", () => {
  const scaleLengthMm = 647.7;
  assert.equal(calculateFretPositionMm(scaleLengthMm, 0), 0);
  assert.equal(calculateFretPositionMm(scaleLengthMm, 12), scaleLengthMm / 2);
});

test("maximum intonation error reports the worst remaining fret", () => {
  assert.equal(calculateMaximumAbsoluteCentsError([-0.2, 0.5, -0.4]), 0.5);
  assert.equal(calculateMaximumAbsoluteCentsError([]), 0);
  assert.throws(() => calculateMaximumAbsoluteCentsError([Number.NaN]), /must be finite/);
});

test("radius drop is symmetric and zero at the center", () => {
  assert.equal(calculateRadiusDropMm(304.8, 0), 0);
  assert.equal(calculateRadiusDropMm(304.8, 12), calculateRadiusDropMm(304.8, -12));
});

test("simple and compound radii resolve at the expected fret positions", () => {
  assert.equal(calculateRadiusAtFretMm({
    radiusProfile: { kind: "simple", radiusMm: 304.8 },
    normalizedFretPosition: 0.5,
  }), 304.8);
  assert.equal(calculateRadiusAtFretMm({
    radiusProfile: { kind: "compound", nutRadiusMm: 254, bridgeRadiusMm: 406.4 },
    normalizedFretPosition: 0,
  }), 254);
  assert.equal(calculateRadiusAtFretMm({
    radiusProfile: { kind: "compound", nutRadiusMm: 254, bridgeRadiusMm: 406.4 },
    normalizedFretPosition: 1,
  }), 406.4);
});

test("string-top height and clearance are inverse radius-aware measurements", () => {
  const height = calculateStringTopHeightMm({
    clearanceAboveFretMm: 1.2,
    stringDiameterMm: 0.5,
    fingerboardRadiusMm: 304.8,
    lateralPositionMm: 18,
  });
  const clearance = calculateClearanceFromStringTopMm({
    stringTopHeightMm: height,
    stringDiameterMm: 0.5,
    fingerboardRadiusMm: 304.8,
    lateralPositionMm: 18,
  });
  assert.ok(Math.abs(clearance - 1.2) < 1e-12);
});

test("invalid geometry is rejected at the library boundary", () => {
  assert.throws(
    () => calculateRadiusDropMm(304.8, 305),
    /must fit inside the fingerboard radius/,
  );
});

test("the complete default setup returns one intonation result per string", () => {
  const setup = createDefaultSetup();
  const result = calculateSetup(setup);
  const fretCount = setup.fretCount;
  assert.equal(setup.fanNeutralFret, 7);
  assert.equal(result.strings.length, 6);
  for (const stringResult of result.strings) {
    assert.equal(stringResult.actionByFret.length, fretCount + 1);
    assert.ok(Number.isFinite(stringResult.intonation.nutCompensationMm));
    assert.ok(Number.isFinite(stringResult.intonation.saddleCompensationMm));
    assert.ok(Number.isFinite(stringResult.intonation.totalAbsoluteErrorCents));
    assert.equal(stringResult.intonation.centsErrorByFret.length, fretCount);
  }
});

test("instrument profiles become complete calculation inputs", () => {
  const expectedStringCounts = {
    steel_string: 6,
    tenor_ukulele: 4,
    twelve_string: 12,
    four_string_bass: 4,
    classical: 6,
    mandolin: 8,
  } as const;
  for (const [profileId, expectedStringCount] of Object.entries(expectedStringCounts)) {
    const setup = createSetupFromInstrumentProfile(profileId as keyof typeof expectedStringCounts);
    assert.equal(setup.strings.length, expectedStringCount);
    assert.equal(calculateSetup(setup).strings.length, expectedStringCount);
  }
  assert.equal(createSetupFromInstrumentProfile("classical").radiusProfile.kind, "simple");
  assert.equal(createSetupFromInstrumentProfile("classical").radiusProfile.radiusMm, Infinity);
});

test("nylon stiffness fallback is distinct from steel stiffness", () => {
  const steel = estimateStringMechanicalProperties({ gaugeMm: 0.8, materialFamily: "steel" });
  const nylon = estimateStringMechanicalProperties({ gaugeMm: 0.8, materialFamily: "nylon" });
  assert.ok(nylon.axialStiffnessN < steel.axialStiffnessN);
});

test("wound steel stiffness fallback tracks the supplied PB024 reference", () => {
  const properties = estimateStringMechanicalProperties({
    gaugeMm: 0.024 * 25.4,
    construction: "wound",
    materialFamily: "steel",
  });
  assert.ok(Math.abs(properties.axialStiffnessN - 17_726) / 17_726 < 0.01);
});

test("default wound strings optimize inside the compensation safety bounds", () => {
  const result = calculateSetup(createDefaultSetup());
  for (const stringResult of result.strings) {
    assert.ok(Math.abs(stringResult.intonation.nutCompensationMm) < 5);
    assert.ok(Math.abs(stringResult.intonation.saddleCompensationMm) < 5);
  }
});

test("custom builder keeps courses separate from physical strings", () => {
  const baseSetup = createDefaultSetup();
  const custom = createCustomSetupFromCourseMembers({
    baseSetup,
    membersByCourse: Array(8).fill(2),
  });
  assert.equal(custom.instrumentProfileId, "custom");
  assert.equal(custom.courseCount, 8);
  assert.equal(custom.strings.length, 16);
  assert.equal(custom.strings[14].courseIndex, 7);
  assert.equal(custom.strings[15].courseIndex, 7);
  assert.ok(Math.abs(
    custom.stringSpacingMm * (custom.strings.length - 1)
      - baseSetup.stringSpacingMm * (baseSetup.strings.length - 1),
  ) < 1e-12);
  assert.equal(calculateSetup(custom).strings.length, 16);
  const mandolinCustom = createCustomSetupFromCourseMembers({
    baseSetup: createSetupFromInstrumentProfile("mandolin"),
    membersByCourse: Array(8).fill(2),
  });
  assert.equal(calculateSetup(mandolinCustom).strings.length, 16);
  assert.throws(() => createCustomSetupFromCourseMembers({
    baseSetup: createDefaultSetup(),
    membersByCourse: Array(9).fill(1),
  }), /between 1 and 8 courses/);
});

test("bench geometry preserves first and last nut-action measurements", () => {
  const setup = createDefaultSetup();
  const result = calculateSetup(setup);
  assert.ok(Math.abs(
    result.strings[0].actionByFret[1].clearanceAboveFretMm
      - setup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm,
  ) < 1e-12);
  assert.ok(Math.abs(
    result.strings.at(-1)!.actionByFret[1].clearanceAboveFretMm
      - setup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm,
  ) < 1e-12);
});

test("bench geometry derives middle strings from the top-of-string envelope", () => {
  const setup = createDefaultSetup();
  const result = calculateSetup(setup);
  const firstTopClearanceMm = setup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm
    + setup.strings[0].gaugeMm;
  const lastTopClearanceMm = setup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm
    + setup.strings.at(-1)!.gaugeMm;
  result.strings.forEach((stringResult, stringIndex) => {
    const progress = stringIndex / (result.strings.length - 1);
    const expectedTopClearanceMm = firstTopClearanceMm
      + (lastTopClearanceMm - firstTopClearanceMm) * progress;
    const firstFret = stringResult.actionByFret[1];
    assert.ok(Math.abs(
      firstFret.clearanceAboveFretMm
        + stringResult.string.gaugeMm
        - expectedTopClearanceMm,
    ) < 1e-12);
    assert.equal(firstFret.radiusClearanceAdjustmentMm, 0);
  });
});

test("bench geometry feeds a physical open-string profile into Gore", () => {
  const setup = createDefaultSetup();
  const result = calculateSetup(setup);
  for (const stringResult of result.strings) {
    assert.ok(stringResult.actionByFret[12].clearanceAboveFretMm > 0);
    assert.ok(Number.isFinite(stringResult.intonation.nutCompensationMm));
    assert.ok(Number.isFinite(stringResult.intonation.saddleCompensationMm));
  }
});

test("the setup-model compensation entry point delegates to Gore math", () => {
  const actionByFretMm = [0.1, 0.401, 0.677, 0.931, 1.166, 1.381, 1.580, 1.764, 1.934,
    2.090, 2.235, 2.370, 2.494, 2.609, 2.716, 2.816, 2.908, 2.994, 3.074];
  const scaleLengthMm = 645.16;
  const actionByFret = actionByFretMm.map((clearanceAboveFretMm, fretNumber) => ({
    fretNumber,
    positionMm: calculateFretPositionMm(scaleLengthMm, fretNumber),
    normalizedPosition: 0,
    clearanceAboveFretMm,
    baseClearanceAboveFretMm: clearanceAboveFretMm,
    radiusClearanceAdjustmentMm: 0,
    fingerboardRadiusMm: 304.8,
    lateralPositionMm: 0,
    stringTopHeightMm: clearanceAboveFretMm,
  }));
  const string = {
    name: "reference",
    openMidiNote: 55,
    gaugeMm: 0.6,
    construction: "plain" as const,
    stringIndex: 0,
    scaleLengthMm,
    extraStringLengthMm: 120,
    openFrequencyHz: 440 * 2 ** ((55 - 69) / 12),
    unitMassKgPerMeter: 0.002074,
    axialStiffnessN: 17726,
  };
  const direct = calculateGoreCentsError({
    scaleLengthMm,
    openFrequencyHz: string.openFrequencyHz,
    actionByFretMm,
    unitMassKgPerMeter: string.unitMassKgPerMeter,
    axialStiffnessN: string.axialStiffnessN,
    extraStringLengthMm: 120,
    fingerDeflectionMm: 0.5,
    playingPressure: 0.75,
  }, 12, 0.5370650916327806, 0.7560902917826148);
  const adapter = calculateFrettedPitchErrorCents({
    string,
    fretNumber: 12,
    actionByFret,
    nutCompensationMm: 0.5370650916327806,
    saddleCompensationMm: 0.7560902917826148,
    fingerDeflectionMm: 0.5,
    playingPressure: 0.75,
  });
  assert.equal(adapter, direct);

  const signedDirect = calculateGoreCentsError({
    scaleLengthMm,
    openFrequencyHz: string.openFrequencyHz,
    actionByFretMm,
    unitMassKgPerMeter: string.unitMassKgPerMeter,
    axialStiffnessN: string.axialStiffnessN,
    extraStringLengthMm: 120,
    fingerDeflectionMm: 0.5,
    playingPressure: 0.75,
  }, 12, -0.25, -0.5);
  const signedAdapter = calculateFrettedPitchErrorCents({
    string,
    fretNumber: 12,
    actionByFret,
    nutCompensationMm: -0.25,
    saddleCompensationMm: -0.5,
    fingerDeflectionMm: 0.5,
    playingPressure: 0.75,
  });
  assert.equal(signedAdapter, signedDirect);

  const optimized = optimizeNutAndSaddleCompensation({
    string,
    actionByFret,
    fingerDeflectionMm: 0.5,
    playingPressure: 0.75,
  });
  assert.ok(Math.abs(optimized.nutCompensationMm - 0.5370650916327806) < 0.0001);
  assert.ok(Math.abs(optimized.saddleCompensationMm - 0.7560902917826148) < 0.0001);
  assert.ok(Math.abs(optimized.totalAbsoluteErrorCents - 0.39204416022238925) < 0.0001);
});

test("each string can carry its own scale length", () => {
  const setup = createDefaultSetup();
  setup.strings[5].scaleLengthMm = 660;
  const result = calculateSetup(setup);
  assert.notEqual(
    result.strings[0].actionByFret[12].positionMm,
    result.strings[5].actionByFret[12].positionMm,
  );
});

test("the complete catalog can replace gauge estimates without changing geometry", async () => {
  const catalog = JSON.parse(await readFile(
    new URL("./tension_catalog.json", import.meta.url),
  ));
  const setup = applyTensionCatalogToSetup(
    createDefaultSetup(),
    catalog,
    { manufacturer: "D'Addario", setCode: "EJ16" },
  );
  assert.equal(setup.strings[0].tensionSource.manufacturer, "D'Addario");
  assert.equal(setup.strings[0].tensionSource.sourceId, "EJ16:1:U1AGFPL012-NP");
  assert.ok(setup.strings.every((string) => string.tensionSource));
});

test("classical profile resolves every D'Addario set row by sequence", async () => {
  const catalog = JSON.parse(await readFile(
    new URL("./tension_catalog.json", import.meta.url),
  ));
  const setup = applyTensionCatalogToSetup(
    createSetupFromInstrumentProfile("classical"),
    catalog,
    { manufacturer: "D'Addario", setCode: "EJ45" },
  );
  assert.ok(setup.strings.every((string) => string.tensionSource));
  assert.equal(setup.strings[1].tensionSource.sourceId, "EJ45:2:ACN0.81-S");
});

test("clearing a manufacturer selection restores estimated string mechanics", async () => {
  const catalog = JSON.parse(await readFile(
    new URL("./tension_catalog.json", import.meta.url),
  ));
  const sourced = applyTensionCatalogToSetup(
    createDefaultSetup(),
    catalog,
    { manufacturer: "D'Addario", setCode: "EXL110" },
  );
  const estimated = applyTensionCatalogToSetup(sourced, catalog, null);
  assert.equal(estimated.tensionDataSource, null);
  assert.equal(estimated.strings[0].tensionSource, undefined);
  assert.ok(Number.isFinite(estimated.strings[0].unitMassKgPerMeter));
});
