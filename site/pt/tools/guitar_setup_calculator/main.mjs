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
  buildLabel: "Construção",
  calculationData: "Dados do cálculo",
  calculationComplete: "Calculado a partir das entradas atuais",
  calculationPaused: "Cálculo pausado até que a entrada destacada seja corrigida.",
  choosePhysicalString: "Escolha uma corda física",
  clearanceMustBeNonNegative: "A folga deve ser igual ou maior que zero",
  courseLabel: "Ordem {courseNumber}",
  courseStringLabel: "O{courseNumber} · {stringName}",
  courseStringLegend: "Ordem {courseNumber} · {stringName}",
  customProfileLabel: "Personalizado",
  diagramMessages: Object.freeze({
    actionAtFret12Heading: "AÇÃO NO 12.º TRASTE · CAPOTRASTE 1",
    courseAbbreviation: "O",
    description: "Vista superior com escala interrompida de {stringCount} cordas, com a compensação calculada na pestana e no rastilho para cada corda física. Comprimentos de corda diferentes abrem em leque ao redor do traste {neutralFret}.",
    first: "primeira",
    fretOne: "TRASTE 1",
    fretTwelve: "TRASTE 12",
    fretTwelveToSaddle: "12.º TRASTE → RASTILHO",
    last: "última",
    mobileNutLabel: "Compensação calculada da pestana e geometria do primeiro traste",
    mobileSaddleLabel: "Compensação calculada do rastilho e geometria do décimo segundo traste",
    nut: "PESTANA",
    nutActionHeading: "AÇÃO NA PESTANA NO TRASTE 1 · CORDA SOLTA",
    nutDirection: "+ em direção ao traste 1 →",
    nutInsertLabel: "Pestana de 5 milímetros",
    nutToFretOne: "PESTANA → TRASTE 1",
    saddle: "RASTILHO",
    saddleDirection: "+ alongar →",
    saddleInsertLabel: "Rastilho de 6 milímetros",
    scaleContinues: "a escala continua",
    scalePerString: "{range} · traste neutro {neutralFret}",
    scaleSingle: "escala de {length}",
    title: "Geometria calculada da pestana e do rastilho",
  }),
  estimatedCoreLabel: "Núcleo estimado",
  firstNamedStringLabel: "Primeira · {stringName} ({unit})",
  fretRange: "O traste deve ser um número inteiro de 0 a {fretCount}",
  fretLabel: "Traste",
  gaugeEstimate: "Estimativa pelo calibre",
  lastNamedStringLabel: "Última · {stringName} ({unit})",
  manufacturer: "Fabricante",
  midiNoteLabel: "Nota MIDI",
  nameLabel: "Nome",
  noAdditionalReadings: "Nenhuma medição adicional.",
  oneStringLabel: "1 corda",
  plainConstructionLabel: "Lisa",
  woundConstructionLabel: "Enrolada",
  profileDefault: "Padrão do perfil",
  profileLabels: Object.freeze({
    classical: "Violão clássico",
    electric: "Guitarra elétrica",
    four_string_bass: "Baixo de 4 cordas",
    mandolin: "Bandolim",
    steel_string: "Violão de cordas de aço",
    tenor_ukulele: "Ukulele tenor",
    twelve_string: "Violão de 12 cordas",
  }),
  profileStringNames: Object.freeze({
    highE: "Mi agudo",
    lowE: "Mi grave",
  }),
  provenanceMessages: Object.freeze({
    calculatedFromMeasurements: "Calculado a partir da sua regulagem medida.",
    measuredAtFrets: "Medido nos trastes",
    mixedInputs: "A prévia combina {userMeasurementCount} grupos de entradas do usuário com {profileDefaultCount} padrões do perfil.",
    previewFromDefaults: "Prévia baseada nos padrões do perfil. Informe as suas medidas antes de usar o padrão de compensação.",
    profileDefault: "Padrão do perfil",
    userEntry: "Entrada do usuário",
  }),
  reliefMustNotBeNegative: "reliefMm não pode ser negativo",
  removeReadingLabel: "Remover medição de {stringName} no traste {fretNumber}",
  removeReadingTitle: "Remover medição",
  resultMessages: Object.freeze({
    actionContext: "capotraste 1, traste 12",
    courseLabel: "Ordem {courseNumber}",
    gaugeEstimate: "Estimativa pelo calibre",
    nutAction: "Ação na pestana",
    nutActionContext: "corda solta, traste 1",
    nutCompensation: "Comp. da pestana",
    oneString: "1 corda",
    openAtFret12: "Solta no 12",
    peakError: "Erro máximo",
    reliefAtFret: "{relief} no traste {fretNumber}",
    reliefOff: "Desativada",
    saddleCompensation: "Comp. do rastilho",
    twoStrings: "2 cordas",
  }),
  stringGaugeLabel: "Calibre ({unit})",
  stringLengthLabel: "Comprimento ({unit})",
  stockSpecMessages: Object.freeze({
    actionAtFret12: "Ação no 12.º traste",
    actionAtNut: "Ação na pestana",
    draft: "Rascunho — confirme",
    families: {
      classical: {
        label: "Clássico",
        note: "O ângulo de saída no cavalete importa tanto quanto a altura.",
        nutActionText: "mais alta — ajuste pela sensação",
        reliefText: "plano — geralmente sem tensor",
      },
      electric: {
        label: "Elétrica",
        note: "Equilibre o tremolo antes de ajustar a ação.",
      },
      four_string_bass: {
        label: "Baixo",
        note: "Escala mais longa — a curvatura é medida mais adiante no braço.",
      },
      steel_string: {
        label: "Cordas de aço",
        note: "Para slide ou ataque forte, use o limite mais alto.",
      },
    },
    relief: "Curvatura",
    selected: "Selecionado",
  }),
  tensionCatalogLoading: "Carregando catálogo de tensão do fabricante...",
  tensionCatalogUnavailable: "O catálogo de tensão do fabricante não está disponível",
  tensionEstimateFallback: "Usando estimativas por calibre: catálogo do fabricante indisponível",
  twoStringsLabel: "2 cordas",
  unitMassLabel: "Massa linear (kg/m)",
  userEntry: "Entrada do usuário",
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
