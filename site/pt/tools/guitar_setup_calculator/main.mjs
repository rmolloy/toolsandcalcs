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
  pitchErrorMessages: Object.freeze({
    download: "Baixar gráfico em PNG",
    zoom: "Zoom",
    pan: "Mover",
    boxSelect: "Seleção retangular",
    lassoSelect: "Seleção livre",
    zoomIn: "Ampliar",
    zoomOut: "Reduzir",
    autoscale: "Escala automática",
    resetAxes: "Redefinir eixos",
    settings: "Configurações do gráfico",
    invalidRange: "O mínimo deve ser menor que o máximo.",
    cents: "Cents",
    courseStringLabel: "O{courseNumber} · {stringName}",
    flat: "Mais grave",
    fret: "Traste",
    nutAndSaddle: "Pestana + rastilho",
    openReference: "Corda solta · reafinada a 0 cents",
    saddleOnly: "Só rastilho",
    scope: "Ambos os ajustes usam os trastes 1–{lastFret}. Corda solta reafinada a 0 cents.",
    sharp: "Mais agudo",
    unavailable: "Gráfico indisponível; os resultados calculados continuam disponíveis.",
  }),
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
