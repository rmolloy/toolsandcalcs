const g = 9.8;
const defaults = {
  name: "Rick Molloy's guitar — 10/5/25",
  freq: 153,
  deflection: 0.18,
  mass: 1.02,
};

const inputs = {
  freq: document.getElementById("freq"),
  deflection: document.getElementById("deflection"),
  mass: document.getElementById("mass"),
};

const nameInput = document.getElementById("instrument_name");

const displays = {
  freq: document.getElementById("freq_val"),
  deflection: document.getElementById("deflection_val"),
  mass: document.getElementById("mass_val"),
};

const instrumentDisplay = document.getElementById("instrument_display");

const outputs = {
  stiffness: document.getElementById("stiffness"),
  effMass: document.getElementById("effMass"),
  mobilityScore: document.getElementById("mobilityScore"),
  status: document.getElementById("status"),
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

function updateDisplayLabels(values) {
  if ("freq" in values) {
    displays.freq.textContent = `${Number(values.freq).toFixed(1)} Hz`;
  }
  if ("deflection" in values) {
    displays.deflection.textContent = `${Number(values.deflection).toFixed(
      3
    )} mm`;
  }
  if ("mass" in values) {
    displays.mass.textContent = `${Number(values.mass).toFixed(2)} kg`;
  }
}

function updateInstrumentLabel() {
  const name = nameInput.value.trim();
  instrumentDisplay.textContent = name || "Untitled sample";
}

function compute() {
  const freq = parseFloat(inputs.freq.value);
  const deflection = parseFloat(inputs.deflection.value);
  const mass = parseFloat(inputs.mass.value);
  updateInstrumentLabel();

  const valid =
    Number.isFinite(freq) &&
    freq > 0 &&
    Number.isFinite(deflection) &&
    deflection > 0 &&
    Number.isFinite(mass) &&
    mass > 0;

  if (!valid) {
    setOutputs("--");
    outputs.status.textContent = "Waiting for complete inputs…";
    return;
  }

  updateDisplayLabels({ freq, deflection, mass });

  const defM = deflection / 1000;
  const stiffness = (mass * g) / defM;
  const meffKg = stiffness / Math.pow(2 * Math.PI * freq, 2);
  const meffG = meffKg * 1000;
  const mobilitySI = 1 / Math.sqrt(stiffness * meffKg);
  const mobilityScore = 1000 * mobilitySI;

  outputs.stiffness.textContent = formatter({ max: 0 }).format(stiffness);
  outputs.effMass.textContent = formatter({ min: 1, max: 1 }).format(meffG);
  outputs.mobilityScore.textContent = fmtMobility.format(mobilityScore);

  const nameMatches = nameInput.value.trim() === defaults.name;

  if (
    Math.abs(freq - defaults.freq) < 1e-9 &&
    Math.abs(deflection - defaults.deflection) < 1e-9 &&
    Math.abs(mass - defaults.mass) < 1e-9 &&
    nameMatches
  ) {
    outputs.status.textContent = "Live: Rick Molloy OM (10/25/2025)";
  } else {
    outputs.status.textContent = "Live: custom input";
  }

  buttons.copy.disabled = false;
}

function setOutputs(value) {
  outputs.stiffness.textContent = value;
  outputs.effMass.textContent = value;
  outputs.mobilityScore.textContent = value;
  buttons.copy.disabled = true;
}

function resetInputs() {
  nameInput.value = defaults.name;
  inputs.freq.value = defaults.freq;
  inputs.deflection.value = defaults.deflection;
  inputs.mass.value = defaults.mass;
  updateInstrumentLabel();
  updateDisplayLabels(defaults);
  compute();
}

function copyResults() {
  const payload = [
    `Sample: ${nameInput.value.trim() || "Untitled sample"}`,
    `f_u (Hz): ${inputs.freq.value}`,
    `Deflection (mm): ${inputs.deflection.value}`,
    `Mass (kg): ${inputs.mass.value}`,
    `K (N/m): ${outputs.stiffness.textContent}`,
    `M_eff (g): ${outputs.effMass.textContent}`,
    `Mobility score: ${outputs.mobilityScore.textContent}`,
  ].join("\n");

  navigator.clipboard
    .writeText(payload)
    .then(() => {
      outputs.status.textContent = "Copied results to clipboard";
      setTimeout(compute, 1500);
    })
    .catch(() => {
      outputs.status.textContent = "Clipboard copy failed";
    });
}

buttons.reset.addEventListener("click", resetInputs);
buttons.copy.addEventListener("click", copyResults);

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", (event) => {
    const { id, value } = event.target;
    if (id in displays) {
      updateDisplayLabels({ [id]: parseFloat(value) });
    }
    compute();
  });
});

nameInput.addEventListener("input", updateInstrumentLabel);

resetInputs();
