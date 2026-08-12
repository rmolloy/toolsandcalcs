import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSetup,
  createCustomSetupFromCourseMembers,
  createDefaultSetup,
  createSetupFromInstrumentProfile,
} from "./setup_model.ts";
import { calculateStringYPositions, renderSetupDiagram } from "./setup_diagram.mjs";

test("diagram renders every physical string and calculated compensation", () => {
  const setup = createSetupFromInstrumentProfile("twelve_string");
  const result = calculateSetup(setup);
  const diagram = renderSetupDiagram({ setup, result });

  assert.match(diagram, /data-string-count="12"/);
  assert.equal((diagram.match(/data-string-index=/g) || []).length, 12);
  assert.equal((diagram.match(/data-nut-compensation=/g) || []).length, 12);
  assert.equal((diagram.match(/data-saddle-compensation=/g) || []).length, 12);
  assert.match(diagram, /geometry-zero-reference/);
  assert.match(diagram, /SADDLE · 6 MM/);
  assert.match(diagram, /class="geometry-mobile-diagrams"/);
  assert.match(diagram, /Calculated nut compensation and first-fret geometry/);
  assert.match(diagram, /Calculated saddle compensation and twelfth-fret geometry/);
});

test("diagram preserves the complete desktop view and names each mobile measurement view", () => {
  const setup = createDefaultSetup();
  const diagram = renderSetupDiagram({ setup, result: calculateSetup(setup) });
  const mobileDiagram = diagram.slice(diagram.indexOf('<div class="geometry-mobile-diagrams">'));
  const nutDiagram = mobileDiagram.match(/aria-label="Calculated nut compensation and first-fret geometry">([\s\S]*?)<\/svg>/)[1];
  const saddleDiagram = mobileDiagram.match(/aria-label="Calculated saddle compensation and twelfth-fret geometry">([\s\S]*?)<\/svg>/)[1];

  assert.match(diagram, /id="setup-geometry-artwork"[\s\S]*?scale continues/);
  assert.match(diagram, /class="geometry-desktop-diagram"[\s\S]*?<use href="#setup-geometry-artwork"/);
  assert.match(diagram, /aria-label="Calculated nut compensation and first-fret geometry"/);
  assert.match(diagram, /aria-label="Calculated saddle compensation and twelfth-fret geometry"/);
  assert.doesNotMatch(mobileDiagram, /scale continues|href="#setup-geometry-artwork"/);
  assert.doesNotMatch(nutDiagram, /SADDLE|FRET 12/);
  assert.doesNotMatch(saddleDiagram, /NUT|FRET 1(?!2)/);
});

test("diagram groups double courses more tightly than adjacent courses", () => {
  const setup = createCustomSetupFromCourseMembers({
    baseSetup: createDefaultSetup(),
    membersByCourse: [2, 2, 2, 2, 2, 2, 2, 2],
  });
  const result = calculateSetup(setup);
  const positions = calculateStringYPositions(result.strings);
  const sixStringDiagram = renderSetupDiagram({
    setup: createDefaultSetup(),
    result: calculateSetup(createDefaultSetup()),
  });
  const sixteenStringDiagram = renderSetupDiagram({ setup, result });

  assert.equal(positions.length, 16);
  assert.ok(positions[1] - positions[0] < positions[2] - positions[1]);
  assert.ok(positions[1] - positions[0] >= 15);
  assert.match(sixteenStringDiagram, /data-string-count="16"/);
  assert.ok(diagramHeight(sixteenStringDiagram) > diagramHeight(sixStringDiagram));
});

function diagramHeight(diagram) {
  return Number(diagram.match(/viewBox="0 0 1000 ([\d.]+)"/)[1]);
}

test("diagram fans unequal string lengths around the selected neutral fret", () => {
  const setup = createDefaultSetup();
  setup.strings.at(-1).scaleLengthMm += 38;
  setup.fanNeutralFret = 9;
  const result = calculateSetup(setup);
  const diagram = renderSetupDiagram({ setup, result });

  assert.match(diagram, /data-scale-mode="per-string"/);
  assert.match(diagram, /data-neutral-fret="9"/);
  assert.match(diagram, /neutral fret 9/);
  assert.match(diagram, /geometry-nut-model[\s\S]*?<polygon/);
});

test("diagram escapes custom string names", () => {
  const setup = createDefaultSetup();
  setup.strings[0].name = '<script>alert("x")</script>';
  const diagram = renderSetupDiagram({ setup, result: calculateSetup(setup) });

  assert.doesNotMatch(diagram, /<script>/);
  assert.match(diagram, /&lt;script&gt;/);
});
