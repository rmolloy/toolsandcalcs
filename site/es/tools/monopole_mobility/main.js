/*
© 2025 Rick Molloy. All rights reserved.

This calculator implements the Gore-style monopole mobility jig workflow plus a dynamic mass-loading path.
Permission is granted to view and reference this source for educational purposes only.
Redistribution, modification, or commercial use requires written consent from the author.
*/

const g = 9.8;
const modes = {
  STATIC: "static",
  DYNAMIC: "dynamic",
};
let currentMode = modes.STATIC;

// localized-runtime-messages:start
const monopoleRuntimeMessages = Object.freeze({
  addedMassGreaterThanZero: "La masa añadida debe ser mayor que cero.",
  clipboardCopyFailed: "No se pudo copiar al portapapeles",
  copiedResultsToClipboard: "Resultados copiados al portapapeles",
  copyAddedMass: "Masa añadida (g): {value}",
  copyDeflection: "Flexión (mm): {value}",
  copyDynamicMode: "Dinámico (carga de masa)",
  copyEffectiveMass: "M_eff (g): {value}",
  copyLoadedFrequency: "f1 (Hz): {value}",
  copyMass: "Masa (kg): {value}",
  copyMobilityScore: "Puntuación de movilidad: {value}",
  copyMode: "Modo: {mode}",
  copyStaticMode: "Estático (útil de Gore)",
  copyStiffness: "K (N/m): {value}",
  copyUncoupledFrequency: "f_u (Hz): {value}",
  copyUnloadedFrequency: "f0 (Hz): {value}",
  deflectionHighWarning: "La flexión es alta. Reduce la masa de prueba para evitar sobrecargar la tapa.",
  deflectionSmallWarning: "La flexión es muy pequeña. Comprueba la lectura del comparador y la carga; puede estar fuera del intervalo normal del útil.",
  downloadJson: "Descargar JSON",
  dynamicAddedMassWarning: "La masa añadida está fuera del intervalo habitual de 2–80 g. Procura usar una carga pequeña y conocida en el puente.",
  dynamicFrequencyWarning: "f₀ está fuera de 90–240 Hz. Comprueba el pico monopolar sin carga.",
  dynamicMode: "Modo dinámico",
  frequencyShiftSmallWarning: "El cambio de frecuencia es muy pequeño. Asegura bien la masa añadida y comprueba que los picos sean claros.",
  invalidDenominator: "Las frecuencias producen un denominador no válido. Comprueba de nuevo f0 y f1.",
  invalidEffectiveMass: "Los datos producen una masa efectiva no válida. Comprueba los valores.",
  liveCustomInput: "En vivo: datos personalizados ({mode})",
  liveDefaultCalculation: "En vivo: cálculo predeterminado ({mode})",
  loadedCalculation: "Se cargó {name}",
  loadedFrequencyMustBeLower: "La frecuencia cargada f1 debe ser menor que la frecuencia sin carga f0.",
  locale: "es",
  mobilityHighWarning: "{mode}: una movilidad >40 sugiere una tapa muy flexible. Comprueba la masa y las lecturas.",
  mobilityLowWarning: "{mode}: una movilidad <15 sugiere una tapa muy rígida. Comprueba los datos y las unidades.",
  notebookEventRestored: "Se restauró el evento del cuaderno.",
  notebook: "Cuaderno",
  notebookSavingUnavailable: "Aquí no se puede guardar en el cuaderno. Descarga la exportación en su lugar.",
  notMonopoleSave: "Este archivo no es un guardado de Movilidad monopolar.",
  jsonPackageDownloaded: "Paquete JSON descargado",
  save: "Guardar",
  savedToNotebook: "Guardado en {notebookName}.",
  saveMonopoleMobility: "Guardar movilidad monopolar",
  monopoleMobility: "Movilidad monopolar",
  benchOm: "OM de banco",
  summaryAddedMass: "Masa añadida",
  summaryDeflection: "Flexión",
  summaryDynamicMassLoading: "Carga de masa dinámica",
  summaryEffectiveMass: "Masa efectiva",
  summaryFrequency: "Frecuencia",
  summaryLoadedFrequency: "Frecuencia cargada",
  summaryMethod: "Método",
  summaryMobilityScore: "Puntuación de movilidad",
  summaryStaticDeflection: "Flexión estática",
  summaryTestMass: "Masa de prueba",
  summaryTopStiffness: "Rigidez de la tapa K",
  summaryUnloadedFrequency: "Frecuencia sin carga",
  staticFrequencyWarning: "fₐ está fuera de 90–220 Hz. Comprueba el pico con la boca sellada.",
  staticMode: "Modo estático",
  testMassWarning: "La masa de prueba está fuera del intervalo habitual de 0.3–2.0 kg. Los útiles suelen usar 0.5–1.5 kg.",
  typeClassical: "Clásica",
  typeOther: "Otra",
  typeSteelString: "Cuerdas de acero",
  unableToLoadJsonPackage: "No se pudo cargar el paquete JSON",
  untitledSample: "Muestra sin título",
  waitingForCompleteInputs: "Esperando datos completos…",
});
// localized-runtime-messages:end

const defaults = {
  name: "Rick Molloy OM (10/25/2025)",
  type: "steel",
  static: {
    freq: 153,
    deflection: 0.18,
    mass: 1.02,
  },
  dynamic: {
    f0: 153,
    f1: 141,
    addedMass: 20,
  },
};

const typeLabels = {
  steel: monopoleRuntimeMessages.typeSteelString,
  classical: monopoleRuntimeMessages.typeClassical,
  other: monopoleRuntimeMessages.typeOther,
};

const getTypeLabel = (value) => typeLabels[value] || monopoleRuntimeMessages.typeOther;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function formatMonopoleMessage(template, values) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

const sliders = {
  freq: document.getElementById("freq"),
  deflection: document.getElementById("deflection"),
  mass: document.getElementById("mass"),
};

const fields = {
  freq: document.getElementById("freq_field"),
  deflection: document.getElementById("deflection_field"),
  mass: document.getElementById("mass_field"),
};

const dynamicSliders = {
  f0: document.getElementById("dyn_f0"),
  f1: document.getElementById("dyn_f1"),
  mass: document.getElementById("dyn_mass"),
};

const dynamicFields = {
  f0: document.getElementById("dyn_f0_field"),
  f1: document.getElementById("dyn_f1_field"),
  mass: document.getElementById("dyn_mass_field"),
};

const modeButtons = {
  static: document.getElementById("mode_static"),
  dynamic: document.getElementById("mode_dynamic"),
};

const modePanels = {
  static: document.getElementById("staticInputs"),
  dynamic: document.getElementById("dynamicInputs"),
};

const modeHints = {
  static: document.querySelector('[data-mode-note="static"]'),
  dynamic: document.querySelector('[data-mode-note="dynamic"]'),
};

const nameInput = document.getElementById("instrument_name");
const typeSelect = document.getElementById("instrument_type");

const instrumentDisplay = document.getElementById("instrument_display");
const identityControls = document.getElementById("monopole_identity_controls");

const outputs = {
  stiffness: document.getElementById("stiffness"),
  effMass: document.getElementById("effMass"),
  mobilityScore: document.getElementById("mobilityScore"),
  status: document.getElementById("status"),
  warnings: document.getElementById("warnings")
};

const buttons = {
  reset: document.getElementById("reset"),
  copy: document.getElementById("copy"),
  load: document.getElementById("load"),
  loadFile: document.getElementById("load_file"),
  save: document.getElementById("save"),
};

const saveRunner = readMonopoleSaveRunner();
const perTabSession = readMonopolePerTabSession();

const formatter = (options = {}) =>
  new Intl.NumberFormat(monopoleRuntimeMessages.locale, {
    maximumFractionDigits: options.max ?? 2,
    minimumFractionDigits: options.min ?? 0,
    notation: options.notation ?? "standard",
  });

const fmtMobility = formatter({ min: 1, max: 1 });

function updateInstrumentLabel() {
  const name = nameInput.value.trim() || monopoleRuntimeMessages.untitledSample;
  const typeLabel = getTypeLabel(typeSelect.value);
  instrumentDisplay.textContent = `${name} • ${typeLabel}`;
}

function computeStaticMobility(freq, deflection, mass) {
  const valid =
    Number.isFinite(freq) &&
    Number.isFinite(deflection) &&
    Number.isFinite(mass) &&
    freq > 0 &&
    deflection > 0 &&
    mass > 0;

  if (!valid) {
    return { ok: false, message: monopoleRuntimeMessages.waitingForCompleteInputs };
  }

  const defM = deflection / 1000;
  const stiffness = (mass * g) / defM;
  const meffKg = stiffness / Math.pow(2 * Math.PI * freq, 2);
  const mobilityScore = 1000 / Math.sqrt(stiffness * meffKg);

  return {
    ok: true,
    stiffness,
    meffKg,
    mobilityScore,
    warnings: getStaticWarnings({ freq, deflection, mass, mobilityScore }),
  };
}

function computeDynamicMobility(f0, f1, addedMassGrams) {
  const valid =
    Number.isFinite(f0) &&
    Number.isFinite(f1) &&
    Number.isFinite(addedMassGrams) &&
    f0 > 0 &&
    f1 > 0;

  if (!valid) {
    return { ok: false, message: monopoleRuntimeMessages.waitingForCompleteInputs };
  }

  if (addedMassGrams <= 0) {
    return { ok: false, message: monopoleRuntimeMessages.addedMassGreaterThanZero };
  }

  if (f1 >= f0) {
    return { ok: false, message: monopoleRuntimeMessages.loadedFrequencyMustBeLower };
  }

  const addedMassKg = addedMassGrams / 1000;
  const denom = Math.pow(f0, 2) - Math.pow(f1, 2);

  if (denom <= 0) {
    return { ok: false, message: monopoleRuntimeMessages.invalidDenominator };
  }

  const meffKg = (Math.pow(f1, 2) * addedMassKg) / denom;
  if (!Number.isFinite(meffKg) || meffKg <= 0) {
    return { ok: false, message: monopoleRuntimeMessages.invalidEffectiveMass };
  }

  const stiffness = Math.pow(2 * Math.PI * f0, 2) * meffKg;
  const mobilityScore = 1000 / Math.sqrt(stiffness * meffKg);

  return {
    ok: true,
    stiffness,
    meffKg,
    mobilityScore,
    warnings: getDynamicWarnings({ f0, f1, addedMass: addedMassGrams, mobilityScore }),
  };
}

function getStaticWarnings({ freq, deflection, mass, mobilityScore }) {
  const notes = [];
  if (freq < 90 || freq > 220) {
    notes.push(monopoleRuntimeMessages.staticFrequencyWarning);
  }
  if (deflection < 0.05) {
    notes.push(monopoleRuntimeMessages.deflectionSmallWarning);
  } else if (deflection > 0.5) {
    notes.push(monopoleRuntimeMessages.deflectionHighWarning);
  }
  if (mass < 0.3 || mass > 2.0) {
    notes.push(monopoleRuntimeMessages.testMassWarning);
  }
  appendMobilityNotes(mobilityScore, notes, monopoleRuntimeMessages.staticMode);
  return notes;
}

function getDynamicWarnings({ f0, f1, addedMass, mobilityScore }) {
  const notes = [];
  if (f0 < 90 || f0 > 240) {
    notes.push(monopoleRuntimeMessages.dynamicFrequencyWarning);
  }
  if (addedMass < 2 || addedMass > 80) {
    notes.push(monopoleRuntimeMessages.dynamicAddedMassWarning);
  }
  if (f0 - f1 < 2) {
    notes.push(monopoleRuntimeMessages.frequencyShiftSmallWarning);
  }
  appendMobilityNotes(mobilityScore, notes, monopoleRuntimeMessages.dynamicMode);
  return notes;
}

function appendMobilityNotes(mobilityScore, notes, contextLabel) {
  if (!Number.isFinite(mobilityScore)) {
    return;
  }
  if (mobilityScore < 15) {
    notes.push(formatMonopoleMessage(monopoleRuntimeMessages.mobilityLowWarning, { mode: contextLabel }));
  } else if (mobilityScore > 40) {
    notes.push(formatMonopoleMessage(monopoleRuntimeMessages.mobilityHighWarning, { mode: contextLabel }));
  }
}

function compute() {
  updateInstrumentLabel();

  const staticInputs = {
    freq: parseFloat(fields.freq.value),
    deflection: parseFloat(fields.deflection.value),
    mass: parseFloat(fields.mass.value),
  };

  const dynamicInputs = {
    f0: parseFloat(dynamicFields.f0.value),
    f1: parseFloat(dynamicFields.f1.value),
    addedMass: parseFloat(dynamicFields.mass.value),
  };

  const result =
    currentMode === modes.STATIC
      ? computeStaticMobility(staticInputs.freq, staticInputs.deflection, staticInputs.mass)
      : computeDynamicMobility(dynamicInputs.f0, dynamicInputs.f1, dynamicInputs.addedMass);

  if (!result.ok) {
    setOutputs("--");
    outputs.status.textContent = result.message || monopoleRuntimeMessages.waitingForCompleteInputs;
    return;
  }

  const meffG = result.meffKg * 1000;
  outputs.stiffness.textContent = formatter({ max: 0 }).format(result.stiffness);
  outputs.effMass.textContent = formatter({ min: 1, max: 1 }).format(meffG);
  outputs.mobilityScore.textContent = fmtMobility.format(result.mobilityScore);
  outputs.warnings.textContent = result.warnings.join(" ");

  const modeLabel = currentMode === modes.STATIC
    ? monopoleRuntimeMessages.staticMode
    : monopoleRuntimeMessages.dynamicMode;

  const defaultsMatch =
    currentMode === modes.STATIC
      ? matchesStaticDefaults(staticInputs)
      : matchesDynamicDefaults(dynamicInputs);

  if (defaultsMatch) {
    outputs.status.textContent = formatMonopoleMessage(
      monopoleRuntimeMessages.liveDefaultCalculation,
      { mode: modeLabel },
    );
  } else {
    outputs.status.textContent = formatMonopoleMessage(
      monopoleRuntimeMessages.liveCustomInput,
      { mode: modeLabel },
    );
  }

  buttons.copy.disabled = false;
  buttons.save.disabled = false;
  persistMonopolePerTabSession();
}

function readMonopolePerTabSession() {
  return window.PerTabToolSession?.perTabToolSessionCreate
    ? window.PerTabToolSession.perTabToolSessionCreate({ toolId: "monopole_mobility", version: 1 })
    : null;
}

function persistMonopolePerTabSession() {
  perTabSession?.write({
    name: nameInput.value,
    type: typeSelect.value,
    mode: currentMode,
    staticInputs: readMonopoleInputValues(fields),
    dynamicInputs: readMonopoleInputValues(dynamicFields),
  });
}

function readMonopoleInputValues(source) {
  return Object.fromEntries(Object.entries(source).map(([key, input]) => [key, input.value]));
}

function restoreMonopolePerTabSession() {
  const snapshot = perTabSession?.read();
  if (!snapshot) {
    return;
  }

  nameInput.value = String(snapshot.name || nameInput.value);
  typeSelect.value = String(snapshot.type || typeSelect.value);
  writeMonopoleInputValues(fields, snapshot.staticInputs);
  writeMonopoleInputValues(dynamicFields, snapshot.dynamicInputs);
  currentMode = snapshot.mode === modes.DYNAMIC ? modes.DYNAMIC : modes.STATIC;
}

function writeMonopoleInputValues(target, values) {
  Object.entries(values || {}).forEach(([key, value]) => {
    if (target[key]) {
      target[key].value = String(value ?? "");
    }
  });
}

function matchesStaticDefaults({ freq, deflection, mass }) {
  return (
    Math.abs(freq - defaults.static.freq) < 1e-9 &&
    Math.abs(deflection - defaults.static.deflection) < 1e-9 &&
    Math.abs(mass - defaults.static.mass) < 1e-9
  );
}

function matchesDynamicDefaults({ f0, f1, addedMass }) {
  return (
    Math.abs(f0 - defaults.dynamic.f0) < 1e-9 &&
    Math.abs(f1 - defaults.dynamic.f1) < 1e-9 &&
    Math.abs(addedMass - defaults.dynamic.addedMass) < 1e-9
  );
}

function setOutputs(value) {
  outputs.stiffness.textContent = value;
  outputs.effMass.textContent = value;
  outputs.mobilityScore.textContent = value;
  outputs.warnings.textContent = "";
  buttons.copy.disabled = true;
  buttons.save.disabled = true;
}

function applyStaticDefaults() {
  sliders.freq.value = defaults.static.freq;
  sliders.deflection.value = defaults.static.deflection;
  sliders.mass.value = defaults.static.mass;
  fields.freq.value = defaults.static.freq;
  fields.deflection.value = defaults.static.deflection;
  fields.mass.value = defaults.static.mass;
}

function applyDynamicDefaults() {
  dynamicSliders.f0.value = defaults.dynamic.f0;
  dynamicSliders.f1.value = defaults.dynamic.f1;
  dynamicSliders.mass.value = defaults.dynamic.addedMass;
  dynamicFields.f0.value = defaults.dynamic.f0;
  dynamicFields.f1.value = defaults.dynamic.f1;
  dynamicFields.mass.value = defaults.dynamic.addedMass;
}

function resetInputs() {
  perTabSession?.clear();
  nameInput.value = defaults.name;
  typeSelect.value = defaults.type;
  applyStaticDefaults();
  applyDynamicDefaults();
  updateInstrumentLabel();
  compute();
}

function copyResults() {
  const payload = buildCopyResultLines();

  navigator.clipboard
    .writeText(payload.join("\n"))
    .then(() => {
      outputs.status.textContent = monopoleRuntimeMessages.copiedResultsToClipboard;
      setTimeout(compute, 1500);
    })
    .catch(() => {
      outputs.status.textContent = monopoleRuntimeMessages.clipboardCopyFailed;
    });
}

async function saveResults() {
  const saved = await saveRunner.runMonopoleSaveAction({
    readSnapshot: readCurrentMonopoleSaveSnapshot,
    readSummary: readCurrentMonopoleSaveSummary,
    setStatus(text) {
      outputs.status.textContent = text;
    },
  });
  if (saved) {
    setTimeout(compute, 1500);
  }
}

async function loadResults() {
  const file = buttons.loadFile?.files?.[0];

  if (!file) {
    return;
  }

  try {
    const saveApi = window.MonopoleSaveSurface;
    const snapshot = await saveApi.readMonopoleSavePackageFile(file, monopoleRuntimeMessages);
    applyLoadedMonopoleSnapshot(snapshot);
    outputs.status.textContent = formatMonopoleMessage(
      monopoleRuntimeMessages.loadedCalculation,
      { name: snapshot.name },
    );
  } catch (_error) {
    outputs.status.textContent = monopoleRuntimeMessages.unableToLoadJsonPackage;
  } finally {
    buttons.loadFile.value = "";
  }
}

function buildCopyResultLines() {
  const snapshot = readCurrentMonopoleSaveSnapshot();
  const payload = [
    formatMonopoleMessage(monopoleRuntimeMessages.copyMode, {
      mode: snapshot.mode === modes.STATIC
        ? monopoleRuntimeMessages.copyStaticMode
        : monopoleRuntimeMessages.copyDynamicMode,
    }),
  ];

  if (snapshot.mode === modes.STATIC) {
    payload.push(
      formatMonopoleMessage(monopoleRuntimeMessages.copyUncoupledFrequency, { value: snapshot.inputs.freqHz }),
      formatMonopoleMessage(monopoleRuntimeMessages.copyDeflection, { value: snapshot.inputs.deflectionMm }),
      formatMonopoleMessage(monopoleRuntimeMessages.copyMass, { value: snapshot.inputs.testMassKg })
    );
  } else {
    payload.push(
      formatMonopoleMessage(monopoleRuntimeMessages.copyUnloadedFrequency, { value: snapshot.inputs.unloadedFrequencyHz }),
      formatMonopoleMessage(monopoleRuntimeMessages.copyLoadedFrequency, { value: snapshot.inputs.loadedFrequencyHz }),
      formatMonopoleMessage(monopoleRuntimeMessages.copyAddedMass, { value: snapshot.inputs.addedMassG })
    );
  }

  payload.push(
    formatMonopoleMessage(monopoleRuntimeMessages.copyStiffness, { value: snapshot.outputs.stiffnessNPerM }),
    formatMonopoleMessage(monopoleRuntimeMessages.copyEffectiveMass, { value: snapshot.outputs.effectiveMassG }),
    formatMonopoleMessage(monopoleRuntimeMessages.copyMobilityScore, { value: snapshot.outputs.mobilityScore })
  );

  return payload;
}

function readCurrentMonopoleSaveSummary() {
  const summaryApi = window.MonopoleSaveSummary;
  if (!summaryApi) return [];
  return summaryApi.buildMonopoleSaveSummary({
    mode: currentMode,
    inputs: readCurrentMonopoleSaveInputs(),
    outputs: readCurrentMonopoleSaveOutputs(),
    defaultsMatch: readCurrentMonopoleDefaultsMatch(),
    messages: readMonopoleSaveSummaryMessages(),
  });
}

function readMonopoleSaveSummaryMessages() {
  return {
    addedMass: monopoleRuntimeMessages.summaryAddedMass,
    deflection: monopoleRuntimeMessages.summaryDeflection,
    dynamicMassLoading: monopoleRuntimeMessages.summaryDynamicMassLoading,
    effectiveMass: monopoleRuntimeMessages.summaryEffectiveMass,
    frequency: monopoleRuntimeMessages.summaryFrequency,
    loadedFrequency: monopoleRuntimeMessages.summaryLoadedFrequency,
    method: monopoleRuntimeMessages.summaryMethod,
    mobilityScore: monopoleRuntimeMessages.summaryMobilityScore,
    staticDeflection: monopoleRuntimeMessages.summaryStaticDeflection,
    testMass: monopoleRuntimeMessages.summaryTestMass,
    topStiffness: monopoleRuntimeMessages.summaryTopStiffness,
    unloadedFrequency: monopoleRuntimeMessages.summaryUnloadedFrequency,
  };
}

function readCurrentMonopoleDefaultsMatch() {
  if (currentMode === modes.STATIC) {
    return matchesStaticDefaults({
      freq: parseFloat(fields.freq.value),
      deflection: parseFloat(fields.deflection.value),
      mass: parseFloat(fields.mass.value),
    });
  }
  return matchesDynamicDefaults({
    f0: parseFloat(dynamicFields.f0.value),
    f1: parseFloat(dynamicFields.f1.value),
    addedMass: parseFloat(dynamicFields.mass.value),
  });
}

function readCurrentMonopoleSaveSnapshot() {
  return {
    name: nameInput.value.trim() || monopoleRuntimeMessages.untitledSample,
    type: typeSelect.value,
    mode: currentMode,
    inputs: readCurrentMonopoleSaveInputs(),
    outputs: readCurrentMonopoleSaveOutputs(),
  };
}

function readCurrentMonopoleSaveInputs() {
  if (currentMode === modes.STATIC) {
    return {
      freqHz: fields.freq.value,
      deflectionMm: fields.deflection.value,
      testMassKg: fields.mass.value,
    };
  }

  return {
    unloadedFrequencyHz: dynamicFields.f0.value,
    loadedFrequencyHz: dynamicFields.f1.value,
    addedMassG: dynamicFields.mass.value,
  };
}

function readCurrentMonopoleSaveOutputs() {
  return {
    stiffnessNPerM: outputs.stiffness.textContent,
    effectiveMassG: outputs.effMass.textContent,
    mobilityScore: outputs.mobilityScore.textContent,
    status: outputs.status.textContent,
    warnings: outputs.warnings.textContent,
  };
}

function readMonopoleSaveRunner() {
  if (window.MonopoleSaveTarget?.monopoleSaveRunnerCreate) {
    return window.MonopoleSaveTarget.monopoleSaveRunnerCreate({
      messages: monopoleRuntimeMessages,
    });
  }

  throw new Error("Monopole save target is unavailable.");
}

function readMonopoleNotebookRestoreApi() {
  return window.MonopoleNotebookRestore?.restoreMonopoleNotebookEventIntoUi
    ? window.MonopoleNotebookRestore
    : null;
}

function applyMonopoleSaveSurface(button, surface) {
  if (!button) {
    return;
  }

  document.body.dataset.monopoleSaveMode = surface.mode || "offline";
  applyMonopoleIdentitySurface(surface);
  button.textContent = surface.label || monopoleRuntimeMessages.downloadJson;
  button.title = surface.hint || "";
}

function applyMonopoleIdentitySurface(surface) {
  const isNotebookConnected = surface.mode === "lab-connected";

  identityControls.hidden = !isNotebookConnected;
  instrumentDisplay.hidden = !isNotebookConnected;
}

function applyLoadedMonopoleSnapshot(snapshot) {
  const plan = window.MonopoleSaveSnapshot.buildMonopoleSnapshotApplyPlan(
    snapshot,
    defaults,
    monopoleRuntimeMessages,
  );
  nameInput.value = plan.name;
  typeSelect.value = plan.type;
  applyMonopoleStaticSnapshotInputs(plan.staticInputs);
  applyMonopoleDynamicSnapshotInputs(plan.dynamicInputs);
  setMode(plan.mode);
}

function applyMonopoleStaticSnapshotInputs(inputs) {
  writeMonopoleInputPair(sliders.freq, fields.freq, inputs.freqHz);
  writeMonopoleInputPair(sliders.deflection, fields.deflection, inputs.deflectionMm);
  writeMonopoleInputPair(sliders.mass, fields.mass, inputs.testMassKg);
}

function applyMonopoleDynamicSnapshotInputs(inputs) {
  writeMonopoleInputPair(dynamicSliders.f0, dynamicFields.f0, inputs.unloadedFrequencyHz);
  writeMonopoleInputPair(dynamicSliders.f1, dynamicFields.f1, inputs.loadedFrequencyHz);
  writeMonopoleInputPair(dynamicSliders.mass, dynamicFields.mass, inputs.addedMassG);
}

function writeMonopoleInputPair(slider, field, value) {
  const nextValue = String(value || "").trim();
  slider.value = nextValue;
  field.value = nextValue;
}

async function initializeMonopoleSaveSurface() {
  if (await restoreNotebookEventIntoUi()) {
    return;
  }

  const surface = await saveRunner.readMonopoleSaveSurface();
  applyMonopoleSaveSurface(buttons.save, surface);
}

async function restoreNotebookEventIntoUi() {
  const restoreApi = readMonopoleNotebookRestoreApi();

  if (!restoreApi) {
    return false;
  }

  const restored = await restoreApi.restoreMonopoleNotebookEventIntoUi({
    runtime: window,
    messages: monopoleRuntimeMessages,
    applySnapshot(snapshot) {
      applyLoadedMonopoleSnapshot(snapshot);
    },
  });

  if (restored) {
    outputs.status.textContent = monopoleRuntimeMessages.notebookEventRestored;
  }

  return restored;
}

function setMode(nextMode) {
  if (!Object.values(modes).includes(nextMode)) {
    return;
  }
  currentMode = nextMode;

  Object.entries(modeButtons).forEach(([key, button]) => {
    const isActive = key === nextMode;
    button.classList.toggle("active", isActive);
  });

  Object.entries(modePanels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== nextMode);
  });

  Object.entries(modeHints).forEach(([key, note]) => {
    note?.classList.toggle("hidden", key !== nextMode);
  });

  compute();
}

function attachInputPair(slider, field) {
  slider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    if (Number.isFinite(value)) {
      field.value = value;
    }
    compute();
  });

  field.addEventListener("input", (event) => {
    const raw = parseFloat(event.target.value);
    if (Number.isFinite(raw)) {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (raw >= min && raw <= max) {
        slider.value = raw;
      }
    }
    compute();
  });

  field.addEventListener("change", () => {
    const value = parseFloat(field.value);
    if (!Number.isFinite(value)) {
      return;
    }
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const clamped = clamp(value, min, max);
    slider.value = clamped;
    field.value = clamped;
    compute();
  });
}

buttons.reset.addEventListener("click", resetInputs);
buttons.copy.addEventListener("click", copyResults);
buttons.load.addEventListener("click", () => buttons.loadFile.click());
buttons.loadFile.addEventListener("change", loadResults);
buttons.save.addEventListener("click", () => {
  void saveResults();
});

Object.entries(sliders).forEach(([key, slider]) => {
  attachInputPair(slider, fields[key]);
});

Object.entries(dynamicSliders).forEach(([key, slider]) => {
  attachInputPair(slider, dynamicFields[key]);
});

modeButtons.static.addEventListener("click", () => setMode(modes.STATIC));
modeButtons.dynamic.addEventListener("click", () => setMode(modes.DYNAMIC));

nameInput.addEventListener("input", compute);
typeSelect.addEventListener("change", compute);

applyStaticDefaults();
applyDynamicDefaults();
restoreMonopolePerTabSession();
void initializeMonopoleSaveSurface();
updateInstrumentLabel();
setMode(currentMode);
