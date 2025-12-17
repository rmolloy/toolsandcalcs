/*
© 2025 Rick Molloy. All rights reserved.

Panel thickness calculator UI logic.
*/

type PlateSolution = {
  thicknessMm: number;
  projectedMassG: number;
  density: number;
  EL: number;
  EC: number;
  ELoverEC: number;
  GLC: number;
};

(function initPlateThicknessTool() {
  const calculator = (typeof window !== "undefined" && (window as any).PlateThickness) ? (window as any).PlateThickness : null;
  if (!calculator) {
    throw new Error("PlateThickness calculator unavailable. Ensure calculator.js is loaded before main.js.");
  }
  const calc = calculator;

  const defaults = {
    bodyLength: 0.49,
    lowerBout: 0.39,
    panelMass: 0.2114,
    panelHeight: 0.0041,
    panelLength: 0.555,
    panelWidth: 0.227,
    longFreq: 74,          // Hz
    crossFreq: 109,        // Hz
    twistFreq: 42,         // Hz
    targetFreq: 75         // Hz
  } as const;

  type DefaultKey = keyof typeof defaults;

  const fields: Record<string, HTMLInputElement> = {};
  document.querySelectorAll<HTMLInputElement>("[data-field]").forEach((input) => {
    const key = input.dataset.field;
    if (key) fields[key] = input;
  });

  const resultEls = {
    thickness: document.getElementById("result_thickness") as HTMLElement | null,
    mass: document.getElementById("result_mass") as HTMLElement | null,
    density: document.getElementById("result_density") as HTMLElement | null,
    EL: document.getElementById("result_el") as HTMLElement | null,
    EC: document.getElementById("result_ec") as HTMLElement | null,
    ratio: document.getElementById("result_ratio") as HTMLElement | null,
    shear: document.getElementById("result_shear") as HTMLElement | null,
    status: document.getElementById("result_status") as HTMLElement | null
  };

  function format(value: number, { digits = 2, notation = "standard" as Intl.NumberFormatOptions["notation"] } = {}) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      notation
    }).format(value);
  }

  function readInputs() {
    const values: Record<string, number> = {};
    for (const [key, input] of Object.entries(fields)) {
      const value = parseFloat(input.value);
      values[key] = value;
    }
    return values;
  }

  function setResults(result: PlateSolution) {
    if (resultEls.thickness) resultEls.thickness.textContent = `${format(result.thicknessMm, { digits: 2 })} mm`;
    if (resultEls.mass) resultEls.mass.textContent = `${format(result.projectedMassG, { digits: 1 })} g`;
    if (resultEls.density) resultEls.density.textContent = `${format(result.density, { digits: 1 })} kg/m³`;
    if (resultEls.EL) resultEls.EL.textContent = `${format(result.EL / 1e9, { digits: 2 })} GPa`;
    if (resultEls.EC) resultEls.EC.textContent = `${format(result.EC / 1e9, { digits: 2 })} GPa`;
    if (resultEls.ratio) resultEls.ratio.textContent = format(result.ELoverEC, { digits: 2 });
    if (resultEls.shear) resultEls.shear.textContent = `${format(result.GLC / 1e9, { digits: 2 })} GPa`;
    if (resultEls.status) resultEls.status.textContent = "Live: computed from current inputs";
  }

  function setError(message: string) {
    if (resultEls.thickness) resultEls.thickness.textContent = "—";
    if (resultEls.mass) resultEls.mass.textContent = "—";
    if (resultEls.density) resultEls.density.textContent = "—";
    if (resultEls.EL) resultEls.EL.textContent = "—";
    if (resultEls.EC) resultEls.EC.textContent = "—";
    if (resultEls.ratio) resultEls.ratio.textContent = "—";
    if (resultEls.shear) resultEls.shear.textContent = "—";
    if (resultEls.status) resultEls.status.textContent = message;
  }

  function run() {
    try {
      const raw = readInputs();
      const mapped = {
        bodyLength: (raw.body_length ?? 0) / 1000,
        lowerBout: (raw.lower_bout ?? 0) / 1000,
        panelMass: (raw.panel_mass ?? 0) / 1000,
        panelHeight: (raw.panel_height ?? 0) / 1000,
        panelLength: (raw.panel_length ?? 0) / 1000,
        panelWidth: (raw.panel_width ?? 0) / 1000,
        longFreq: raw.long_freq,
        crossFreq: raw.cross_freq,
        twistFreq: raw.twist_freq,
        targetFreq: raw.target_freq
      };
      const result = calc.computePlateSolution(mapped);
      setResults(result);
    } catch (error) {
      setError((error as Error).message);
    }
  }

  function reset() {
    Object.entries(fields).forEach(([key, input]) => {
      const defaultKey = key;
      const value = defaults[camelCase(defaultKey) as DefaultKey];
      if (typeof value === "number") {
        const scaled = scaleForField(key, value);
        input.value = Number.isFinite(scaled) ? formatNumber(scaled) : "";
      }
    });
    applyQueryParams();
    run();
  }

  function scaleForField(key: string, baseValue: number) {
    if (key.includes("mass")) return baseValue * 1000;
    if (key.includes("height") || key.includes("length") || key.includes("width") || key.includes("body") || key.includes("bout")) {
      return baseValue * 1000;
    }
    return baseValue;
  }

  function camelCase(snake: string) {
    return snake.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
  }

  function applyQueryParams() {
    if (typeof window === "undefined" || !window.location) return;
    const params = new URLSearchParams(window.location.search);
    const overrides = {
      long_freq: params.get("long"),
      cross_freq: params.get("cross"),
      twist_freq: params.get("twisting")
    };
    let changed = false;
    Object.entries(overrides).forEach(([field, raw]) => {
      if (!raw) return;
      const numeric = parseFloat(raw);
      if (!Number.isFinite(numeric)) return;
      if (fields[field]) {
        const scaled = field.includes("_freq") ? numeric : numeric;
        fields[field].value = formatNumber(scaled);
        changed = true;
      }
    });
    if (changed) run();
  }

  document.querySelectorAll<HTMLInputElement>("input[data-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      const value = parseFloat(target.value);
      if (Number.isFinite(value)) {
        target.value = formatNumber(value);
      }
      run();
    });
  });

  const resetBtn = document.getElementById("reset_inputs");
  if (resetBtn) resetBtn.addEventListener("click", event => {
    event.preventDefault();
    reset();
  });

  reset();

  function formatNumber(value: number) {
    if (!Number.isFinite(value)) return "";
    const fixed = value.toFixed(2);
    return fixed.replace(/\.?0+$/, "");
  }
})();
