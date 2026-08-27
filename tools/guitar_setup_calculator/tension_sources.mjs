const POUNDS_PER_INCH_TO_KILOGRAMS_PER_METER = 0.45359237 / 0.0254;
const DADDARIO_DATA_ROOT = "https://embed.cartfulsolutions.com/daddario-string-tension-finder/data";

export const TENSION_SOURCE_URLS = Object.freeze({
  dAddarioCalculator: "https://www.daddario.com/pages/string-tension-pro-string-tension-calculator",
  dAddarioStrings: `${DADDARIO_DATA_ROOT}/strings_sample.json`,
  dAddarioSets: `${DADDARIO_DATA_ROOT}/strings_dataset.json`,
  dAddarioTensionChart: `${DADDARIO_DATA_ROOT}/sets_tensionchart.json`,
  dAddarioTunings: `${DADDARIO_DATA_ROOT}/tuning.json`,
  dAddarioFrequencies: `${DADDARIO_DATA_ROOT}/scale_frecuency.json`,
  dAddarioInstruments: `${DADDARIO_DATA_ROOT}/instruments.json`,
  dAddarioSpecifications: "https://daddario.com/upload/tension_chart_13934.pdf",
  stringjoyCalculator: "https://tension.stringjoy.com/",
});

export async function loadCompleteTensionCatalog(fetchImplementation = fetch) {
  const [dAddarioStringRecords, dAddarioSetRecords, dAddarioSupportingData, stringjoyRecords] = await Promise.all([
    loadDAddarioStringRecords(fetchImplementation),
    loadDAddarioSetRecords(fetchImplementation),
    loadDAddarioSupportingData(fetchImplementation),
    loadStringjoyStringRecords(fetchImplementation),
  ]);
  const dAddarioRecords = [...dAddarioStringRecords, ...dAddarioSetRecords];
  return {
    dAddario: dAddarioRecords,
    dAddarioSupportingData,
    stringjoy: stringjoyRecords,
    all: [...dAddarioRecords, ...stringjoyRecords],
  };
}

export async function loadDAddarioSupportingData(fetchImplementation = fetch) {
  const entries = [
    ["tensionChart", TENSION_SOURCE_URLS.dAddarioTensionChart],
    ["tunings", TENSION_SOURCE_URLS.dAddarioTunings],
    ["frequencies", TENSION_SOURCE_URLS.dAddarioFrequencies],
    ["instruments", TENSION_SOURCE_URLS.dAddarioInstruments],
  ];
  const responses = await Promise.all(entries.map(async ([name, url]) => {
    const response = await fetchImplementation(url);
    requireSuccessfulResponse(response, url);
    return [name, await response.json()];
  }));
  return Object.fromEntries(responses);
}

export async function loadDAddarioSetRecords(fetchImplementation = fetch) {
  const response = await fetchImplementation(TENSION_SOURCE_URLS.dAddarioSets);
  requireSuccessfulResponse(response, TENSION_SOURCE_URLS.dAddarioSets);
  const rows = await response.json();
  return rows.map((row) => ({
    manufacturer: "D'Addario",
    sourceKind: "calculator-set-data",
    sourceUrl: TENSION_SOURCE_URLS.dAddarioSets,
    sourceId: `${row.SetItemNumber}:${row.SequenceNumber}:${row.SubComponent}`,
    productCode: row.SetItemNumber,
    setCode: row.SetItemNumber,
    sequenceNumber: row.SequenceNumber,
    componentCode: row.ComponentItemNumber,
    gaugeIn: divideOrNull(numberOrNull(row["SizeInInches(gauge)"]), 1000),
    gaugeMm: divideOrNull(numberOrNull(row["SizeInMillimeters(gauge)"]), 1000),
    construction: normalizeConstruction(row.StringConstruction),
    constructionLabel: row.StringConstruction,
    material: row.Material,
    coating: null,
    endType: row.EndType,
    unitWeightLbPerIn: numberOrNull(row.MassPerUnitLength),
  }));
}

export async function loadDAddarioStringRecords(fetchImplementation = fetch) {
  const response = await fetchImplementation(TENSION_SOURCE_URLS.dAddarioStrings);
  requireSuccessfulResponse(response, TENSION_SOURCE_URLS.dAddarioStrings);
  const rows = await response.json();
  return rows.map((row) => ({
    manufacturer: "D'Addario",
    sourceKind: "calculator-data",
    sourceUrl: TENSION_SOURCE_URLS.dAddarioStrings,
    sourceId: row.SubComponent,
    productCode: row.PackagedSingle,
    gaugeIn: numberOrNull(row.Diameter_In),
    gaugeMm: numberOrNull(row.Diameter_mm),
    construction: normalizeConstruction(row.Construction),
    constructionLabel: row.Construction,
    material: row.Material,
    coating: row.Coating,
    endType: row.End_Type,
    unitWeightLbPerIn: numberOrNull(row.Mass_UL),
  }));
}

export async function loadStringjoyStringRecords(fetchImplementation = fetch) {
  const pageResponse = await fetchImplementation(TENSION_SOURCE_URLS.stringjoyCalculator);
  requireSuccessfulResponse(pageResponse, TENSION_SOURCE_URLS.stringjoyCalculator);
  const pageHtml = await pageResponse.text();
  const bundleUrl = resolveStringjoyBundleUrl(pageHtml);
  const bundleResponse = await fetchImplementation(bundleUrl);
  requireSuccessfulResponse(bundleResponse, bundleUrl);
  const bundleText = await bundleResponse.text();
  return parseStringjoyMassTables(bundleText, bundleUrl);
}

export function parseStringjoyMassTables(bundleText, sourceUrl) {
  const tableStart = bundleText.indexOf("y={plain:[");
  if (tableStart < 0) throw new Error("Stringjoy mass table marker was not found");
  const tableText = bundleText.slice(tableStart);
  const records = [];
  const tablePattern = /(plain|nickel|bronze|brass|bassNickel|pure):\[([\s\S]*?)\](?=,|})/g;
  for (const tableMatch of tableText.matchAll(tablePattern)) {
    const alloy = tableMatch[1];
    const rowPattern = /\{name:"([^"]+)",mass:(?:"([0-9.e+-]+)"|([0-9.e+-]+))\}/g;
    for (const rowMatch of tableMatch[2].matchAll(rowPattern)) {
      const name = rowMatch[1];
      const gaugeMatch = name.match(/\.(\d+)/);
      if (!gaugeMatch) continue;
      records.push({
        manufacturer: "Stringjoy",
        sourceKind: "calculator-bundle",
        sourceUrl,
        sourceId: `${alloy}:${name}`,
        productCode: null,
        setCode: alloy,
        gaugeIn: Number(`0.${gaugeMatch[1]}`),
        gaugeMm: Number(`0.${gaugeMatch[1]}`) * 25.4,
        construction: alloy === "plain" ? "plain" : "wound",
        constructionLabel: alloy,
        material: alloy,
        coating: null,
        endType: null,
        unitWeightLbPerIn: Number(rowMatch[2] || rowMatch[3]),
      });
    }
  }
  if (records.length === 0) throw new Error("Stringjoy mass tables were empty");
  return records;
}

export function findTensionSourceRecord(catalog, criteria) {
  const records = Array.isArray(catalog) ? catalog : catalog?.records || catalog?.all || [];
  const gaugeIn = criteria.gaugeMm / 25.4;
  const allowedSetCodes = criteria.setCodes || (
    criteria.setCode === undefined ? null : [criteria.setCode]
  );
  return records.find((record) => (
    record.manufacturer === criteria.manufacturer
    && (!allowedSetCodes || allowedSetCodes.includes(record.setCode))
    && record.construction === criteria.construction
    && (allowedSetCodes && criteria.sequenceNumber !== undefined
      ? record.sequenceNumber === criteria.sequenceNumber
      : Number.isFinite(record.gaugeIn) && Math.abs(record.gaugeIn - gaugeIn) < 0.00002)
  )) || null;
}

export function applyTensionSourceRecord(string, record) {
  if (!record) {
    const { tensionSource: unusedTensionSource, ...withoutTensionSource } = string;
    return withoutTensionSource;
  }
  return {
    ...string,
    unitMassKgPerMeter: calculateUnitMassKgPerMeterFromPoundsPerInch(
      record.unitWeightLbPerIn,
    ),
    tensionSource: {
      manufacturer: record.manufacturer,
      sourceKind: record.sourceKind,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
    },
  };
}

export function calculateUnitMassKgPerMeterFromPoundsPerInch(unitWeightLbPerIn) {
  if (!Number.isFinite(unitWeightLbPerIn) || unitWeightLbPerIn <= 0) {
    throw new RangeError("unitWeightLbPerIn must be positive");
  }
  return unitWeightLbPerIn * POUNDS_PER_INCH_TO_KILOGRAMS_PER_METER;
}

function resolveStringjoyBundleUrl(pageHtml) {
  const bundlePath = pageHtml.match(/<script[^>]+src="([^"]*\/static\/js\/main\.[^"]+\.chunk\.js)"/i)?.[1];
  if (!bundlePath) throw new Error("Stringjoy calculator bundle was not found");
  return new URL(bundlePath, TENSION_SOURCE_URLS.stringjoyCalculator).href;
}

function normalizeConstruction(value) {
  if (!value) return "unknown";
  return /plain|monofilament/i.test(value) ? "plain" : "wound";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function divideOrNull(value, divisor) {
  return value === null ? null : value / divisor;
}

function requireSuccessfulResponse(response, url) {
  if (!response?.ok) throw new Error(`Could not load tension source: ${url}`);
}
