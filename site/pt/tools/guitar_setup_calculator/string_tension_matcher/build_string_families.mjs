#!/usr/bin/env node
// Builds string_families.json, the small data file the String Tension Matcher reads, from the Guitar Setup
// Calculator's tension catalog and the Stringjoy set lists beside this script:
//
//   node tools/guitar_setup_calculator/string_tension_matcher/build_string_families.mjs          write it
//   node tools/guitar_setup_calculator/string_tension_matcher/build_string_families.mjs --print  print it
//
// A family is what a player buys from: a maker's plain strings with one of its wound lines. A set is a pack
// with a name, each string carrying the mass per length the maker publishes for it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(HERE, "string_families.json");
// Published masses for one gauge that differ by less than this are the same number written twice.
const SAME_MASS_FRACTION = 1e-6;
const STANDARD_NOTES = "E,B,G,D,A,E";
// A first string heavier than this belongs to a baritone or bass set, tuned an octave or more away.
const HEAVIEST_GUITAR_FIRST_STRING_IN = 0.014;

const STRINGJOY_FAMILIES = [
  { id: "stringjoy_nickel", label: "Stringjoy nickel wound (electric)", lines: ["plain", "nickel"] },
  { id: "stringjoy_pure_nickel", label: "Stringjoy pure nickel (electric)", lines: ["plain", "pure"] },
  { id: "stringjoy_bronze", label: "Stringjoy bronze (acoustic)", lines: ["plain", "bronze"] },
  { id: "stringjoy_brass", label: "Stringjoy brass (acoustic)", lines: ["plain", "brass"] },
];

const DADDARIO_FAMILIES = [
  { id: "daddario_nickel", label: "D'Addario XL nickel wound (electric)", plain: "Tin Coated Steel", wound: "Nickel Plated Steel", woundSeries: "X1AGF" },
  { id: "daddario_nyxl", label: "D'Addario NYXL (electric)", plain: "Tin Coated NY Steel", wound: "NYXL", woundSeries: "" },
  { id: "daddario_phosphor_bronze", label: "D'Addario phosphor bronze (acoustic)", plain: "Tin Coated Steel", wound: "Phosphor Bronze", woundSeries: "X1AGF" },
  { id: "daddario_80_20_bronze", label: "D'Addario 80/20 bronze (acoustic)", plain: "Tin Coated Steel", wound: "80/20 Bronze", woundSeries: "X1AGF" },
];

export function stringFamiliesBuild(catalog, stringjoySets) {
  const families = [
    ...STRINGJOY_FAMILIES.map((family) => stringjoyFamily(catalog.records, family)),
    ...DADDARIO_FAMILIES.map((family) => dAddarioFamily(catalog.records, family)),
  ];
  const sets = [
    ...stringjoySets.sets.map((set) => stringjoySet(set, stringjoySets, families)),
    ...DADDARIO_FAMILIES.flatMap((family) => dAddarioSets(catalog, family)),
  ];
  return { builtFrom: ["tension_catalog.json", "string_tension_matcher/stringjoy_sets.json"], catalogGeneratedAt: catalog.generatedAt, families, sets };
}

function stringjoyFamily(records, family) {
  const gauges = records
    .filter((record) => record.manufacturer === "Stringjoy" && family.lines.includes(record.setCode))
    .map(gaugeOf);
  return { id: family.id, maker: "Stringjoy", label: family.label, gauges: gaugesSorted(gauges) };
}

// D'Addario's single guitar strings: uncoated, small ball end, of the family's plain and wound materials. The
// catalog lists some wound gauges under two component series with different masses; the X1AGF series is the
// one D'Addario builds its guitar sets from, so a family that has both keeps that one.
function dAddarioFamily(records, family) {
  const singles = records.filter((record) => record.manufacturer === "D'Addario" && !record.setCode && record.coating === null && record.endType === "Small Ball End");
  const plain = singles.filter((record) => record.material === family.plain && record.constructionLabel === "Plain Steel");
  const wound = singles.filter((record) => record.material === family.wound && record.constructionLabel === "Round Wound" && record.sourceId.startsWith(family.woundSeries));
  return { id: family.id, maker: "D'Addario", label: family.label, gauges: gaugesSorted(gaugesWithOneMass([...plain, ...wound])) };
}

// One entry for each gauge; two different masses for one gauge is a fault in the catalog and stops the build.
function gaugesWithOneMass(records) {
  const byGauge = new Map();
  for (const record of records) {
    const key = `${record.construction}:${record.gaugeIn}`;
    byGauge.set(key, [...(byGauge.get(key) ?? []), record]);
  }
  return [...byGauge.values()].map((group) => {
    if (!group.every((record) => massesAgree(record, group[0]))) throw new Error(`The catalog holds conflicting masses for ${group[0].material} ${group[0].gaugeIn}.`);
    return gaugeOf(group[0]);
  });
}

function massesAgree(a, b) {
  return Math.abs(a.unitWeightLbPerIn - b.unitWeightLbPerIn) <= SAME_MASS_FRACTION * a.unitWeightLbPerIn;
}

function gaugeOf(record) {
  return { gaugeIn: record.gaugeIn, construction: record.construction, unitWeightLbPerIn: record.unitWeightLbPerIn };
}

function gaugesSorted(gauges) {
  return [...gauges].sort((a, b) => a.construction.localeCompare(b.construction) || a.gaugeIn - b.gaugeIn);
}

function stringjoySet(set, source, families) {
  const family = families.find((candidate) => candidate.id === source.family);
  return {
    id: set.id,
    family: family.id,
    label: `${set.label} (${gaugesLabel(set.gaugesIn)})`,
    sourceUrl: source.sourceUrlPrefix + set.page,
    strings: set.gaugesIn.map((gaugeIn, index) => {
      const construction = index > 2 || index === 2 && set.woundThird ? "wound" : "plain";
      const gauge = family.gauges.find((candidate) => candidate.construction === construction && Math.abs(candidate.gaugeIn - gaugeIn) < 0.00002);
      if (!gauge) throw new Error(`${set.label}: ${family.label} has no ${construction} ${gaugeIn}.`);
      return gauge;
    }),
  };
}

// D'Addario's six-string guitar sets of the family's materials that its own tension chart lists in
// standard tuning, each string with the mass of that set's own component.
function dAddarioSets(catalog, family) {
  const members = catalog.records.filter((record) => record.manufacturer === "D'Addario" && record.setCode);
  const codes = [...new Set(members.map((record) => record.setCode))].sort();
  return codes.flatMap((code) => {
    const strings = members.filter((record) => record.setCode === code).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const chartNotes = catalog.supportingData.dAddario.tensionChart
      .filter((row) => row.SetItemNumber === code)
      .sort((a, b) => a.SequenceNumber - b.SequenceNumber)
      .map((row) => row.Note)
      .join(",");
    const ofFamily = strings.every((record) => record.coating === null && record.endType === "Small Ball End"
      && (record.material === family.plain && record.constructionLabel === "Plain Steel" || record.material === family.wound && record.constructionLabel === "Round Wound"));
    const ascending = strings.every((record, index) => index === 0 || record.gaugeIn > strings[index - 1].gaugeIn);
    if (strings.length !== 6 || strings[0].gaugeIn > HEAVIEST_GUITAR_FIRST_STRING_IN || !ofFamily || !ascending || chartNotes !== STANDARD_NOTES || !strings.some((record) => record.material === family.wound)) return [];
    return [{ id: `daddario_${code.toLowerCase().replace(/\+/g, "_plus").replace(/[^a-z0-9_]/g, "_")}`, family: family.id, label: `D'Addario ${code} (${gaugesLabel(strings.map((record) => record.gaugeIn))})`, sourceUrl: strings[0].sourceUrl, strings: strings.map(gaugeOf) }];
  });
}

function gaugesLabel(gaugesIn) {
  return gaugesIn.map((gaugeIn) => String(Number((gaugeIn * 1000).toFixed(1)))).join("-");
}

function fileJson(...parts) {
  return JSON.parse(fs.readFileSync(path.join(HERE, ...parts), "utf8"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = `${JSON.stringify(stringFamiliesBuild(fileJson("..", "tension_catalog.json"), fileJson("stringjoy_sets.json")))}\n`;
  if (process.argv.includes("--print")) process.stdout.write(text);
  else fs.writeFileSync(OUTPUT_PATH, text);
}
