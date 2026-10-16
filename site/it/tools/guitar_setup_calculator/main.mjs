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
} from "./setup_model.mjs";
import { renderSetupDiagram } from "./setup_diagram.mjs";
import { createLengthUnitController } from "./length_unit_controller.mjs";
import { createSparseActionEditor } from "./sparse_action_editor.mjs";
import { createSetupResultPresenter } from "./setup_result_presenter.mjs";
import { createSetupPitchErrorChart } from "./setup_pitch_error_chart.mjs";
import { createSetupProfileEditor } from "./setup_profile_editor.mjs";
import "../common/per_tab_tool_session.js";
import { createSetupSessionPersistence } from "./setup_session_persistence.mjs";
import { readSetupSessionView, restoreSetupSessionView } from "./setup_session_view.mjs";
import { createScaleLengthEditor } from "./scale_length_editor.mjs";
import { createSetupFormController } from "./setup_form_controller.mjs";
import { createSetupStepNavigation } from "./setup_step_navigation.mjs";
import { createStockSpecs } from "./stock_specs.mjs";
import { readTensionCatalog } from "./tension_catalog_loader.mjs";
import {
  describeActionProvenance,
  describeCalculationBasis,
  provenanceGroupForInput,
} from "./setup_provenance.mjs";

// localized-runtime-messages:start
const setupRuntimeMessages = Object.freeze({
  axialStiffnessLabel: "Rigidezza assiale (N)",
  buildLabel: "Costruzione",
  calculationData: "Dati di calcolo",
  calculationComplete: "Calcolato dagli input correnti",
  calculationPaused: "Calcolo in pausa finché l’input evidenziato non viene corretto.",
  choosePhysicalString: "Scegli una corda fisica",
  clearanceMustBeNonNegative: "La distanza deve essere pari o superiore a zero",
  courseLabel: "Coro {courseNumber}",
  courseStringLabel: "C{courseNumber} · {stringName}",
  courseStringLegend: "Coro {courseNumber} · {stringName}",
  customProfileLabel: "Personalizzato",
  diagramMessages: Object.freeze({
    actionAtFret12Heading: "ACTION AL 12º TASTO · CAPOTASTO MOBILE 1",
    courseAbbreviation: "C",
    description: "Vista dall’alto a scala interrotta di {stringCount} corde, con la compensazione calcolata al capotasto e alla selletta per ogni corda fisica. Le corde di lunghezza diversa si aprono a ventaglio intorno al tasto {neutralFret}.",
    first: "prima",
    fretOne: "TASTO 1",
    fretTwelve: "TASTO 12",
    fretTwelveToSaddle: "12º TASTO → SELLETTA",
    last: "ultima",
    mobileNutLabel: "Compensazione calcolata del capotasto e geometria del primo tasto",
    mobileSaddleLabel: "Compensazione calcolata della selletta e geometria del dodicesimo tasto",
    nut: "CAPOTASTO",
    nutActionHeading: "ACTION AL CAPOTASTO AL TASTO 1 · CORDA LIBERA",
    nutDirection: "+ verso il tasto 1 →",
    nutInsertLabel: "Capotasto da 5 millimetri",
    nutToFretOne: "CAPOTASTO → TASTO 1",
    saddle: "SELLETTA",
    saddleDirection: "+ allunga →",
    saddleInsertLabel: "Selletta da 6 millimetri",
    scaleContinues: "il diapason continua",
    scalePerString: "{range} · tasto neutro {neutralFret}",
    scaleSingle: "diapason {length}",
    title: "Geometria calcolata di capotasto e selletta",
  }),
  estimatedCoreLabel: "Anima stimata",
  firstNamedStringLabel: "Prima · {stringName} ({unit})",
  fretRange: "Il tasto deve essere un numero intero da 0 a {fretCount}",
  fretLabel: "Tasto",
  gaugeEstimate: "Stima dal calibro",
  lastNamedStringLabel: "Ultima · {stringName} ({unit})",
  manufacturer: "Produttore",
  midiNoteLabel: "Nota MIDI",
  nameLabel: "Nome",
  noAdditionalReadings: "Nessuna misura aggiuntiva.",
  oneStringLabel: "1 corda",
  plainConstructionLabel: "Liscia",
  pitchErrorMessages: Object.freeze({
    cents: "Cent",
    courseStringLabel: "C{courseNumber} · {stringName}",
    flat: "Calante",
    fret: "Tasto",
    nutAndSaddle: "Capotasto + traversino",
    openReference: "Corda a vuoto · riaccordata a 0 cent",
    saddleOnly: "Solo traversino",
    scope: "Entrambi gli adattamenti usano i tasti 1–{lastFret}. Corda a vuoto riaccordata a 0 cent.",
    sharp: "Crescente",
    unavailable: "Grafico non disponibile; i risultati calcolati restano disponibili.",
  }),
  woundConstructionLabel: "Avvolta",
  profileDefault: "Predefinito del profilo",
  profileLabels: Object.freeze({
    classical: "Chitarra classica",
    electric: "Chitarra elettrica",
    four_string_bass: "Basso a 4 corde",
    mandolin: "Mandolino",
    steel_string: "Chitarra acustica con corde d’acciaio",
    tenor_ukulele: "Ukulele tenore",
    twelve_string: "Chitarra a 12 corde",
  }),
  profileStringNames: Object.freeze({
    highE: "Mi acuto",
    lowE: "Mi basso",
  }),
  provenanceMessages: Object.freeze({
    calculatedFromMeasurements: "Calcolato dal setup misurato.",
    measuredAtFrets: "Misurato ai tasti",
    mixedInputs: "L’anteprima combina {userMeasurementCount} gruppi di input dell’utente con {profileDefaultCount} valori predefiniti del profilo.",
    previewFromDefaults: "Anteprima basata sui valori predefiniti del profilo. Inserisci le tue misure prima di usare lo schema di compensazione.",
    profileDefault: "Predefinito del profilo",
    userEntry: "Input dell’utente",
  }),
  reliefMustNotBeNegative: "reliefMm non può essere negativo",
  removeReadingLabel: "Rimuovi la misura di {stringName} al tasto {fretNumber}",
  removeReadingTitle: "Rimuovi misura",
  resultMessages: Object.freeze({
    actionContext: "capotasto mobile 1, tasto 12",
    courseLabel: "Coro {courseNumber}",
    gaugeEstimate: "Stima dal calibro",
    nutAction: "Action al capotasto",
    nutActionContext: "corda libera, tasto 1",
    nutCompensation: "Comp. capotasto",
    oneString: "1 corda",
    openAtFret12: "Libera al 12",
    peakError: "Errore massimo",
    reliefAtFret: "{relief} al tasto {fretNumber}",
    reliefOff: "Disattivata",
    saddleCompensation: "Comp. selletta",
    twoStrings: "2 corde",
  }),
  stringGaugeLabel: "Calibro ({unit})",
  stringLengthLabel: "Lunghezza ({unit})",
  stockSpecMessages: Object.freeze({
    actionAtFret12: "Action al 12º tasto",
    actionAtNut: "Action al capotasto",
    draft: "Bozza — da confermare",
    families: {
      classical: {
        label: "Classica",
        note: "L’angolo di uscita al ponticello conta quanto l’altezza.",
        nutActionText: "più alta — regolare a sensazione",
        reliefText: "piatta — di solito senza truss rod",
      },
      electric: {
        label: "Elettrica",
        note: "Bilancia il tremolo prima di regolare l’action.",
      },
      four_string_bass: {
        label: "Basso",
        note: "Diapason più lungo — la curvatura si misura più avanti sul manico.",
      },
      steel_string: {
        label: "Corde d’acciaio",
        note: "Per slide o tocco pesante, usa il limite superiore.",
      },
    },
    relief: "Curvatura",
    selected: "Selezionato",
  }),
  tensionCatalogLoading: "Caricamento del catalogo delle tensioni del produttore...",
  tensionCatalogUnavailable: "Il catalogo delle tensioni del produttore non è disponibile",
  tensionEstimateFallback: "Uso delle stime per calibro: catalogo del produttore non disponibile",
  twoStringsLabel: "2 corde",
  unitMassLabel: "Massa lineare (kg/m)",
  userEntry: "Input dell’utente",
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
const stockSpecs = createStockSpecs({
  document,
  lengthUnits,
  messages: setupRuntimeMessages.stockSpecMessages,
  onSelectProfile: (profileId) => selectInstrumentProfile(profileId),
  onMeasure: resumeSetupMeasurements,
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
stockSpecs.render(setup.instrumentProfileId);
render();
const stepNavigation = createSetupStepNavigation(document);
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

function resumeSetupMeasurements() {
  document.querySelector(".setup-reference-specs").open = false;
  const selector = scaleEditor.mode === "single" ? '#common_scale_length' : '[data-string-field="scaleLengthMm"]';
  document.querySelector(selector).focus();
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
  stockSpecs.render(setup.instrumentProfileId);
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
    selectInstrumentProfile(input.value);
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

function setActionProvenance() {
  const badge = document.getElementById("rail_action_source");
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
  stockSpecs.render(setup.instrumentProfileId);
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
