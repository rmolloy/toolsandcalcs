import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTensionSourceRecord,
  calculateUnitMassKgPerMeterFromPoundsPerInch,
  findTensionSourceRecord,
  loadCompleteTensionCatalog,
  loadDAddarioStringRecords,
  parseStringjoyMassTables,
} from "./tension_sources.mjs";

test("Stringjoy parser extracts every embedded mass table row", () => {
  const records = parseStringjoyMassTables(
    'prefix y={plain:[{name:".010",mass:243815e-10},{name:".013",mass:412119e-10}],bassNickel:[{name:".025",mass:"0.00014277"}],nickel:[{name:".026w",mass:13774e-8}]} suffix',
    "https://example.test/stringjoy.js",
  );
  assert.equal(records.length, 4);
  assert.equal(records[0].gaugeMm, 0.254);
  assert.equal(records[2].construction, "wound");
  assert.equal(records[2].unitWeightLbPerIn, 0.00014277);
  assert.equal(records[3].unitWeightLbPerIn, 0.00013774);
});

test("D'Addario records retain source identity and unit weight", async () => {
  const response = {
    ok: true,
    json: async () => [{
      SubComponent: "U1AGFPL010-NP",
      PackagedSingle: "PL010",
      Diameter_In: 0.01,
      Diameter_mm: 0.254,
      Construction: "Plain Steel",
      Material: "Tin Coated Steel",
      Coating: null,
      End_Type: "Small Ball End",
      Mass_UL: ".0000221639361710759",
    }],
  };
  const records = await loadDAddarioStringRecords(async () => response);
  assert.equal(records[0].sourceId, "U1AGFPL010-NP");
  assert.equal(records[0].construction, "plain");
  assert.equal(records[0].unitWeightLbPerIn, 0.0000221639361710759);
});

test("the complete loader keeps both manufacturer catalogs separate", async () => {
  const responses = new Map([
    ["strings_sample.json", {
      ok: true,
      json: async () => [],
    }],
    ["strings_dataset.json", {
      ok: true,
      json: async () => [],
    }],
    ["sets_tensionchart.json", {
      ok: true,
      json: async () => [{ SetItemNumber: "EXL110", TensionInPounds: 16.2 }],
    }],
    ["tuning.json", {
      ok: true,
      json: async () => [{ Tuning_Name: "Standard" }],
    }],
    ["scale_frecuency.json", {
      ok: true,
      json: async () => [{ n: 0, Frequency: 440 }],
    }],
    ["instruments.json", {
      ok: true,
      json: async () => [{ Instrument_Type: "Guitar" }],
    }],
    ["https://tension.stringjoy.com/", {
      ok: true,
      text: async () => '<script src="/static/js/main.test.chunk.js"></script>',
    }],
    ["https://tension.stringjoy.com/static/js/main.test.chunk.js", {
      ok: true,
      text: async () => 'y={plain:[{name:".010",mass:243815e-10}]}',
    }],
  ]);
  const fakeFetch = async (url) => responses.get(
    [...responses.keys()].find((key) => url.endsWith(key)),
  );
  const catalog = await loadCompleteTensionCatalog(fakeFetch);
  assert.equal(catalog.dAddario.length, 0);
  assert.equal(catalog.stringjoy.length, 1);
  assert.equal(catalog.all.length, 1);
  assert.equal(catalog.dAddarioSupportingData.tensionChart[0].TensionInPounds, 16.2);
});

test("source unit weight converts into the model's SI mass unit", () => {
  const string = applyTensionSourceRecord({}, {
    manufacturer: "Stringjoy",
    sourceKind: "calculator-bundle",
    sourceId: "plain:.010",
    sourceUrl: "https://example.test",
    unitWeightLbPerIn: 0.0000243815,
  });
  assert.ok(Math.abs(
    string.unitMassKgPerMeter - calculateUnitMassKgPerMeterFromPoundsPerInch(0.0000243815),
  ) < 1e-15);
});

test("set sequence resolves nylon rows whose published gauge is omitted", () => {
  const record = findTensionSourceRecord({ records: [{
    manufacturer: "D'Addario",
    setCode: "EJ45",
    sequenceNumber: 2,
    gaugeIn: null,
    construction: "plain",
    sourceId: "EJ45:2:ACN0.81-S",
  }] }, {
    manufacturer: "D'Addario",
    setCode: "EJ45",
    sequenceNumber: 2,
    gaugeMm: 0.81788,
    construction: "plain",
  });
  assert.equal(record.sourceId, "EJ45:2:ACN0.81-S");
});
