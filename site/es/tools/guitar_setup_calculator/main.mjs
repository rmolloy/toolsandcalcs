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
  axialStiffnessLabel: "Rigidez axial (N)",
  buildLabel: "Construcción",
  calculationData: "Datos del cálculo",
  calculationComplete: "Calculado a partir de los valores actuales",
  calculationPaused: "El cálculo está en pausa hasta que se corrija el valor resaltado.",
  choosePhysicalString: "Elige una cuerda física",
  clearanceMustBeNonNegative: "La altura debe ser igual o mayor que cero",
  courseLabel: "Orden {courseNumber}",
  courseStringLabel: "O{courseNumber} · {stringName}",
  courseStringLegend: "Orden {courseNumber} · {stringName}",
  customProfileLabel: "Personalizado",
  diagramMessages: Object.freeze({
    actionAtFret12Heading: "ACCIÓN EN EL TRASTE 12 · CEJILLA EN 1",
    courseAbbreviation: "O",
    description: "Vista superior de escala interrumpida con {stringCount} cuerdas y la compensación calculada de cejuela y selleta para cada cuerda física. Las longitudes desiguales de cuerda se abren en abanico alrededor del traste {neutralFret}.",
    first: "primera",
    fretOne: "TRASTE 1",
    fretTwelve: "TRASTE 12",
    fretTwelveToSaddle: "TRASTE 12 → SELLETA",
    last: "última",
    mobileNutLabel: "Compensación calculada de la cejuela y geometría del primer traste",
    mobileSaddleLabel: "Compensación calculada de la selleta y geometría del traste doce",
    nut: "CEJUELA",
    nutActionHeading: "ACCIÓN EN LA CEJUELA · TRASTE 1 · AL AIRE",
    nutDirection: "+ hacia el traste 1 →",
    nutInsertLabel: "Pieza de cejuela de 5 milímetros",
    nutToFretOne: "CEJUELA → TRASTE 1",
    saddle: "SELLETA",
    saddleDirection: "+ alargar →",
    saddleInsertLabel: "Pieza de selleta de 6 milímetros",
    scaleContinues: "la escala continúa",
    scalePerString: "{range} · traste neutro {neutralFret}",
    scaleSingle: "escala de {length}",
    title: "Geometría calculada de cejuela y selleta",
  }),
  estimatedCoreLabel: "Núcleo estimado",
  firstNamedStringLabel: "Primera · {stringName} ({unit})",
  fretRange: "El traste debe ser un número entero entre 0 y {fretCount}",
  fretLabel: "Traste",
  gaugeEstimate: "Estimación por calibre",
  lastNamedStringLabel: "Última · {stringName} ({unit})",
  manufacturer: "Fabricante",
  midiNoteLabel: "Nota MIDI",
  nameLabel: "Nombre",
  noAdditionalReadings: "No hay mediciones adicionales.",
  oneStringLabel: "1 cuerda",
  plainConstructionLabel: "Lisa",
  woundConstructionLabel: "Entorchada",
  profileDefault: "Valor predeterminado del perfil",
  profileLabels: Object.freeze({
    classical: "Guitarra clásica",
    electric: "Guitarra eléctrica",
    four_string_bass: "Bajo de 4 cuerdas",
    mandolin: "Mandolina",
    steel_string: "Guitarra de cuerdas de acero",
    tenor_ukulele: "Ukelele tenor",
    twelve_string: "Guitarra de 12 cuerdas",
  }),
  profileStringNames: Object.freeze({
    highE: "Mi agudo",
    lowE: "Mi grave",
  }),
  provenanceMessages: Object.freeze({
    calculatedFromMeasurements: "Calculado a partir del ajuste que has medido.",
    measuredAtFrets: "Medida en los trastes",
    mixedInputs: "La vista previa combina {userMeasurementCount} grupos de datos introducidos con {profileDefaultCount} valores predeterminados del perfil.",
    previewFromDefaults: "Vista previa basada en los valores predeterminados del perfil. Introduce tus mediciones antes de usar el patrón de compensación.",
    profileDefault: "Valor predeterminado del perfil",
    userEntry: "Dato introducido",
  }),
  reliefMustNotBeNegative: "reliefMm no puede ser negativo",
  removeReadingLabel: "Eliminar la medición de {stringName} en el traste {fretNumber}",
  removeReadingTitle: "Eliminar medición",
  resultMessages: Object.freeze({
    actionContext: "cejilla en 1, traste 12",
    courseLabel: "Orden {courseNumber}",
    gaugeEstimate: "Estimación por calibre",
    nutAction: "Acción en la cejuela",
    nutActionContext: "al aire, traste 1",
    nutCompensation: "Comp. cejuela",
    oneString: "1 cuerda",
    openAtFret12: "Al aire en 12",
    peakError: "Error máximo",
    reliefAtFret: "{relief} en el traste {fretNumber}",
    reliefOff: "Desactivada",
    saddleCompensation: "Comp. selleta",
    twoStrings: "2 cuerdas",
  }),
  stringGaugeLabel: "Calibre ({unit})",
  stringLengthLabel: "Longitud ({unit})",
  stockSpecMessages: Object.freeze({
    actionAtFret12: "Acción en el traste 12",
    actionAtNut: "Acción en la cejuela",
    draft: "Borrador; confirmar",
    families: {
      classical: {
        label: "Clásica",
        note: "El ángulo de quiebre en el bloque de amarre importa tanto como la altura.",
        nutActionText: "más alta; ajustar al tacto",
        reliefText: "plano; normalmente sin alma",
      },
      electric: {
        label: "Eléctrica",
        note: "Equilibra el trémolo antes de ajustar la acción.",
      },
      four_string_bass: {
        label: "Bajo",
        note: "La escala más larga desplaza la medición de la curvatura hacia la parte alta del mástil.",
      },
      steel_string: {
        label: "Cuerdas de acero",
        note: "Para slide o ataque fuerte, usa el extremo alto del intervalo.",
      },
    },
    relief: "Curvatura",
    selected: "Seleccionado",
  }),
  tensionCatalogLoading: "Cargando el catálogo de tensión del fabricante...",
  tensionCatalogUnavailable: "El catálogo de tensión del fabricante no está disponible",
  tensionEstimateFallback: "Se usan estimaciones por calibre: el catálogo del fabricante no está disponible",
  twoStringsLabel: "2 cuerdas",
  unitMassLabel: "Masa lineal (kg/m)",
  userEntry: "Dato introducido",
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
