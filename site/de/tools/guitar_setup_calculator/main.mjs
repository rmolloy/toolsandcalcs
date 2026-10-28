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
} from "./setup_model.mjs?rev=093b6a20873d";
import { renderSetupDiagram } from "./setup_diagram.mjs?rev=093b6a20873d";
import { createLengthUnitController } from "./length_unit_controller.mjs?rev=093b6a20873d";
import { createSparseActionEditor } from "./sparse_action_editor.mjs?rev=093b6a20873d";
import { createSetupResultPresenter } from "./setup_result_presenter.mjs?rev=093b6a20873d";
import { createSetupPitchErrorChart } from "./setup_pitch_error_chart.mjs?rev=093b6a20873d";
import { createSetupProfileEditor } from "./setup_profile_editor.mjs?rev=093b6a20873d";
import "../common/per_tab_tool_session.js?rev=093b6a20873d";
import { createSetupSessionPersistence } from "./setup_session_persistence.mjs?rev=093b6a20873d";
import { readSetupSessionView, restoreSetupSessionView } from "./setup_session_view.mjs?rev=093b6a20873d";
import { createScaleLengthEditor } from "./scale_length_editor.mjs?rev=093b6a20873d";
import { createSetupFormController } from "./setup_form_controller.mjs?rev=093b6a20873d";
import { createSetupStepNavigation } from "./setup_step_navigation.mjs?rev=093b6a20873d";
import { createSetupProfileReference } from "./setup_profile_reference.mjs?rev=093b6a20873d";
import { createSetupProfileSelection } from "./setup_profile_selection.mjs?rev=093b6a20873d";
import { readTensionCatalog } from "./tension_catalog_loader.mjs?rev=093b6a20873d";
import {
  describeActionProvenance,
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs?rev=093b6a20873d";

// localized-runtime-messages:start
const setupRuntimeMessages = Object.freeze({
  axialStiffnessLabel: "Axialsteifigkeit (N)",
  buildLabel: "Aufbau",
  calculationData: "Berechnungsdaten",
  calculationComplete: "Aus den aktuellen Eingaben berechnet",
  calculationPaused: "Die Berechnung ist angehalten, bis die markierte Eingabe korrigiert wurde.",
  choosePhysicalString: "Physische Saite auswählen",
  clearanceMustBeNonNegative: "Der Abstand muss null oder größer sein",
  courseLabel: "Saitenchor {courseNumber}",
  courseStringLabel: "C{courseNumber} · {stringName}",
  courseStringLegend: "Saitenchor {courseNumber} · {stringName}",
  customProfileLabel: "Eigene Angaben",
  diagramMessages: Object.freeze({
    actionAtFret12Heading: "SAITENLAGE AM 12. BUND · KAPO 1",
    courseAbbreviation: "C",
    description: "Eine unterbrochene Draufsicht der Mensur mit {stringCount} Saiten und berechneter Sattel- und Stegkompensation für jede physische Saite. Ungleiche Saitenlängen fächern sich um Bund {neutralFret} auf.",
    first: "erste",
    fretOne: "1. BUND",
    fretTwelve: "12. BUND",
    fretTwelveToSaddle: "12. BUND → STEGEINLAGE",
    last: "letzte",
    mobileNutLabel: "Berechnete Sattelkompensation und Geometrie am ersten Bund",
    mobileSaddleLabel: "Berechnete Stegkompensation und Geometrie am zwölften Bund",
    nut: "SATTEL",
    nutActionHeading: "SAITENLAGE AM SATTEL · 1. BUND · OFFEN",
    nutDirection: "+ zum 1. Bund →",
    nutInsertLabel: "5-Millimeter-Sattelrohling",
    nutToFretOne: "SATTEL → 1. BUND",
    saddle: "STEGEINLAGE",
    saddleDirection: "+ verlängern →",
    saddleInsertLabel: "6-Millimeter-Stegeinlage",
    scaleContinues: "Mensur setzt sich fort",
    scalePerString: "{range} · neutraler Bund {neutralFret}",
    scaleSingle: "Mensur {length}",
    title: "Berechnete Sattel- und Steggeometrie",
  }),
  estimatedCoreLabel: "Geschätzter Kern",
  firstNamedStringLabel: "Erste · {stringName} ({unit})",
  fretRange: "Der Bund muss eine ganze Zahl von 0 bis {fretCount} sein",
  fretLabel: "Bund",
  gaugeEstimate: "Schätzung nach Saitenstärke",
  lastNamedStringLabel: "Letzte · {stringName} ({unit})",
  manufacturer: "Hersteller",
  midiNoteLabel: "MIDI-Note",
  nameLabel: "Name",
  noAdditionalReadings: "Keine zusätzlichen Messwerte.",
  oneStringLabel: "1 Saite",
  plainConstructionLabel: "Blank",
  pitchErrorMessages: Object.freeze({
    download: "Diagramm als PNG herunterladen",
    zoom: "Zoomen",
    pan: "Verschieben",
    boxSelect: "Rechteckauswahl",
    lassoSelect: "Lassoauswahl",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    autoscale: "Automatisch skalieren",
    resetAxes: "Achsen zurücksetzen",
    settings: "Diagrammeinstellungen",
    invalidRange: "Das Minimum muss kleiner als das Maximum sein.",
    cents: "Cent",
    courseStringLabel: "C{courseNumber} · {stringName}",
    flat: "Zu tief",
    fret: "Bund",
    nutAndSaddle: "Sattel + Stegeinlage",
    openReference: "Leersaite · auf 0 Cent nachgestimmt",
    saddleOnly: "Nur Stegeinlage",
    scope: "Beide Anpassungen verwenden die Bünde 1–{lastFret}. Die Leersaite wird auf 0 Cent nachgestimmt.",
    sharp: "Zu hoch",
    unavailable: "Diagramm nicht verfügbar; die berechneten Ergebnisse bleiben verfügbar.",
  }),
  woundConstructionLabel: "Umsponnen",
  profileDefault: "Profilstandard",
  profileLabels: Object.freeze({
    classical: "Konzertgitarre",
    electric: "E-Gitarre",
    four_string_bass: "4-saitiger Bass",
    mandolin: "Mandoline",
    steel_string: "Westerngitarre",
    tenor_ukulele: "Tenor-Ukulele",
    twelve_string: "12-saitige Gitarre",
  }),
  profileStringNames: Object.freeze({
    highE: "Hohe E-Saite",
    lowE: "Tiefe E-Saite",
  }),
  provenanceMessages: Object.freeze({
    calculatedFromMeasurements: "Aus Ihrem gemessenen Setup berechnet.",
    measuredAtFrets: "Gemessen an den Bünden",
    mixedInputs: "Die Vorschau kombiniert {userMeasurementCount} Gruppen eigener Messwerte mit {profileDefaultCount} Profilstandardwerten.",
    previewFromDefaults: "Vorschau mit den Standardwerten des Profils. Geben Sie Ihre Messwerte ein, bevor Sie das Kompensationsmuster verwenden.",
    profileDefault: "Profilstandard",
    userEntry: "Eigene Eingabe",
  }),
  reliefMustNotBeNegative: "reliefMm darf nicht negativ sein",
  removeReadingLabel: "Messwert für {stringName} an Bund {fretNumber} entfernen",
  removeReadingTitle: "Messwert entfernen",
  resultMessages: Object.freeze({
    actionContext: "Kapo 1, Bund 12",
    courseLabel: "Saitenchor {courseNumber}",
    gaugeEstimate: "Schätzung nach Saitenstärke",
    nutAction: "Sattelhöhe",
    nutActionContext: "offen, Bund 1",
    nutCompensation: "Sattelkomp.",
    oneString: "1 Saite",
    openAtFret12: "Offen am 12.",
    peakError: "Größter Fehler",
    reliefAtFret: "{relief} an Bund {fretNumber}",
    reliefOff: "Aus",
    saddleCompensation: "Stegkomp.",
    twoStrings: "2 Saiten",
  }),
  stringGaugeLabel: "Stärke ({unit})",
  stringLengthLabel: "Länge ({unit})",
  stockSpecMessages: Object.freeze({
    actionAtFret12: "Saitenlage am 12. Bund",
    actionAtNut: "Saitenlage am Sattel",
    draft: "Entwurf – prüfen",
    families: {
      classical: {
        label: "Konzertgitarre",
        note: "Der Saitenwinkel am Knüpfsteg ist ebenso wichtig wie die Höhe.",
        nutActionText: "höher – nach Spielgefühl einstellen",
        reliefText: "gerade – meist ohne Halsstab",
      },
      electric: {
        label: "E-Gitarre",
        note: "Das Tremolo ausbalancieren, bevor die Saitenlage eingestellt wird.",
      },
      four_string_bass: {
        label: "Bass",
        note: "Längere Mensur – die Halskrümmung wird weiter oben am Hals gemessen.",
      },
      steel_string: {
        label: "Westerngitarre",
        note: "Für Slide oder kräftigen Anschlag den höheren Wert verwenden.",
      },
    },
    relief: "Halskrümmung",
    selected: "Ausgewählt",
  }),
  tensionCatalogLoading: "Zugkraftkatalog des Herstellers wird geladen ...",
  tensionCatalogUnavailable: "Der Zugkraftkatalog des Herstellers ist nicht verfügbar",
  tensionEstimateFallback: "Stärkenschätzungen werden verwendet: Herstellerkatalog nicht verfügbar",
  twoStringsLabel: "2 Saiten",
  unitMassLabel: "Lineare Masse (kg/m)",
  userEntry: "Eigene Eingabe",
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
