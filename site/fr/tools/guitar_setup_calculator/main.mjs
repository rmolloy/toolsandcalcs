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
  axialStiffnessLabel: "Rigidité axiale (N)",
  buildLabel: "Construction",
  calculationData: "Données de calcul",
  calculationComplete: "Calculé à partir des saisies actuelles",
  calculationPaused: "Calcul interrompu jusqu’à la correction du champ en surbrillance.",
  choosePhysicalString: "Choisissez une corde physique",
  clearanceMustBeNonNegative: "Le jeu doit être supérieur ou égal à zéro",
  courseLabel: "Chœur {courseNumber}",
  courseStringLabel: "C{courseNumber} · {stringName}",
  courseStringLegend: "Chœur {courseNumber} · {stringName}",
  customProfileLabel: "Personnalisé",
  diagramMessages: Object.freeze({
    actionAtFret12Heading: "ACTION À LA 12E FRETTE · CAPODASTRE 1",
    courseAbbreviation: "C",
    description: "Vue de dessus à échelle interrompue de {stringCount} cordes, avec la compensation calculée au sillet de tête et au sillet de chevalet pour chaque corde physique. Les longueurs de corde inégales s’éventent autour de la frette {neutralFret}.",
    first: "première",
    fretOne: "FRETTE 1",
    fretTwelve: "FRETTE 12",
    fretTwelveToSaddle: "12E FRETTE → SILLET DE CHEVALET",
    last: "dernière",
    mobileNutLabel: "Compensation calculée au sillet de tête et géométrie à la première frette",
    mobileSaddleLabel: "Compensation calculée au sillet de chevalet et géométrie à la douzième frette",
    nut: "SILLET DE TÊTE",
    nutActionHeading: "ACTION AU SILLET DE TÊTE · FRETTE 1 · À VIDE",
    nutDirection: "+ vers la frette 1 →",
    nutInsertLabel: "sillet de tête de 5 millimètres",
    nutToFretOne: "SILLET DE TÊTE → FRETTE 1",
    saddle: "SILLET DE CHEVALET",
    saddleDirection: "+ allonger →",
    saddleInsertLabel: "sillet de chevalet de 6 millimètres",
    scaleContinues: "le diapason continue",
    scalePerString: "{range} · frette neutre {neutralFret}",
    scaleSingle: "diapason de {length}",
    title: "Géométrie calculée des sillets de tête et de chevalet",
  }),
  estimatedCoreLabel: "Âme estimée",
  firstNamedStringLabel: "Première · {stringName} ({unit})",
  fretRange: "La frette doit être un nombre entier compris entre 0 et {fretCount}",
  fretLabel: "Frette",
  gaugeEstimate: "Estimation selon le tirant",
  lastNamedStringLabel: "Dernière · {stringName} ({unit})",
  manufacturer: "Fabricant",
  midiNoteLabel: "Note MIDI",
  nameLabel: "Nom",
  noAdditionalReadings: "Aucune mesure supplémentaire.",
  oneStringLabel: "1 corde",
  plainConstructionLabel: "Non filée",
  woundConstructionLabel: "Filée",
  profileDefault: "Valeur par défaut du profil",
  profileLabels: Object.freeze({
    classical: "Guitare classique",
    electric: "Guitare électrique",
    four_string_bass: "Basse 4 cordes",
    mandolin: "Mandoline",
    steel_string: "Guitare à cordes acier",
    tenor_ukulele: "Ukulélé ténor",
    twelve_string: "Guitare 12 cordes",
  }),
  profileStringNames: Object.freeze({
    highE: "Mi aigu",
    lowE: "Mi grave",
  }),
  provenanceMessages: Object.freeze({
    calculatedFromMeasurements: "Calculé à partir de votre réglage mesuré.",
    measuredAtFrets: "Mesuré aux frettes",
    mixedInputs: "L’aperçu combine {userMeasurementCount} groupes de mesures saisies avec {profileDefaultCount} valeurs par défaut du profil.",
    previewFromDefaults: "Aperçu établi à partir des valeurs par défaut du profil. Saisissez vos mesures avant d’utiliser le tracé de compensation.",
    profileDefault: "Valeur par défaut du profil",
    userEntry: "Saisie de l’utilisateur",
  }),
  reliefMustNotBeNegative: "reliefMm ne doit pas être négatif",
  removeReadingLabel: "Supprimer la mesure de {stringName} à la frette {fretNumber}",
  removeReadingTitle: "Supprimer la mesure",
  resultMessages: Object.freeze({
    actionContext: "capodastre 1, frette 12",
    courseLabel: "Chœur {courseNumber}",
    gaugeEstimate: "Estimation selon le tirant",
    nutAction: "Action au sillet de tête",
    nutActionContext: "à vide, frette 1",
    nutCompensation: "Comp. sillet de tête",
    oneString: "1 corde",
    openAtFret12: "À vide à la 12e",
    peakError: "Erreur maximale",
    reliefAtFret: "{relief} à la frette {fretNumber}",
    reliefOff: "Désactivée",
    saddleCompensation: "Comp. sillet de chevalet",
    twoStrings: "2 cordes",
  }),
  stringGaugeLabel: "Tirant ({unit})",
  stringLengthLabel: "Longueur ({unit})",
  stockSpecMessages: Object.freeze({
    actionAtFret12: "Action à la 12e frette",
    actionAtNut: "Action au sillet de tête",
    draft: "Brouillon — à confirmer",
    families: {
      classical: {
        label: "Classique",
        note: "L’angle de rupture au chevalet à cordes nouées compte autant que la hauteur.",
        nutActionText: "plus haute — à régler au toucher",
        reliefText: "plat — généralement sans truss rod",
      },
      electric: {
        label: "Électrique",
        note: "Équilibrez le vibrato avant de régler l’action.",
      },
      four_string_bass: {
        label: "Basse",
        note: "Diapason plus long — la courbure se mesure plus loin sur le manche.",
      },
      steel_string: {
        label: "Cordes acier",
        note: "Pour le bottleneck ou une attaque forte, retenez la valeur haute.",
      },
    },
    relief: "Courbure du manche",
    selected: "Sélectionné",
  }),
  tensionCatalogLoading: "Chargement du catalogue de tensions du fabricant...",
  tensionCatalogUnavailable: "Le catalogue de tensions du fabricant est indisponible",
  tensionEstimateFallback: "Utilisation d’estimations fondées sur le tirant : catalogue du fabricant indisponible",
  twoStringsLabel: "2 cordes",
  unitMassLabel: "Masse linéique (kg/m)",
  userEntry: "Saisie de l’utilisateur",
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
