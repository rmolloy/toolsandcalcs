import {
  applyTensionCatalogToSetup,
  calculateCompensationComparisonForString,
  calculateMaximumAbsoluteCentsError,
  calculateSetup,
  createCustomSetupFromCourseMembers,
  createDefaultSetup,
  createSetupFromInstrumentProfile,
  estimateStringMechanicalProperties,
  INSTRUMENT_PROFILES,
} from "./setup_model.mjs?rev=37b595148646";
import { renderSetupDiagram } from "./setup_diagram.mjs?rev=37b595148646";
import { createLengthUnitController } from "./length_unit_controller.mjs?rev=37b595148646";
import { createSparseActionEditor } from "./sparse_action_editor.mjs?rev=37b595148646";
import { createSetupResultPresenter } from "./setup_result_presenter.mjs?rev=37b595148646";
import { createSetupPitchErrorChart } from "./setup_pitch_error_chart.mjs?rev=37b595148646";
import { createSetupProfileEditor } from "./setup_profile_editor.mjs?rev=37b595148646";
import "../common/per_tab_tool_session.js?rev=37b595148646";
import { createSetupSessionPersistence } from "./setup_session_persistence.mjs?rev=37b595148646";
import { readSetupSessionView, restoreSetupSessionView } from "./setup_session_view.mjs?rev=37b595148646";
import { createScaleLengthEditor } from "./scale_length_editor.mjs?rev=37b595148646";
import { createSetupFormController } from "./setup_form_controller.mjs?rev=37b595148646";
import { createSetupStepNavigation } from "./setup_step_navigation.mjs?rev=37b595148646";
import { createSetupProfileReference } from "./setup_profile_reference.mjs?rev=37b595148646";
import { createSetupProfileSelection } from "./setup_profile_selection.mjs?rev=37b595148646";
import { readTensionCatalog } from "./tension_catalog_loader.mjs?rev=37b595148646";
import {
  describeActionProvenance,
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs?rev=37b595148646";

// localized-runtime-messages:start
const setupRuntimeMessages = Object.freeze({
  axialStiffnessLabel: "Axial stiffness (N)",
  buildLabel: "Build",
  calculationData: "Calculation data",
  calculationComplete: "Calculated from current inputs",
  calculationPaused: "Calculation paused until the highlighted input is corrected.",
  choosePhysicalString: "Choose a physical string",
  clearanceMustBeNonNegative: "Clearance must be zero or greater",
  courseLabel: "Course {courseNumber}",
  courseStringLabel: "C{courseNumber} · {stringName}",
  courseStringLegend: "Course {courseNumber} · {stringName}",
  customProfileLabel: "Custom",
  diagramMessages: Object.freeze({
    actionAtFret12Heading: "ACTION @ FRET 12 · CAPO 1",
    courseAbbreviation: "C",
    description: "A broken-scale top view of {stringCount} strings, with calculated nut and saddle compensation for every physical string. Unequal string lengths fan around fret {neutralFret}.",
    first: "first",
    fretOne: "FRET 1",
    fretTwelve: "FRET 12",
    fretTwelveToSaddle: "12TH FRET → SADDLE",
    last: "last",
    mobileNutLabel: "Calculated nut compensation and first-fret geometry",
    mobileSaddleLabel: "Calculated saddle compensation and twelfth-fret geometry",
    nut: "NUT",
    nutActionHeading: "NUT ACTION @ FRET 1 · OPEN",
    nutDirection: "+ toward fret 1 →",
    nutInsertLabel: "5 millimetre nut insert",
    nutToFretOne: "NUT → FRET 1",
    saddle: "SADDLE",
    saddleDirection: "+ lengthen →",
    saddleInsertLabel: "6 millimetre saddle insert",
    scaleContinues: "scale continues",
    scalePerString: "{range} · neutral fret {neutralFret}",
    scaleSingle: "{length} scale",
    title: "Calculated nut and saddle geometry",
  }),
  estimatedCoreLabel: "Estimated core",
  firstNamedStringLabel: "First · {stringName} ({unit})",
  fretRange: "Fret must be a whole number from 0 to {fretCount}",
  fretLabel: "Fret",
  gaugeEstimate: "Gauge estimate",
  lastNamedStringLabel: "Last · {stringName} ({unit})",
  manufacturer: "Manufacturer",
  midiNoteLabel: "MIDI note",
  nameLabel: "Name",
  noAdditionalReadings: "No additional readings.",
  oneStringLabel: "1 string",
  plainConstructionLabel: "Plain",
  pitchErrorMessages: Object.freeze({
    download: "Download plot as a png",
    zoom: "Zoom",
    pan: "Pan",
    boxSelect: "Box Select",
    lassoSelect: "Lasso Select",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    autoscale: "Autoscale",
    resetAxes: "Reset axes",
    settings: "Graph settings",
    invalidRange: "Minimum must be less than maximum.",
    cents: "Cents",
    courseStringLabel: "C{courseNumber} · {stringName}",
    flat: "Flat",
    fret: "Fret",
    nutAndSaddle: "Nut + saddle",
    openReference: "Open string · retuned to 0 cents",
    saddleOnly: "Saddle only",
    scope: "Both fits use frets 1–{lastFret}. Open string retuned to 0 cents.",
    sharp: "Sharp",
    unavailable: "Chart unavailable; calculated results remain available.",
  }),
  woundConstructionLabel: "Wound",
  profileDefault: "Profile default",
  profileLabels: Object.freeze({
    classical: "Classical guitar",
    electric: "Electric guitar",
    four_string_bass: "4-string bass",
    mandolin: "Mandolin",
    steel_string: "Steel-string guitar",
    tenor_ukulele: "Tenor ukulele",
    twelve_string: "12-string guitar",
  }),
  profileStringNames: Object.freeze({
    highE: "High E",
    lowE: "Low E",
  }),
  provenanceMessages: Object.freeze({
    calculatedFromMeasurements: "Calculated from your measured setup.",
    measuredAtFrets: "Measured at frets",
    mixedInputs: "Preview mixes {userMeasurementCount} user input groups with {profileDefaultCount} profile defaults.",
    previewFromDefaults: "Preview from profile defaults. Enter your measurements before using the compensation pattern.",
    profileDefault: "Profile default",
    userEntry: "User entry",
  }),
  reliefMustNotBeNegative: "reliefMm must not be negative",
  removeReadingLabel: "Remove {stringName} fret {fretNumber} reading",
  removeReadingTitle: "Remove reading",
  resultMessages: Object.freeze({
    actionContext: "capo 1, fret 12",
    courseLabel: "Course {courseNumber}",
    gaugeEstimate: "Gauge estimate",
    nutAction: "Nut action",
    nutActionContext: "open, fret 1",
    nutCompensation: "Nut comp.",
    oneString: "1 string",
    openAtFret12: "Open @ 12",
    peakError: "Peak error",
    reliefAtFret: "{relief} @ fret {fretNumber}",
    reliefOff: "Off",
    saddleCompensation: "Saddle comp.",
    twoStrings: "2 strings",
  }),
  stringGaugeLabel: "Gauge ({unit})",
  stringLengthLabel: "Length ({unit})",
  stockSpecMessages: Object.freeze({
    actionAtFret12: "Action @ 12th fret",
    actionAtNut: "Action at nut",
    draft: "Draft — confirm",
    families: {
      classical: {
        label: "Classical",
        note: "Tie-block break angle matters as much as height.",
        nutActionText: "higher — set by feel",
        reliefText: "flat — usually no rod",
      },
      electric: {
        label: "Electric",
        note: "Balance the tremolo before setting action.",
      },
      four_string_bass: {
        label: "Bass",
        note: "Longer scale — relief reads farther up the neck.",
      },
      steel_string: {
        label: "Steel-string",
        note: "Slide or heavy attack: run the high side.",
      },
    },
    relief: "Relief",
    selected: "Selected",
  }),
  tensionCatalogLoading: "Loading manufacturer tension catalog...",
  tensionCatalogUnavailable: "Manufacturer tension catalog is unavailable",
  tensionEstimateFallback: "Using gauge estimates: manufacturer catalog unavailable",
  twoStringsLabel: "2 strings",
  unitMassLabel: "Unit mass (kg/m)",
  userEntry: "User entry",
});
// localized-runtime-messages:end

const setupErrorMessages = new Map([
  ["Choose a physical string", setupRuntimeMessages.choosePhysicalString],
  ["Clearance must be zero or greater", setupRuntimeMessages.clearanceMustBeNonNegative],
  ["reliefMm must not be negative", setupRuntimeMessages.reliefMustNotBeNegative],
]);
const tensionSourceLabels = Object.freeze({
  gaugeEstimate: setupRuntimeMessages.gaugeEstimate,
  manufacturer: setupRuntimeMessages.manufacturer,
});

const setupSession = createSetupSessionPersistence(window, captureSetupSession);
const restoredSession = setupSession.read();
let setup = localizeProfileStringNames(
  restoredSession?.setup || createDefaultSetup(),
  setupRuntimeMessages.profileStringNames,
);
const lengthUnits = createLengthUnitController(document);
lengthUnits.select(restoredSession?.unit);
const userEntryGroups = new Set(restoredSession?.userEntryGroups || []);
const mechanicalFieldNames = ["unitMassKgPerMeter", "axialStiffnessN"];
const pendingMechanicalFields = new Map();
let isTensionCatalogPending = true;
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
const setupModeMessages = new Map(
  setupModeButtons.map((button) => [
    button.dataset.setupModeButton,
    button.textContent.trim(),
  ]),
);
const setupViewStatus = document.getElementById("setup_view_status");
const setupGeometrySvg = document.getElementById("setup_geometry_svg");
const calculationBasis = document.getElementById("calculation_basis");
const resultPresenter = createSetupResultPresenter({
  document,
  lengthUnits,
  calculateMaximumAbsoluteCentsError,
  escapeMarkup,
  messages: setupRuntimeMessages.resultMessages,
});
const pitchErrorChart = createSetupPitchErrorChart({
  document,
  plotly: window.Plotly,
  calculateComparison: calculateCompensationComparisonForString,
  messages: setupRuntimeMessages.pitchErrorMessages,
});
const sparseActionEditor = createSparseActionEditor({
  document,
  emptyReadingsMessage: setupRuntimeMessages.noAdditionalReadings,
  lengthUnits,
  escapeMarkup,
  clearInputError,
  formatCourseStringLabel,
  formatFretRangeError,
  formatRemoveReadingLabel,
  fretLabel: setupRuntimeMessages.fretLabel,
  readErrorMessage: readSetupErrorMessage,
  removeReadingTitle: setupRuntimeMessages.removeReadingTitle,
  showInputError,
  onMeasurementsChanged: handleSparseActionChange,
  onError: (error) => showCalculationStatus(readSetupErrorMessage(error)),
});
const profileEditor = createSetupProfileEditor({
  axialStiffnessLabel: setupRuntimeMessages.axialStiffnessLabel,
  buildLabel: setupRuntimeMessages.buildLabel,
  calculationDataLabel: setupRuntimeMessages.calculationData,
  customProfileLabel: setupRuntimeMessages.customProfileLabel,
  document,
  estimatedCoreLabel: setupRuntimeMessages.estimatedCoreLabel,
  formatCourseStringLegend,
  formatCustomCourseLabel,
  formatFirstStringLabel,
  formatLastStringLabel,
  formatStringGaugeLabel,
  formatStringLengthLabel,
  getSetup: () => setup,
  instrumentProfileLabels: setupRuntimeMessages.profileLabels,
  instrumentProfiles: INSTRUMENT_PROFILES,
  lengthUnits,
  midiNoteLabel: setupRuntimeMessages.midiNoteLabel,
  nameLabel: setupRuntimeMessages.nameLabel,
  oneStringLabel: setupRuntimeMessages.oneStringLabel,
  plainConstructionLabel: setupRuntimeMessages.plainConstructionLabel,
  tensionSourceLabels,
  twoStringsLabel: setupRuntimeMessages.twoStringsLabel,
  unitMassLabel: setupRuntimeMessages.unitMassLabel,
  woundConstructionLabel: setupRuntimeMessages.woundConstructionLabel,
});
const profileReference = createSetupProfileReference({
  document,
  instrumentProfiles: INSTRUMENT_PROFILES,
  lengthUnits,
});
const profileSelection = createSetupProfileSelection({
  hasUserEntries: () => userEntryGroups.size > 0 || scaleEditor.validationError !== null,
  confirmReplacement: () => window.confirm(document.getElementById("instrument_profile").dataset.replacePrompt),
  restoreSelection: () => { document.getElementById("instrument_profile").value = setup.instrumentProfileId; },
  selectProfile: selectInstrumentProfile,
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
  tensionSourceLabels,
  tensionSourceOptions,
});
let hasRenderedResult = false;
const scaleEditor = createScaleLengthEditor({
  document, getSetup: () => setup, lengthUnits,
  onChange: () => { userEntryGroups.add("scaleLength"); render(); },
  onViewChange: render,
  onInvalid: showCalculationStatus,
  restoredView: restoredSession?.view,
});
scaleEditor.bind();

profileEditor.renderInstrumentProfileOptions();
profileEditor.renderStringInputs();
setupForm.writeSetupToForm();
profileReference.render(setup.instrumentProfileId);
render();
const stepNavigation = createSetupStepNavigation(document, { 2: 1, 3: 1 });
setupModeButtons.forEach((button) => button.addEventListener("click", handleSetupModeChange));
document.querySelectorAll(".length-unit-control [data-length-unit-button]").forEach((button) => {
  button.addEventListener("click", handleLengthUnitChange);
});
form.addEventListener("input", handleFormChange);
form.addEventListener("change", handleFormChange);
document.getElementById("customize_profile").addEventListener("click", profileEditor.showCustomProfileBuilder);
document.getElementById("build_custom_profile").addEventListener("click", buildCustomProfile);
sparseActionEditor.bind(() => setup);
preserveRestoredMechanicalFields();
restoreSetupSessionViewAndAttach();
initializeTensionCatalog();

function captureSetupSession() {
  return {
    setup: canonicalizeSessionStringNames(setup),
    unit: lengthUnits.unit,
    userEntryGroups,
    step: stepNavigation.index,
    view: { ...readSetupSessionView(document), ...scaleEditor.captureView() },
  };
}

function canonicalizeSessionStringNames(candidate) {
  if (candidate.instrumentProfileId === "custom") return candidate;
  const names = setupRuntimeMessages.profileStringNames;
  const canonicalNames = new Map([[names.highE, "High E"], [names.lowE, "Low E"]]);
  return { ...candidate, strings: candidate.strings.map((string) => ({
    ...string, name: canonicalNames.get(string.name) || string.name,
  })) };
}

function restoreSetupSessionViewAndAttach() {
  restoreSetupSessionView(document, restoredSession?.view, profileEditor);
  if (hasRenderedResult) pitchErrorChart.render(setup);
  if (restoredSession?.step) stepNavigation.select(restoredSession.step);
  setupSession.attach();
  registerSharedLengthUnits();
}

function registerSharedLengthUnits() {
  if (!window.ToolLengthUnits) return;
  window.ToolLengthUnits.register({ readUnit: () => lengthUnits.unit, applyUnit: applyLengthUnit });
  document.querySelector('.length-unit-control')?.remove();
}

function handleSetupModeChange(event) {
  showSetupMode(event.currentTarget.dataset.setupModeButton);
}

function handleLengthUnitChange(event) {
  applyLengthUnit(event.currentTarget.dataset.lengthUnitButton);
}

function applyLengthUnit(nextUnit) {
  if (lengthUnits.isSelected(nextUnit)) return;
  const disclosures = [...form.querySelectorAll('details')].map((details) => details.open);
  const sparseDraftMm = sparseActionEditor.readDraftMillimetres();
  lengthUnits.select(nextUnit);
  scaleEditor.presentCommonLength();
  profileEditor.renderStringInputs();
  setupForm.writeSetupToForm();
  sparseActionEditor.restoreDraftMillimetres(sparseDraftMm);
  profileReference.render(setup.instrumentProfileId);
  render();
  form.querySelectorAll('details').forEach((details, index) => { details.open = disclosures[index]; });
}

function showSetupMode(mode) {
  const isMeasureMode = mode === "measure";

  setupPage.dataset.setupMode = isMeasureMode ? "measure" : "specs";
  form.hidden = !isMeasureMode;
  setupViewStatus.textContent = setupModeMessageRead(setupPage.dataset.setupMode);

  setupModeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.setupModeButton === setupPage.dataset.setupMode));
  });
}

function setupModeMessageRead(mode) {
  const message = setupModeMessages.get(mode);
  if (!message) throw new Error(`Missing setup mode message: ${mode}`);
  return message;
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
  if (input.id === "instrument_profile" && event.type !== "change") return;
  if (scaleEditor.contains(input)) return;
  clearInputError(input);
  if (sparseActionEditor.contains(input)) return;
  if (input.id === "instrument_profile" && input.value !== "custom") {
    profileSelection.request(input.value);
    return;
  }
  if (input.id === "custom_course_count") {
    profileEditor.renderCustomCourseMembers(Number(input.value));
    return;
  }
  try {
    markUserEntry(input);
    preservePendingMechanicalInput(input);
    setupForm.readInputIntoSetup(input);
    if (setupForm.changesMechanicalLookup(input)) {
      forgetPendingMechanicalLookup(input);
      setupForm.writeMechanicalPropertiesToStringCards();
    }
    const calculationError = render();
    if (input.id === "fret_count") sparseActionEditor.render(setup);
    if (calculationError) showInputError(input, readSetupErrorMessage(calculationError));
  } catch (error) {
    const message = readSetupErrorMessage(error);
    showInputError(input, message);
    showCalculationStatus(message);
  }
  setupForm.updateRadiusFields();
}

function render() {
  scaleEditor.render();
  renderInputProvenance();
  try {
    const scaleLengthError = scaleEditor.validationError;
    if (scaleLengthError) throw scaleLengthError;
    const result = calculateSetup(setup);
    setupGeometrySvg.innerHTML = renderSetupDiagram({
      setup,
      result,
      lengthUnit: lengthUnits.unit,
      messages: setupRuntimeMessages.diagramMessages,
    });
    resultPresenter.render({ setup, result });
    pitchErrorChart.render(setup);
    renderMeasurementProvenance();
    calculationBasis.textContent = describeCalculationBasis(
      userEntryGroups,
      setupRuntimeMessages.provenanceMessages,
    );
    showCalculationStatus(setupRuntimeMessages.calculationComplete);
    hasRenderedResult = true;
    return null;
  } catch (error) {
    if (!hasRenderedResult) clearCalculatedOutput();
    calculationBasis.textContent = setupRuntimeMessages.calculationPaused;
    showCalculationStatus(readSetupErrorMessage(error));
    return error;
  }
}

function readSetupErrorMessage(error) {
  return setupErrorMessages.get(error.message) ?? error.message;
}

function showCalculationStatus(message) {
  document.querySelectorAll("[data-setup-status]").forEach((status) => { status.textContent = message; });
}

function formatFretRangeError(fretCount) {
  return setupRuntimeMessages.fretRange.replace("{fretCount}", String(fretCount));
}

function formatCourseStringLabel(courseNumber, stringName) {
  return setupRuntimeMessages.courseStringLabel
    .replace("{courseNumber}", String(courseNumber))
    .replace("{stringName}", stringName);
}

function formatCourseStringLegend(courseNumber, stringName) {
  return setupRuntimeMessages.courseStringLegend
    .replace("{courseNumber}", String(courseNumber))
    .replace("{stringName}", stringName);
}

function formatCustomCourseLabel(courseNumber) {
  return setupRuntimeMessages.courseLabel.replace("{courseNumber}", String(courseNumber));
}

function formatFirstStringLabel(stringName, unit) {
  return formatNamedStringLabel(setupRuntimeMessages.firstNamedStringLabel, stringName, unit);
}

function formatLastStringLabel(stringName, unit) {
  return formatNamedStringLabel(setupRuntimeMessages.lastNamedStringLabel, stringName, unit);
}

function formatNamedStringLabel(message, stringName, unit) {
  return message
    .replace("{stringName}", stringName)
    .replace("{unit}", unit);
}

function formatRemoveReadingLabel(stringName, fretNumber) {
  return setupRuntimeMessages.removeReadingLabel
    .replace("{stringName}", stringName)
    .replace("{fretNumber}", String(fretNumber));
}

function formatStringLengthLabel(unit) {
  return setupRuntimeMessages.stringLengthLabel.replace("{unit}", unit);
}

function formatStringGaugeLabel(unit) {
  return setupRuntimeMessages.stringGaugeLabel.replace("{unit}", unit);
}

function clearCalculatedOutput() {
  setupGeometrySvg.innerHTML = "";
  resultPresenter.clear();
  pitchErrorChart.clear();
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

function renderInputProvenance() {
  setProvenance("radius_input_source", "radius");
  setProvenance("relief_input_source", "relief");
  setActionProvenance("bridge_input_source");
}

function setActionProvenance(elementId = "rail_action_source") {
  const badge = document.getElementById(elementId);
  badge.textContent = describeActionProvenance(
    userEntryGroups,
    setupRuntimeMessages.provenanceMessages,
  );
  badge.classList.toggle(
    "user-entry",
    userEntryGroups.has("bridgeAction") || userEntryGroups.has("measuredAction"),
  );
}

function setProvenance(elementId, group) {
  const badge = document.getElementById(elementId);
  const isUserEntry = userEntryGroups.has(group);
  badge.textContent = isUserEntry
    ? setupRuntimeMessages.userEntry
    : setupRuntimeMessages.profileDefault;
  badge.classList.toggle("user-entry", isUserEntry);
}

function selectInstrumentProfile(profileId) {
  pendingMechanicalFields.clear();
  const catalog = setup.tensionCatalog;
  setup = localizeProfileStringNames(
    createSetupFromInstrumentProfile(profileId),
    setupRuntimeMessages.profileStringNames,
  );
  userEntryGroups.clear();
  if (catalog) {
    setup = applyTensionCatalogToSetup(setup, catalog, setup.tensionDataSource);
  }
  profileEditor.hideCustomProfileBuilder();
  profileEditor.renderStringInputs();
  scaleEditor.reset();
  setupForm.writeSetupToForm();
  profileReference.render(setup.instrumentProfileId);
  render();
}

function localizeProfileStringNames(candidateSetup, stringNames) {
  if (candidateSetup.instrumentProfileId === "custom") return candidateSetup;
  return {
    ...candidateSetup,
    strings: candidateSetup.strings.map((string) => ({
      ...string,
      name: localizedProfileStringName(string.name, stringNames),
    })),
  };
}

function localizedProfileStringName(name, stringNames) {
  if (name === "High E") return stringNames.highE;
  if (name === "Low E") return stringNames.lowE;
  return name;
}

function buildCustomProfile() {
  pendingMechanicalFields.clear();
  const membersByCourse = profileEditor.readCustomCourseMembers();
  setup = createCustomSetupFromCourseMembers({ baseSetup: setup, membersByCourse });
  userEntryGroups.add("stringSpecification");
  profileReference.render(setup.instrumentProfileId);
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
    showCalculationStatus(setupRuntimeMessages.tensionCatalogLoading);
    const catalog = await readTensionCatalog({
      embeddedCatalog: globalThis.__TONELAB_TENSION_CATALOG__ || null,
      requestCatalog: () => fetch("./tension_catalog.json"),
      unavailableMessage: setupRuntimeMessages.tensionCatalogUnavailable,
    });
    applyLoadedTensionCatalog(catalog);
    render();
  } catch (_error) {
    showCalculationStatus(setupRuntimeMessages.tensionEstimateFallback);
    render();
  } finally {
    isTensionCatalogPending = false;
    pendingMechanicalFields.clear();
  }
}

function preserveRestoredMechanicalFields() {
  if (!restoredSession) return;
  setup.strings.forEach((_string, stringIndex) => {
    mechanicalFieldNames.forEach((field) => rememberPendingMechanicalField(stringIndex, field));
  });
}

function preservePendingMechanicalInput(input) {
  if (!isTensionCatalogPending || !mechanicalFieldNames.includes(input.dataset.stringField)) return;
  rememberPendingMechanicalField(Number(input.dataset.stringIndex), input.dataset.stringField);
}

function rememberPendingMechanicalField(stringIndex, field) {
  pendingMechanicalFields.set(`${stringIndex}:${field}`, { stringIndex, field });
}

function forgetPendingMechanicalLookup(input) {
  if (input.id === "tension_data_source") return pendingMechanicalFields.clear();
  mechanicalFieldNames.forEach((field) => pendingMechanicalFields.delete(`${input.dataset.stringIndex}:${field}`));
}

function applyLoadedTensionCatalog(catalog) {
  const preservedInputs = [...pendingMechanicalFields.values()].map(readPendingMechanicalInput);
  setup = applyTensionCatalogToSetup(setup, catalog, tensionSourceOptions[setupForm.tensionSourceIdForSetup()]);
  preservedInputs.forEach(restorePendingMechanicalValue);
  setupForm.writeMechanicalPropertiesToStringCards();
  preservedInputs.forEach(({ input, draft }) => { input.value = draft; });
}

function readPendingMechanicalInput({ stringIndex, field }) {
  const input = form.querySelector(`[data-string-index="${stringIndex}"][data-string-field="${field}"]`);
  const string = setup.strings[stringIndex];
  return { stringIndex, field, value: string[field], tensionSource: string.tensionSource, input, draft: input.value };
}

function restorePendingMechanicalValue({ stringIndex, field, value, tensionSource }) {
  const string = setup.strings[stringIndex];
  string[field] = value;
  if (field === "unitMassKgPerMeter") restorePendingMassSource(string, tensionSource);
}

function restorePendingMassSource(string, tensionSource) {
  if (tensionSource === undefined) delete string.tensionSource;
  else string.tensionSource = tensionSource;
}
