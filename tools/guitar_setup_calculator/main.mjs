import {
  applyTensionCatalogToSetup,
  calculateMaximumAbsoluteCentsError,
  calculateSetup,
  createCustomSetupFromCourseMembers,
  createDefaultSetup,
  createSetupFromInstrumentProfile,
  estimateStringMechanicalProperties,
  INSTRUMENT_PROFILES,
} from "./setup_model.mjs";
import { renderSetupDiagram } from "./setup_diagram.mjs";
import {
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs";

let setup = createDefaultSetup();
const userEntryGroups = new Set();
const tensionSourceOptions = {
  estimate: null,
  daddario_ej16: { manufacturer: "D'Addario", setCode: "EJ16" },
  daddario_ej38: { manufacturer: "D'Addario", setCode: "EJ38" },
  daddario_exl170: { manufacturer: "D'Addario", setCode: "EXL170" },
  daddario_ej45: { manufacturer: "D'Addario", setCode: "EJ45" },
  daddario_ej65t: { manufacturer: "D'Addario", setCode: "EJ65T" },
  daddario_ej74: { manufacturer: "D'Addario", setCode: "EJ74" },
  stringjoy_nickel: { manufacturer: "Stringjoy", setCodes: ["plain", "nickel"] },
  stringjoy_bronze: { manufacturer: "Stringjoy", setCodes: ["plain", "bronze"] },
};
const form = document.getElementById("setup_form");
const stringInputs = document.getElementById("string_inputs");
const instrumentProfile = document.getElementById("instrument_profile");
const customProfileBuilder = document.getElementById("custom_profile_builder");
const customCourseCount = document.getElementById("custom_course_count");
const customCourseMembers = document.getElementById("custom_course_members");
const resultRows = document.getElementById("result_rows");
const mobileResultCards = document.getElementById("mobile_result_cards");
const setupGeometrySvg = document.getElementById("setup_geometry_svg");
const resultStatus = document.getElementById("result_status");
const railAction = document.getElementById("rail_action");
const railNutAction = document.getElementById("rail_nut_action");
const railRelief = document.getElementById("rail_relief");
const railError = document.getElementById("rail_error");
const railNutCompensation = document.getElementById("rail_nut_compensation");
const railSaddleCompensation = document.getElementById("rail_saddle_compensation");
const railScaleLength = document.getElementById("rail_scale_length");
const calculationBasis = document.getElementById("calculation_basis");
let hasRenderedResult = false;

renderInstrumentProfileOptions();
renderStringInputs();
writeSetupToForm();
render();
form.addEventListener("input", handleFormChange);
form.addEventListener("change", handleFormChange);
instrumentProfile.addEventListener("change", handleFormChange);
customCourseCount.addEventListener("input", handleFormChange);
document.getElementById("customize_profile").addEventListener("click", showCustomProfileBuilder);
document.getElementById("build_custom_profile").addEventListener("click", buildCustomProfile);
document.getElementById("continue_to_radius").addEventListener("click", continueToRadius);
initializeTensionCatalog();

function renderStringInputs() {
  stringInputs.innerHTML = setup.strings.map((string, index) => `
    <fieldset class="string-card">
      <legend>Course ${string.courseIndex + 1} · ${string.name}</legend>
      <div class="string-card-fields">
        ${setup.instrumentProfileId === "custom" ? `
          <label><span>Name</span><input data-string-index="${index}" data-string-field="name" type="text"></label>
          <label><span>MIDI note</span><input data-string-index="${index}" data-string-field="openMidiNote" type="number" min="0" max="127" step="1"></label>
        ` : ""}
        <label><span>Length (mm)</span><input data-string-index="${index}" data-string-field="scaleLengthMm" type="number" min="1" step="0.1"></label>
        <label><span>Gauge (mm)</span><input data-string-index="${index}" data-string-field="gaugeMm" type="number" min="0.05" step="0.001"></label>
        <label><span>Build</span><select data-string-index="${index}" data-string-field="construction"><option value="plain">Plain</option><option value="wound">Wound</option></select></label>
      </div>
      <details class="string-data-details">
        <summary>Calculation data</summary>
        <div class="string-calculation-fields">
          <label><span>Unit mass (kg/m)<small class="field-source" data-unit-mass-source="${index}">${string.tensionSource ? "Manufacturer" : "Gauge estimate"}</small></span><input data-string-index="${index}" data-string-field="unitMassKgPerMeter" type="number" min="0" step="any"></label>
          <label><span>Axial stiffness (N)<small class="field-source">Estimated core</small></span><input data-string-index="${index}" data-string-field="axialStiffnessN" type="number" min="0" step="1"></label>
        </div>
      </details>
    </fieldset>
  `).join("");
}

function renderInstrumentProfileOptions() {
  instrumentProfile.innerHTML = INSTRUMENT_PROFILES.map((profile) => (
    `<option value="${profile.id}">${profile.label}</option>`
  )).join("");
  if (setup.instrumentProfileId === "custom") {
    instrumentProfile.insertAdjacentHTML("beforeend", '<option value="custom">Custom</option>');
  }
}

function writeSetupToForm() {
  renderInstrumentProfileOptions();
  setValue("instrument_profile", setup.instrumentProfileId);
  setValue("simple_radius_mm", radiusValueFor("simple"));
  setValue("nut_radius_mm", setup.radiusProfile.nutRadiusMm ?? 304.8);
  setValue("bridge_radius_mm", setup.radiusProfile.bridgeRadiusMm ?? 406.4);
  setValue("relief_amount_mm", setup.reliefAmountMm);
  setValue("relief_peak_fret", setup.reliefPeakFret);
  setValue(
    "action_first_string_mm",
    setup.benchActionTargets.actionAtMeasurementWithCapoMm.firstStringMm,
  );
  setValue(
    "action_last_string_mm",
    setup.benchActionTargets.actionAtMeasurementWithCapoMm.lastStringMm,
  );
  setValue(
    "nut_action_first_string_mm",
    setup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm,
  );
  setValue(
    "nut_action_last_string_mm",
    setup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm,
  );
  setValue("fret_count", setup.fretCount);
  setValue("fan_neutral_fret", setup.fanNeutralFret);
  setValue("extra_string_length_mm", setup.extraStringLengthMm);
  setValue("tension_data_source", tensionSourceIdForSetup());
  for (const input of form.querySelectorAll("[data-string-index]")) {
    const string = setup.strings[Number(input.dataset.stringIndex)];
    const field = input.dataset.stringField;
    input.value = string[field];
  }
  form.querySelector(`input[name="radius_kind"][value="${radiusKindForSetup()}"]`).checked = true;
  renderActiveProfile();
  updateRadiusFields();
}

function handleFormChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
  clearInputError(input);
  if (input.id === "instrument_profile" && input.value !== "custom") {
    selectInstrumentProfile(input.value);
    return;
  }
  if (input.id === "custom_course_count") {
    renderCustomCourseMembers(Number(input.value));
    return;
  }
  try {
    markUserEntry(input);
    readInputIntoSetup(input);
    if (changesMechanicalLookup(input)) writeMechanicalPropertiesToStringCards();
    const calculationError = render();
    if (calculationError) showInputError(input, calculationError.message);
  } catch (error) {
    showInputError(input, error.message);
    resultStatus.textContent = error.message;
  }
  updateRadiusFields();
}

function readInputIntoSetup(input) {
  if (input.name === "radius_kind") {
    selectRadiusKind(input.value);
    return;
  }
  if (input.id === "tension_data_source") {
    setup = applyTensionCatalogToSetup(
      setup,
      setup.tensionCatalog,
      tensionSourceOptions[input.value],
    );
    return;
  }
  if (input.dataset.stringIndex !== undefined) {
    const string = setup.strings[Number(input.dataset.stringIndex)];
    const field = input.dataset.stringField;
    string[field] = input.type === "number" ? Number(input.value) : input.value;
    if (field === "gaugeMm" || field === "construction") {
      const mechanical = estimateStringMechanicalProperties(string);
      string.unitMassKgPerMeter = mechanical.unitMassKgPerMeter;
      string.axialStiffnessN = mechanical.axialStiffnessN;
      setup = applyTensionCatalogToSetup(setup, setup.tensionCatalog, setup.tensionDataSource);
    }
    return;
  }
  const numericFields = {
    simple_radius_mm: (value) => { setup.radiusProfile.radiusMm = value; },
    nut_radius_mm: (value) => { setup.radiusProfile.nutRadiusMm = value; },
    bridge_radius_mm: (value) => { setup.radiusProfile.bridgeRadiusMm = value; },
    relief_amount_mm: (value) => { setup.reliefAmountMm = value; },
    relief_peak_fret: (value) => { setup.reliefPeakFret = value; },
    action_first_string_mm: (value) => {
      setup.benchActionTargets.actionAtMeasurementWithCapoMm.firstStringMm = value;
    },
    action_last_string_mm: (value) => {
      setup.benchActionTargets.actionAtMeasurementWithCapoMm.lastStringMm = value;
    },
    nut_action_first_string_mm: (value) => {
      setup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm = value;
    },
    nut_action_last_string_mm: (value) => {
      setup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm = value;
    },
    fret_count: (value) => { setup.fretCount = value; },
    fan_neutral_fret: (value) => { setup.fanNeutralFret = value; },
    extra_string_length_mm: (value) => { setup.extraStringLengthMm = value; },
  };
  const update = numericFields[input.id];
  if (update) update(Number(input.value));
}

function render() {
  try {
    const result = calculateSetup(setup);
    setupGeometrySvg.innerHTML = renderSetupDiagram({ setup, result });
    resultRows.innerHTML = result.strings.map(renderResultRow).join("");
    mobileResultCards.innerHTML = renderMobileResultsByCourse(result.strings);
    renderMeasurementRail(result);
    renderMeasurementProvenance();
    calculationBasis.textContent = describeCalculationBasis(userEntryGroups);
    resultStatus.textContent = "Calculated from current inputs";
    hasRenderedResult = true;
    return null;
  } catch (error) {
    if (!hasRenderedResult) clearCalculatedOutput();
    calculationBasis.textContent = "Calculation paused until the highlighted input is corrected.";
    resultStatus.textContent = error.message;
    return error;
  }
}

function clearCalculatedOutput() {
  setupGeometrySvg.innerHTML = "";
  resultRows.innerHTML = "";
  mobileResultCards.innerHTML = "";
  clearMeasurementRail();
}

function showInputError(input, message) {
  input.setAttribute("aria-invalid", "true");
  const fieldError = document.createElement("small");
  fieldError.dataset.fieldError = "true";
  fieldError.className = "field-error";
  fieldError.textContent = message;
  input.closest("label")?.append(fieldError);
}

function clearInputError(input) {
  input.removeAttribute("aria-invalid");
  input.closest("label")?.querySelector("[data-field-error]")?.remove();
}

function renderMeasurementRail(result) {
  const targetAction = setup.benchActionTargets.actionAtMeasurementWithCapoMm;
  const nutAction = setup.benchActionTargets.nutActionAtFirstFretMm;
  const errors = result.strings.map((stringResult) => calculateMaximumAbsoluteCentsError(
    stringResult.intonation.centsErrorByFret,
  ));
  const nutCompensations = result.strings.map((stringResult) => stringResult.intonation.nutCompensationMm);
  const saddleCompensations = result.strings.map((stringResult) => stringResult.intonation.saddleCompensationMm);
  railAction.textContent = `${setup.strings[0].name} ${formatMm(targetAction.firstStringMm)} · ${setup.strings.at(-1).name} ${formatMm(targetAction.lastStringMm)} · capo 1, fret 12`;
  railNutAction.textContent = `${setup.strings[0].name} ${formatMm(nutAction.firstStringMm)} · ${setup.strings.at(-1).name} ${formatMm(nutAction.lastStringMm)} · open, fret 1`;
  railRelief.textContent = setup.reliefAmountMm === 0
    ? "Off"
    : `${formatMm(setup.reliefAmountMm)} @ fret ${setup.reliefPeakFret}`;
  railError.textContent = `${Math.max(...errors).toFixed(1)}¢`;
  railNutCompensation.textContent = formatSignedMmRange(nutCompensations);
  railSaddleCompensation.textContent = formatSignedMmRange(saddleCompensations);
  railScaleLength.textContent = formatMmRange(result.strings.map(({ string }) => string.scaleLengthMm));
}

function clearMeasurementRail() {
  railAction.textContent = "—";
  railNutAction.textContent = "—";
  railRelief.textContent = "—";
  railError.textContent = "—";
  railNutCompensation.textContent = "—";
  railSaddleCompensation.textContent = "—";
  railScaleLength.textContent = "—";
}

function markUserEntry(input) {
  const group = provenanceGroupForInput(input);
  if (group) userEntryGroups.add(group);
}

function renderMeasurementProvenance() {
  setProvenance("rail_relief_source", "relief");
  setProvenance("rail_nut_action_source", "nutAction");
  setProvenance("rail_action_source", "bridgeAction");
  setProvenance("rail_scale_source", "scaleLength");
}

function changesMechanicalLookup(input) {
  return input.id === "tension_data_source"
    || input.dataset.stringField === "gaugeMm"
    || input.dataset.stringField === "construction";
}

function writeMechanicalPropertiesToStringCards() {
  setup.strings.forEach((string, stringIndex) => {
    const massInput = form.querySelector(
      `[data-string-index="${stringIndex}"][data-string-field="unitMassKgPerMeter"]`,
    );
    const stiffnessInput = form.querySelector(
      `[data-string-index="${stringIndex}"][data-string-field="axialStiffnessN"]`,
    );
    const sourceLabel = form.querySelector(`[data-unit-mass-source="${stringIndex}"]`);
    if (massInput) massInput.value = String(string.unitMassKgPerMeter);
    if (stiffnessInput) stiffnessInput.value = String(string.axialStiffnessN);
    if (sourceLabel) sourceLabel.textContent = string.tensionSource ? "Manufacturer" : "Gauge estimate";
  });
}

function setProvenance(elementId, group) {
  const badge = document.getElementById(elementId);
  const isUserEntry = userEntryGroups.has(group);
  badge.textContent = isUserEntry ? "User entry" : "Profile default";
  badge.classList.toggle("user-entry", isUserEntry);
}

function renderResultRow(result) {
  const nutAction = result.actionByFret[Math.min(1, result.actionByFret.length - 1)];
  const twelfthFret = result.actionByFret[Math.min(12, result.actionByFret.length - 1)];
  const peakErrorCents = calculateMaximumAbsoluteCentsError(result.intonation.centsErrorByFret);
  return `<tr>
    <th scope="row">C${result.string.courseIndex + 1} · ${escapeMarkup(result.string.name)}</th>
    <td>${formatMm(result.string.gaugeMm)}</td>
    <td>${formatMm(result.string.scaleLengthMm)}</td>
    <td>${formatMm(nutAction.clearanceAboveFretMm)}</td>
    <td>${formatMm(twelfthFret.clearanceAboveFretMm)}</td>
    <td>${formatMm(result.intonation.nutCompensationMm)}</td>
    <td>${formatMm(result.intonation.saddleCompensationMm)}</td>
    <td>${peakErrorCents.toFixed(1)}¢</td>
    <td>${escapeMarkup(result.string.tensionSource?.manufacturer || "Gauge estimate")}</td>
  </tr>`;
}

function renderMobileResultsByCourse(stringResults) {
  const resultsByCourse = new Map();
  for (const result of stringResults) {
    const courseResults = resultsByCourse.get(result.string.courseIndex) || [];
    courseResults.push(result);
    resultsByCourse.set(result.string.courseIndex, courseResults);
  }
  return [...resultsByCourse.entries()].map(([courseIndex, courseResults]) => `
    <article class="mobile-result-course">
      <header><strong>Course ${courseIndex + 1}</strong><small>${courseResults.length} ${courseResults.length === 1 ? "string" : "strings"}</small></header>
      ${courseResults.map(renderMobileResultString).join("")}
    </article>
  `).join("");
}

function renderMobileResultString(result) {
  const nutAction = result.actionByFret[Math.min(1, result.actionByFret.length - 1)];
  const twelfthFret = result.actionByFret[Math.min(12, result.actionByFret.length - 1)];
  const peakErrorCents = calculateMaximumAbsoluteCentsError(result.intonation.centsErrorByFret);
  const source = result.string.tensionSource?.manufacturer || "Gauge estimate";
  return `<section class="mobile-result-string">
    <header><strong>${escapeMarkup(result.string.name)}</strong><small>${formatMm(result.string.gaugeMm)} · ${formatMm(result.string.scaleLengthMm)} · ${escapeMarkup(source)}</small></header>
    <dl>
      <div><dt>Nut comp.</dt><dd>${formatSignedMm(result.intonation.nutCompensationMm)}</dd></div>
      <div><dt>Saddle comp.</dt><dd>${formatSignedMm(result.intonation.saddleCompensationMm)}</dd></div>
      <div><dt>Peak error</dt><dd>${peakErrorCents.toFixed(1)}¢</dd></div>
      <div><dt>Nut action</dt><dd>${formatMm(nutAction.clearanceAboveFretMm)}</dd></div>
      <div><dt>Open @ 12</dt><dd>${formatMm(twelfthFret.clearanceAboveFretMm)}</dd></div>
    </dl>
  </section>`;
}

function updateRadiusFields() {
  const radiusKind = radiusKindForSetup();
  const isSimple = radiusKind === "simple";
  const isCompound = radiusKind === "compound";
  document.getElementById("simple_radius_field").hidden = !isSimple;
  document.getElementById("nut_radius_field").hidden = !isCompound;
  document.getElementById("bridge_radius_field").hidden = !isCompound;
}

function continueToRadius() {
  form.querySelector('[aria-labelledby="step-length-title"]').open = false;
  const radiusStep = document.getElementById("radius_step");
  radiusStep.open = true;
  radiusStep.querySelector("summary").focus();
}

function radiusValueFor(kind) {
  if (kind === "simple") {
    return Number.isFinite(setup.radiusProfile.radiusMm) ? setup.radiusProfile.radiusMm : 304.8;
  }
  return setup.radiusProfile.nutRadiusMm ?? 304.8;
}

function radiusKindForSetup() {
  if (setup.radiusProfile.kind === "compound") return "compound";
  return setup.radiusProfile.radiusMm === Infinity ? "none" : "simple";
}

function selectRadiusKind(radiusKind) {
  if (radiusKind === "none") {
    setup.radiusProfile = { kind: "simple", radiusMm: Infinity };
    return;
  }
  if (radiusKind === "simple") {
    setup.radiusProfile = {
      kind: "simple",
      radiusMm: Number(document.getElementById("simple_radius_mm").value),
    };
    return;
  }
  setup.radiusProfile = {
    kind: "compound",
    nutRadiusMm: Number(document.getElementById("nut_radius_mm").value),
    bridgeRadiusMm: Number(document.getElementById("bridge_radius_mm").value),
  };
}

function selectInstrumentProfile(profileId) {
  const catalog = setup.tensionCatalog;
  setup = createSetupFromInstrumentProfile(profileId);
  userEntryGroups.clear();
  if (catalog) {
    setup = applyTensionCatalogToSetup(setup, catalog, setup.tensionDataSource);
  }
  customProfileBuilder.hidden = true;
  renderStringInputs();
  writeSetupToForm();
  render();
}

function renderActiveProfile() {
  renderOuterStringLabels();
}

function renderOuterStringLabels() {
  const firstStringName = setup.strings[0].name;
  const lastStringName = setup.strings.at(-1).name;
  document.getElementById("action_first_string_label").textContent = `First · ${firstStringName} (mm)`;
  document.getElementById("action_last_string_label").textContent = `Last · ${lastStringName} (mm)`;
  document.getElementById("nut_action_first_string_label").textContent = `First · ${firstStringName} (mm)`;
  document.getElementById("nut_action_last_string_label").textContent = `Last · ${lastStringName} (mm)`;
}

function showCustomProfileBuilder() {
  customProfileBuilder.hidden = false;
  customCourseCount.value = String(setup.courseCount);
  renderCustomCourseMembers(setup.courseCount, membersByCourseFromSetup());
}

function renderCustomCourseMembers(courseCount, memberCounts = []) {
  const boundedCourseCount = Math.max(1, Math.min(8, courseCount));
  customCourseCount.value = String(boundedCourseCount);
  customCourseMembers.innerHTML = Array.from({ length: boundedCourseCount }, (_, courseIndex) => `
    <label><span>Course ${courseIndex + 1}</span><select data-course-member-count="${courseIndex}">
      <option value="1" ${(memberCounts[courseIndex] ?? 1) === 1 ? "selected" : ""}>1 string</option>
      <option value="2" ${memberCounts[courseIndex] === 2 ? "selected" : ""}>2 strings</option>
    </select></label>
  `).join("");
}

function membersByCourseFromSetup() {
  return Array.from({ length: setup.courseCount }, (_, courseIndex) => (
    setup.strings.filter((string) => string.courseIndex === courseIndex).length || 1
  ));
}

function buildCustomProfile() {
  const membersByCourse = [...customCourseMembers.querySelectorAll("[data-course-member-count]")]
    .map((select) => Number(select.value));
  setup = createCustomSetupFromCourseMembers({ baseSetup: setup, membersByCourse });
  userEntryGroups.add("stringSpecification");
  renderStringInputs();
  writeSetupToForm();
  render();
}

function setValue(id, value) {
  document.getElementById(id).value = String(value);
}

function formatMm(value) {
  return `${value.toFixed(2)} mm`;
}

function formatSignedMm(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} mm`;
}

function formatSignedMmRange(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (Math.abs(maximum - minimum) < 0.005) return formatSignedMm(minimum);
  return `${formatSignedMm(minimum)} to ${formatSignedMm(maximum)}`;
}

function formatMmRange(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (Math.abs(maximum - minimum) < 0.005) return formatMm(minimum);
  return `${minimum.toFixed(2)} to ${maximum.toFixed(2)} mm`;
}

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tensionSourceIdForSetup() {
  if (!setup.tensionDataSource) return "estimate";
  const dAddarioOptions = {
    EJ16: "daddario_ej16",
    EJ38: "daddario_ej38",
    EXL170: "daddario_exl170",
    EJ45: "daddario_ej45",
    EJ65T: "daddario_ej65t",
    EJ74: "daddario_ej74",
  };
  if (setup.tensionDataSource.manufacturer === "D'Addario") {
    return dAddarioOptions[setup.tensionDataSource.setCode] || "estimate";
  }
  if (setup.tensionDataSource.setCodes?.includes("bronze")) return "stringjoy_bronze";
  return "stringjoy_nickel";
}

async function initializeTensionCatalog() {
  try {
    resultStatus.textContent = "Loading manufacturer tension catalog...";
    const response = await fetch("./tension_catalog.json");
    if (!response.ok) throw new Error("Manufacturer tension catalog is unavailable");
    const catalog = await response.json();
    setup = applyTensionCatalogToSetup(
      setup,
      catalog,
      tensionSourceOptions[tensionSourceIdForSetup()],
    );
    renderStringInputs();
    writeSetupToForm();
    render();
  } catch (error) {
    resultStatus.textContent = "Using gauge estimates: manufacturer catalog unavailable";
    render();
  }
}
