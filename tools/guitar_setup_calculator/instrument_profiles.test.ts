import assert from "node:assert/strict";
import test from "node:test";

import {
  findInstrumentProfile,
  INSTRUMENT_PROFILES,
} from "./instrument_profiles.ts";

test("review profiles preserve physical strings and user-facing courses", () => {
  const expectedCounts = {
    steel_string: [6, 6],
    electric: [6, 6],
    tenor_ukulele: [4, 4],
    twelve_string: [12, 6],
    four_string_bass: [4, 4],
    classical: [6, 6],
    mandolin: [8, 4],
  };
  for (const profile of INSTRUMENT_PROFILES) {
    const [stringCount, courseCount] = expectedCounts[profile.id];
    assert.equal(profile.strings.length, stringCount);
    assert.equal(profile.courseCount, courseCount);
    assert.ok(profile.strings.length <= 16);
    assert.ok(profile.strings.every((string) => string.courseIndex < courseCount));
  }
});

test("published set gauges and flat profiles remain explicit", () => {
  const twelveString = findInstrumentProfile("twelve_string");
  assert.equal(twelveString.tensionSet.setCode, "EJ38");
  assert.equal(twelveString.strings[4].gaugeMm, 0.008 * 25.4);
  assert.equal(twelveString.strings[4].openMidiNote, 67);

  const bass = findInstrumentProfile("four_string_bass");
  assert.equal(bass.scaleLengthMm, 863.6);
  assert.equal(bass.strings[3].gaugeMm, 2.54);

  assert.equal(findInstrumentProfile("tenor_ukulele").radius.kind, "none");
  assert.equal(findInstrumentProfile("classical").radius.kind, "none");
});

test("an unknown profile is rejected", () => {
  assert.throws(() => findInstrumentProfile("unknown"), /Unknown instrument profile/);
});
