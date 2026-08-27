import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the setup page exposes the physical bench measurements", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const behavior = await readFile(new URL("./main.mjs", import.meta.url), "utf8");
  const sparseActionEditor = await readFile(new URL("./sparse_action_editor.mjs", import.meta.url), "utf8");

  assert.match(page, /Relief/);
  assert.match(page, /Capo fret 1, then measure at fret 12/);
  assert.match(page, /Action at nut/);
  assert.match(page, /id="action_first_string_mm"/);
  assert.match(page, /id="action_last_string_mm"/);
  assert.match(page, /id="sparse_action_string"/);
  assert.match(page, /id="sparse_action_fret"/);
  assert.match(page, /id="sparse_action_clearance"/);
  assert.match(page, /Additional open-string action readings/);
  assert.match(page, /id="nut_action_first_string_mm"/);
  assert.match(page, /id="nut_action_last_string_mm"/);
  assert.match(page, /id="action_first_string_label"/);
  assert.match(page, /id="nut_action_last_string_label"/);
  assert.match(page, /id="fan_neutral_fret"/);
  assert.match(page, /id="continue_to_radius"/);
  assert.match(behavior, /continueToRadius/);
  assert.match(behavior, /createSparseActionEditor/);
  assert.match(sparseActionEditor, /function addReading/);
  assert.match(sparseActionEditor, /actionMeasurements/);
  assert.match(page, /Review compensation and verify intonation/);
  assert.match(page, /Advanced Gore model settings/);
  assert.doesNotMatch(page, /id="capo_action_mm"/);
  assert.doesNotMatch(page, /id="capo_measurement_fret"/);
  assert.doesNotMatch(page, /id="nut_inputs"/);
});

test("the setup page uses the shared ToneLab tool shell", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");

  assert.match(page, /class="card-surface setup-tool-surface"/);
  assert.match(page, /tl-card-output setup-results/);
  assert.match(page, /tl-card-controls setup-inputs/);
  assert.equal((page.match(/class="setup-step"/g) || []).length, 6);
  assert.match(page, /data-tool-footer/);
});

test("the setup page defaults to specs and exposes the measurement editor on request", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const behavior = await readFile(new URL("./main.mjs", import.meta.url), "utf8");

  assert.match(page, /class="setup-page" data-setup-mode="specs"/);
  assert.match(page, /id="measure_instrument"/);
  assert.match(page, /id="setup_form"[^>]* hidden/);
  assert.match(behavior, /showSetupMode/);
  assert.match(behavior, /form\.hidden = !isMeasureMode/);
  assert.match(behavior, /setupPage\.dataset\.setupMode/);
});

test("the setup page defaults dimensional measurements to millimetres", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const behavior = await readFile(new URL("./main.mjs", import.meta.url), "utf8");
  const lengthUnits = await readFile(new URL("./length_unit_controller.mjs", import.meta.url), "utf8");

  assert.match(page, /Relief \(mm\)/);
  assert.match(page, /Clearance \(mm\)/);
  assert.match(behavior, /createLengthUnitController\(document\)/);
  assert.match(lengthUnits, /let unit = lengthUnitPresentation\.defaultUnit/);
});

test("the setup page exposes physical nut and saddle geometry", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const behavior = await readFile(new URL("./main.mjs", import.meta.url), "utf8");

  assert.match(page, /class="[^"]*setup-geometry-card/);
  assert.match(page, /data-nut-width-mm="5"/);
  assert.doesNotMatch(page, /data-width-at-nut-mm/);
  assert.doesNotMatch(page, /data-width-at-saddle-mm/);
  assert.match(page, /data-saddle-insert-thickness="6"/);
  assert.match(page, /id="setup_geometry_svg"/);
  assert.match(page, /id="calculation_basis"/);
  assert.match(behavior, /renderSetupDiagram/);
  assert.doesNotMatch(page, /width at nut/);
  assert.doesNotMatch(page, /width at saddle/);
  assert.doesNotMatch(page, /rail_width_at_nut/);
  assert.doesNotMatch(page, /rail_width_at_saddle/);
});

test("the setup page puts measurement inputs before calculated geometry and results", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const behavior = await readFile(new URL("./main.mjs", import.meta.url), "utf8");
  const lengthUnits = await readFile(new URL("./length_unit_controller.mjs", import.meta.url), "utf8");
  const resultPresenter = await readFile(new URL("./setup_result_presenter.mjs", import.meta.url), "utf8");

  assert.ok(page.indexOf('id="geometry-title"') < page.indexOf('id="setup_form"'));
  assert.ok(page.indexOf('id="setup_form"') < page.indexOf('id="results-title"'));
  assert.ok(page.indexOf('id="geometry-title"') < page.indexOf('id="results-title"'));
  assert.ok(page.indexOf('id="measurement-rail-title"') < page.indexOf('id="results-title"'));
  assert.match(page, /class="[^"]*setup-measurement-rail/);
  assert.match(page, /id="rail_action"/);
  assert.match(page, /id="rail_error"/);
  assert.match(page, /id="rail_calculation_path"/);
  assert.match(page, /Nut compensation range/);
  assert.match(page, /Saddle compensation range/);
  assert.match(behavior, /createSetupResultPresenter/);
  assert.match(resultPresenter, /lengthUnits\.formatSignedRange/);
  assert.match(resultPresenter, /lengthUnits\.formatRange/);
  assert.match(lengthUnits, /function formatRange/);
  assert.match(page, /id="mobile_result_cards"/);
  assert.doesNotMatch(page, /Scroll sideways to compare/);
  assert.match(page, /Gore compensation is active/);
  assert.match(page, /Instrument profile/);
  assert.match(page, /Profile default/);
  assert.match(page, /Calculated/);
});

test("instrument families use one selector and a course-aware custom builder", async () => {
  const page = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const behavior = await readFile(new URL("./main.mjs", import.meta.url), "utf8");
  const profileEditor = await readFile(new URL("./setup_profile_editor.mjs", import.meta.url), "utf8");
  const resultPresenter = await readFile(new URL("./setup_result_presenter.mjs", import.meta.url), "utf8");

  assert.match(page, /id="instrument_profile"/);
  assert.match(page, /id="custom_course_count"/);
  assert.match(page, /id="custom_course_members"/);
  assert.match(page, /maximum of sixteen physical strings/);
  assert.match(page, /value="none"/);
  assert.doesNotMatch(page, /role="tab"/);
  assert.match(behavior, /createSetupFromInstrumentProfile/);
  assert.match(behavior, /createCustomSetupFromCourseMembers/);
  assert.match(behavior, /showInputError/);
  assert.match(behavior, /hasRenderedResult/);
  assert.match(resultPresenter, /renderMobileResultsByCourse/);
  assert.match(behavior, /createSetupProfileEditor/);
  assert.match(profileEditor, /class="string-card-fields"/);
  assert.ok(page.indexOf('id="tension_data_source"') < page.indexOf('id="step-radius-title"'));
  assert.ok(page.indexOf('id="instrument_profile"') < page.indexOf('id="geometry-title"'));
});

test("radius mode marks every inactive measurement field hidden", async () => {
  const formController = await readFile(new URL("./setup_form_controller.mjs", import.meta.url), "utf8");
  const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(formController, /simple_radius_field"\)\.hidden = !isSimple/);
  assert.match(formController, /nut_radius_field"\)\.hidden = !isCompound/);
  assert.match(formController, /bridge_radius_field"\)\.hidden = !isCompound/);
  assert.match(styles, /\.setup-page \[hidden\] \{ display: none !important; \}/);
});
