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
  steel: "Steel-string",
  classical: "Classical",
  other: "Other",
};

const getTypeLabel = (value) => typeLabels[value] || "Other";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
};

const formatter = (options = {}) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: options.max ?? 2,
    minimumFractionDigits: options.min ?? 0,
    notation: options.notation ?? "standard",
  });

const fmtMobility = formatter({ min: 1, max: 1 });

function updateInstrumentLabel() {
  const name = nameInput.value.trim() || "Untitled sample";
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
    return { ok: false, message: "Waiting for complete inputs…" };
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
    return { ok: false, message: "Waiting for complete inputs…" };
  }

  if (addedMassGrams <= 0) {
    return { ok: false, message: "Added mass must be greater than zero." };
  }

  if (f1 >= f0) {
    return { ok: false, message: "Loaded frequency f1 must be lower than unloaded f0." };
  }

  const addedMassKg = addedMassGrams / 1000;
  const denom = Math.pow(f0, 2) - Math.pow(f1, 2);

  if (denom <= 0) {
    return { ok: false, message: "Frequencies produce an invalid denominator. Re-check f0 and f1." };
  }

  const meffKg = (Math.pow(f1, 2) * addedMassKg) / denom;
  if (!Number.isFinite(meffKg) || meffKg <= 0) {
    return { ok: false, message: "Inputs produce an invalid effective mass. Re-check values." };
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
    notes.push("f\u2090 is outside 90–220 Hz. Re-check the sealed-soundhole peak.");
  }
  if (deflection < 0.05) {
    notes.push("Deflection is very small. Confirm gauge reading and load; may be outside normal jig range.");
  } else if (deflection > 0.5) {
    notes.push("Deflection is high. Reduce test mass to avoid overloading the top.");
  }
  if (mass < 0.3 || mass > 2.0) {
    notes.push("Test mass is outside the usual 0.3–2.0 kg band. Typical jigs use 0.5–1.5 kg.");
  }
  appendMobilityNotes(mobilityScore, notes, "Static Mode");
  return notes;
}

function getDynamicWarnings({ f0, f1, addedMass, mobilityScore }) {
  const notes = [];
  if (f0 < 90 || f0 > 240) {
    notes.push("f\u2080 is outside 90–240 Hz. Confirm the unloaded monopole peak.");
  }
  if (addedMass < 2 || addedMass > 80) {
    notes.push("Added mass is outside the usual 2–80 g range. Aim for a small, known load at the bridge.");
  }
  if (f0 - f1 < 2) {
    notes.push("Frequency shift is very small. Ensure the added mass is secure and peaks are clean.");
  }
  appendMobilityNotes(mobilityScore, notes, "Dynamic Mode");
  return notes;
}

function appendMobilityNotes(mobilityScore, notes, contextLabel) {
  if (!Number.isFinite(mobilityScore)) {
    return;
  }
  if (mobilityScore < 15) {
    notes.push(`${contextLabel}: Mobility <15 suggests a very stiff top. Confirm inputs and units.`);
  } else if (mobilityScore > 40) {
    notes.push(`${contextLabel}: Mobility >40 suggests a very compliant top. Confirm mass and readings.`);
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
    outputs.status.textContent = result.message || "Waiting for complete inputs…";
    return;
  }

  const meffG = result.meffKg * 1000;
  outputs.stiffness.textContent = formatter({ max: 0 }).format(result.stiffness);
  outputs.effMass.textContent = formatter({ min: 1, max: 1 }).format(meffG);
  outputs.mobilityScore.textContent = fmtMobility.format(result.mobilityScore);
  outputs.warnings.textContent = result.warnings.join(" ");

  const nameMatches = nameInput.value.trim() === defaults.name;
  const typeMatches = typeSelect.value === defaults.type;
  const modeLabel = currentMode === modes.STATIC ? "Static Mode" : "Dynamic Mode";

  const defaultsMatch =
    currentMode === modes.STATIC
      ? matchesStaticDefaults(staticInputs)
      : matchesDynamicDefaults(dynamicInputs);

  if (defaultsMatch && nameMatches && typeMatches) {
    outputs.status.textContent = `Live: default sample (${modeLabel})`;
  } else {
    outputs.status.textContent = `Live: custom input (${modeLabel})`;
  }

  buttons.copy.disabled = false;
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
  nameInput.value = defaults.name;
  typeSelect.value = defaults.type;
  applyStaticDefaults();
  applyDynamicDefaults();
  updateInstrumentLabel();
  compute();
}

function copyResults() {
  const isStatic = currentMode === modes.STATIC;
  const payload = [
    `Sample: ${nameInput.value.trim() || "Untitled sample"} (${getTypeLabel(typeSelect.value)})`,
    `Mode: ${isStatic ? "Static (Gore jig)" : "Dynamic (mass-loading)"}`,
  ];

  if (isStatic) {
    payload.push(
      `f_u (Hz): ${fields.freq.value}`,
      `Deflection (mm): ${fields.deflection.value}`,
      `Mass (kg): ${fields.mass.value}`
    );
  } else {
    payload.push(
      `f0 (Hz): ${dynamicFields.f0.value}`,
      `f1 (Hz): ${dynamicFields.f1.value}`,
      `Added mass (g): ${dynamicFields.mass.value}`
    );
  }

  payload.push(
    `K (N/m): ${outputs.stiffness.textContent}`,
    `M_eff (g): ${outputs.effMass.textContent}`,
    `Mobility score: ${outputs.mobilityScore.textContent}`
  );

  navigator.clipboard
    .writeText(payload.join("\n"))
    .then(() => {
      outputs.status.textContent = "Copied results to clipboard";
      setTimeout(compute, 1500);
    })
    .catch(() => {
      outputs.status.textContent = "Clipboard copy failed";
    });
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
updateInstrumentLabel();
setMode(currentMode);
