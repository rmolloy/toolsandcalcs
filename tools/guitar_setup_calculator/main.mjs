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
import { createLengthUnitController } from "./length_unit_controller.mjs";
import { createSparseActionEditor } from "./sparse_action_editor.mjs";
import { createSetupResultPresenter } from "./setup_result_presenter.mjs";
import { createSetupProfileEditor } from "./setup_profile_editor.mjs";
import { createSetupFormController } from "./setup_form_controller.mjs";
import { createStockSpecs } from "./stock_specs.mjs";
import {
  describeActionProvenance,
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs";

let setup = createDefaultSetup();
const lengthUnits = createLengthUnitController(document);
const userEntryGroups = new Set();
const tensionSourceOptions = {
  estimate: null,
  daddario_ej16: { manufacturer: "D'Addario", setCode: "EJ16" },
  daddario_exl110: { manufacturer: "D'Addario", setCode: "EXL110" },
  daddario_ej38: { manufacturer: "D'Addario", setCode: "EJ38" },
  daddario_exl170: { manufacturer: "D'Addario", setCode: "EXL170" },
  daddario_ej45: { manufacturer: "D'Addario", setCode: "EJ45" },
  daddario_ej65t: { manufacturer: "D'Addario", setCode: "EJ65T" },
  daddario_ej74: { manufacturer: "D'Addario", setCode: "EJ74" },
  stringjoy_nickel: { manufacturer: "Stringjoy", setCodes: ["plain", "nickel"] },
  stringjoy_bronze: { manufacturer: "Stringjoy", setCodes: ["plain", "bronze"] },
};
const form = document.getElementById("setup_form");
const setupPage = document.querySelector(".setup-page");
const setupModeButtons = Array.from(document.querySelectorAll("[data-setup-mode-button]"));
const setupViewStatus = document.getElementById("setup_view_status");
const instrumentProfile = document.getElementById("instrument_profile");
const customCourseCount = document.getElementById("custom_course_count");
const setupGeometrySvg = document.getElementById("setup_geometry_svg");
const resultStatus = document.getElementById("result_status");
const calculationBasis = document.getElementById("calculation_basis");
const resultPresenter = createSetupResultPresenter({
  document,
  lengthUnits,
  calculateMaximumAbsoluteCentsError,
  escapeMarkup,
});
const sparseActionEditor = createSparseActionEditor({
  document,
  lengthUnits,
  escapeMarkup,
  clearInputError,
  showInputError,
  onMeasurementsChanged: handleSparseActionChange,
  onError: (error) => { resultStatus.textContent = error.message; },
});
const profileEditor = createSetupProfileEditor({
  document,
  getSetup: () => setup,
  instrumentProfiles: INSTRUMENT_PROFILES,
  lengthUnits,
});
const stockSpecs = createStockSpecs({
  document,
  lengthUnits,
  onSelectProfile: (profileId) => selectInstrumentProfile(profileId),
  onMeasure: () => showSetupMode("measure"),
});
const setupForm = createSetupFormController({
  applyTensionCatalogToSetup,
  document,
  estimateStringMechanicalProperties,
  form,
  getSetup: () => setup,
  lengthUnits,
  profileEditor,
  setSetup: (nextSetup) => { setup = nextSetup; },
  sparseActionEditor,
  tensionSourceOptions,
});
let hasRenderedResult = false;

profileEditor.renderInstrumentProfileOptions();
profileEditor.renderStringInputs();
setupForm.writeSetupToForm();
stockSpecs.render(setup.instrumentProfileId);
render();
setupModeButtons.forEach((button) => button.addEventListener("click", handleSetupModeChange));
document.querySelectorAll("[data-length-unit-button]").forEach((button) => {
  button.addEventListener("click", handleLengthUnitChange);
});
form.addEventListener("input", handleFormChange);
form.addEventListener("change", handleFormChange);
instrumentProfile.addEventListener("change", handleFormChange);
customCourseCount.addEventListener("input", handleFormChange);
document.getElementById("customize_profile").addEventListener("click", profileEditor.showCustomProfileBuilder);
document.getElementById("build_custom_profile").addEventListener("click", buildCustomProfile);
document.getElementById("continue_to_radius").addEventListener("click", continueToRadius);
sparseActionEditor.bind(() => setup);
initializeTensionCatalog();

function handleSetupModeChange(event) {
  showSetupMode(event.currentTarget.dataset.setupModeButton);
}

function handleLengthUnitChange(event) {
  const nextUnit = event.currentTarget.dataset.lengthUnitButton;
  if (lengthUnits.isSelected(nextUnit)) return;
  const sparseDraftMm = sparseActionEditor.readDraftMillimetres();
  lengthUnits.select(nextUnit);
  profileEditor.renderStringInputs();
  setupForm.writeSetupToForm();
  sparseActionEditor.restoreDraftMillimetres(sparseDraftMm);
  stockSpecs.render(setup.instrumentProfileId);
  render();
}

function showSetupMode(mode) {
  const isMeasureMode = mode === "measure";

  setupPage.dataset.setupMode = isMeasureMode ? "measure" : "specs";
  form.hidden = !isMeasureMode;
  setupViewStatus.textContent = isMeasureMode ? "Measure" : "Reference specs";

  setupModeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.setupModeButton === setupPage.dataset.setupMode));
  });
}

function handleSparseActionChange() {
  const hasSparseActionMeasurements = setup.strings.some(
    (string) => (string.actionMeasurements ?? []).length > 0,
  );
  if (hasSparseActionMeasurements) {
    userEntryGroups.add("measuredAction");
  } else {
    userEntryGroups.delete("measuredAction");
  }
  render();
}

function handleFormChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
  clearInputError(input);
  if (sparseActionEditor.contains(input)) return;
  if (input.id === "instrument_profile" && input.value !== "custom") {
    selectInstrumentProfile(input.value);
    return;
  }
  if (input.id === "custom_course_count") {
    profileEditor.renderCustomCourseMembers(Number(input.value));
    return;
  }
  try {
    markUserEntry(input);
    setupForm.readInputIntoSetup(input);
    if (setupForm.changesMechanicalLookup(input)) {
      setupForm.writeMechanicalPropertiesToStringCards();
    }
    const calculationError = render();
    if (input.id === "fret_count") sparseActionEditor.render(setup);
    if (calculationError) showInputError(input, calculationError.message);
  } catch (error) {
    showInputError(input, error.message);
    resultStatus.textContent = error.message;
  }
  setupForm.updateRadiusFields();
}

function render() {
  try {
    const result = calculateSetup(setup);
    setupGeometrySvg.innerHTML = renderSetupDiagram({ setup, result, lengthUnit: lengthUnits.unit });
    resultPresenter.render({ setup, result });
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
  resultPresenter.clear();
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

function markUserEntry(input) {
  const group = provenanceGroupForInput(input);
  if (group) userEntryGroups.add(group);
}

function renderMeasurementProvenance() {
  setProvenance("rail_relief_source", "relief");
  setProvenance("rail_nut_action_source", "nutAction");
  setActionProvenance();
  setProvenance("rail_scale_source", "scaleLength");
}

function setActionProvenance() {
  const badge = document.getElementById("rail_action_source");
  badge.textContent = describeActionProvenance(userEntryGroups);
  badge.classList.toggle(
    "user-entry",
    userEntryGroups.has("bridgeAction") || userEntryGroups.has("measuredAction"),
  );
}

function setProvenance(elementId, group) {
  const badge = document.getElementById(elementId);
  const isUserEntry = userEntryGroups.has(group);
  badge.textContent = isUserEntry ? "User entry" : "Profile default";
  badge.classList.toggle("user-entry", isUserEntry);
}

function continueToRadius() {
  form.querySelector('[aria-labelledby="step-length-title"]').open = false;
  const radiusStep = document.getElementById("radius_step");
  radiusStep.open = true;
  radiusStep.querySelector("summary").focus();
}

function selectInstrumentProfile(profileId) {
  const catalog = setup.tensionCatalog;
  setup = createSetupFromInstrumentProfile(profileId);
  userEntryGroups.clear();
  if (catalog) {
    setup = applyTensionCatalogToSetup(setup, catalog, setup.tensionDataSource);
  }
  profileEditor.hideCustomProfileBuilder();
  profileEditor.renderStringInputs();
  setupForm.writeSetupToForm();
  stockSpecs.render(setup.instrumentProfileId);
  render();
}

function buildCustomProfile() {
  const membersByCourse = profileEditor.readCustomCourseMembers();
  setup = createCustomSetupFromCourseMembers({ baseSetup: setup, membersByCourse });
  userEntryGroups.add("stringSpecification");
  profileEditor.renderStringInputs();
  setupForm.writeSetupToForm();
  render();
}

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
      tensionSourceOptions[setupForm.tensionSourceIdForSetup()],
    );
    profileEditor.renderStringInputs();
    setupForm.writeSetupToForm();
    render();
  } catch (_error) {
    resultStatus.textContent = "Using gauge estimates: manufacturer catalog unavailable";
    render();
  }
}
