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

let setup = localizeProfileStringNames(
  createDefaultSetup(),
  setupRuntimeMessages.profileStringNames,
);
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
const setupModeMessages = new Map(
  setupModeButtons.map((button) => [
    button.dataset.setupModeButton,
    button.textContent.trim(),
  ]),
);
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
  messages: setupRuntimeMessages.resultMessages,
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
  onError: (error) => { resultStatus.textContent = readSetupErrorMessage(error); },
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
  tensionSourceLabels,
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
    if (calculationError) showInputError(input, readSetupErrorMessage(calculationError));
  } catch (error) {
    const message = readSetupErrorMessage(error);
    showInputError(input, message);
    resultStatus.textContent = message;
  }
  setupForm.updateRadiusFields();
}

function render() {
  try {
    const result = calculateSetup(setup);
    setupGeometrySvg.innerHTML = renderSetupDiagram({
      setup,
      result,
      lengthUnit: lengthUnits.unit,
      messages: setupRuntimeMessages.diagramMessages,
    });
    resultPresenter.render({ setup, result });
    renderMeasurementProvenance();
    calculationBasis.textContent = describeCalculationBasis(
      userEntryGroups,
      setupRuntimeMessages.provenanceMessages,
    );
    resultStatus.textContent = setupRuntimeMessages.calculationComplete;
    hasRenderedResult = true;
    return null;
  } catch (error) {
    if (!hasRenderedResult) clearCalculatedOutput();
    calculationBasis.textContent = setupRuntimeMessages.calculationPaused;
    resultStatus.textContent = readSetupErrorMessage(error);
    return error;
  }
}

function readSetupErrorMessage(error) {
  return setupErrorMessages.get(error.message) ?? error.message;
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

function continueToRadius() {
  form.querySelector('[aria-labelledby="step-length-title"]').open = false;
  const radiusStep = document.getElementById("radius_step");
  radiusStep.open = true;
  radiusStep.querySelector("summary").focus();
}

function selectInstrumentProfile(profileId) {
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
  setupForm.writeSetupToForm();
  stockSpecs.render(setup.instrumentProfileId);
  render();
}

function localizeProfileStringNames(candidateSetup, stringNames) {
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
    resultStatus.textContent = setupRuntimeMessages.tensionCatalogLoading;
    const catalog = await readTensionCatalog({
      embeddedCatalog: globalThis.__TONELAB_TENSION_CATALOG__ || null,
      requestCatalog: () => fetch("./tension_catalog.json"),
      unavailableMessage: setupRuntimeMessages.tensionCatalogUnavailable,
    });
    setup = applyTensionCatalogToSetup(
      setup,
      catalog,
      tensionSourceOptions[setupForm.tensionSourceIdForSetup()],
    );
    profileEditor.renderStringInputs();
    setupForm.writeSetupToForm();
    render();
  } catch (_error) {
    resultStatus.textContent = setupRuntimeMessages.tensionEstimateFallback;
    render();
  }
}
