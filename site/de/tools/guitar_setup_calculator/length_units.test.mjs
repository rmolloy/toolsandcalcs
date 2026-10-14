import assert from "node:assert/strict";
import test from "node:test";

import { lengthUnitPresentation } from "./length_units.mjs";

test("length presentation converts inches at the UI boundary and defaults to millimetres", () => {
  assert.equal(lengthUnitPresentation.normalize("unexpected"), "mm");
  assert.equal(lengthUnitPresentation.fromMillimetres(25.4, "in"), 1);
  assert.equal(lengthUnitPresentation.toMillimetres(1, "in"), 25.4);
  assert.equal(lengthUnitPresentation.format(25.4, "mm"), "25.40 mm");
  assert.equal(lengthUnitPresentation.format(25.4, "in"), "1.000 in");
  assert.equal(
    lengthUnitPresentation.format(2.54, "in", { signed: true }),
    "+0.100 in",
  );
});
