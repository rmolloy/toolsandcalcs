import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  loadCompleteTensionCatalog,
  TENSION_SOURCE_URLS,
} from "./tension_sources.mjs";

const outputPath = resolve(
  process.argv[2] || new URL("./tension_catalog.json", import.meta.url).pathname,
);
const catalog = await loadCompleteTensionCatalog();
const compactCatalog = {
  generatedAt: new Date().toISOString(),
  sources: [
    ...catalog.all.map(({ sourceUrl, sourceKind, manufacturer }) => ({
      sourceUrl,
      sourceKind,
      manufacturer,
    })),
    ...[
      ["official-calculator", TENSION_SOURCE_URLS.dAddarioCalculator],
      ["official-specifications", TENSION_SOURCE_URLS.dAddarioSpecifications],
      ["official-calculator", TENSION_SOURCE_URLS.stringjoyCalculator],
      ["tensionChart", TENSION_SOURCE_URLS.dAddarioTensionChart],
      ["tunings", TENSION_SOURCE_URLS.dAddarioTunings],
      ["frequencies", TENSION_SOURCE_URLS.dAddarioFrequencies],
      ["instruments", TENSION_SOURCE_URLS.dAddarioInstruments],
    ].map(([sourceKind, sourceUrl]) => ({
      sourceUrl,
      sourceKind: sourceKind.startsWith("official-")
        ? sourceKind
        : `calculator-${sourceKind}`,
      manufacturer: "D'Addario",
    })),
  ].filter((source, index, sources) => sources.findIndex((candidate) => (
    candidate.sourceUrl === source.sourceUrl
    && candidate.sourceKind === source.sourceKind
    && candidate.manufacturer === source.manufacturer
  )) === index),
  supportingData: {
    dAddario: catalog.dAddarioSupportingData,
  },
  records: catalog.all,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(compactCatalog)}\n`);
console.log(`Wrote ${catalog.all.length} records to ${outputPath}`);
