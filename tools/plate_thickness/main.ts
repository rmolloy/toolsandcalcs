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
  const queryParams = (typeof window !== "undefined" && (window as any).PlateThicknessQueryParams)
    ? (window as any).PlateThicknessQueryParams
    : null;
  if (!calculator) {
    throw new Error("PlateThickness calculator unavailable. Ensure calculator.js is loaded before main.js.");
  }
  if (!queryParams) {
    throw new Error("PlateThickness query params unavailable. Ensure query_params.js is loaded before main.js.");
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

  const saveButton = document.getElementById("save_results") as HTMLButtonElement | null;
  const loadButton = document.getElementById("load_results") as HTMLButtonElement | null;
  const loadFileInput = document.getElementById("load_results_file") as HTMLInputElement | null;
  const saveRunner = readPlateThicknessSaveRunner();

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

  function readCurrentPlateThicknessSaveSnapshot() {
    return {
      inputs: readCurrentPlateThicknessSaveInputs(),
      results: readCurrentPlateThicknessSaveResults(),
    };
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

  async function loadResults() {
    const file = loadFileInput?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const snapshot = await (window as any).PlateThicknessSaveSurface.readPlateThicknessSavePackageFile(file);
      applyLoadedPlateThicknessSnapshot(snapshot);
      if (resultEls.status) resultEls.status.textContent = "Loaded JSON package";
    } catch (_error) {
      if (resultEls.status) resultEls.status.textContent = "Unable to load JSON package";
    } finally {
      if (loadFileInput) loadFileInput.value = "";
    }
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

  async function saveResults() {
    await saveRunner.runPlateThicknessSaveAction({
      readSnapshot: readCurrentPlateThicknessSaveSnapshot,
      setStatus: writeStatusText,
    });
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
    const changed = queryParams.applyToFields(fields, window.location.search, formatNumber);
    if (changed) run();
  }

  function applyLoadedPlateThicknessSnapshot(snapshot: { inputs?: Record<string, string> }) {
    const plan = (window as any).PlateThicknessSaveSnapshot.buildPlateThicknessSnapshotApplyPlan(snapshot, defaults);
    Object.entries(plan.fields).forEach(([key, value]) => {
      if (fields[key]) {
        fields[key].value = String(value || "");
      }
    });
    run();
  }

  async function applyPlateThicknessSaveSurface() {
    const saveSurface = await saveRunner.readPlateThicknessSaveSurface();
    if (saveButton) {
      saveButton.textContent = saveSurface.label || "Download JSON";
      saveButton.title = saveSurface.hint || "";
    }
  }

  function readPlateThicknessNotebookRestoreApi() {
    return (window as any).PlateThicknessNotebookRestore?.restorePlateThicknessNotebookEventIntoUi
      ? (window as any).PlateThicknessNotebookRestore
      : null;
  }

  function readCurrentPlateThicknessSaveInputs() {
    return Object.fromEntries(
      Object.entries(fields).map(([key, input]) => [key, input.value]),
    );
  }

  function readCurrentPlateThicknessSaveResults() {
    return {
      result_thickness: resultEls.thickness?.textContent || "",
      result_mass: resultEls.mass?.textContent || "",
      result_density: resultEls.density?.textContent || "",
      result_el: resultEls.EL?.textContent || "",
      result_ec: resultEls.EC?.textContent || "",
      result_ratio: resultEls.ratio?.textContent || "",
      result_shear: resultEls.shear?.textContent || "",
    };
  }

  function readPlateThicknessSaveRunner() {
    if ((window as any).PlateThicknessSaveTarget?.plateThicknessSaveRunnerCreate) {
      return (window as any).PlateThicknessSaveTarget.plateThicknessSaveRunnerCreate();
    }

    return {
      readPlateThicknessSaveSurface() {
        return Promise.resolve({
          mode: "offline",
          label: "Download JSON",
          hint: "",
        });
      },
      runPlateThicknessSaveAction(request: {
        readSnapshot: () => ReturnType<typeof readCurrentPlateThicknessSaveSnapshot>;
        setStatus: (message: string) => void;
      }) {
        const savePackage = (window as any).PlateThicknessSaveSurface.buildPlateThicknessSavePackage(
          request.readSnapshot(),
        );
        (window as any).PlateThicknessSaveSurface.downloadPlateThicknessSavePackage(window, savePackage);
        request.setStatus("JSON package downloaded");
        return Promise.resolve(true);
      },
    };
  }

  function writeStatusText(message: string) {
    if (resultEls.status) {
      resultEls.status.textContent = message;
    }
  }

  async function initializePlateThicknessToolSurface() {
    if (await restoreNotebookEventIntoUi()) {
      return;
    }

    await applyPlateThicknessSaveSurface();
  }

  async function restoreNotebookEventIntoUi() {
    const restoreApi = readPlateThicknessNotebookRestoreApi();

    if (!restoreApi) {
      return false;
    }

    const restored = await restoreApi.restorePlateThicknessNotebookEventIntoUi({
      runtime: window,
      applySnapshot(snapshot: { inputs?: Record<string, string> }) {
        applyLoadedPlateThicknessSnapshot(snapshot);
      },
    });

    if (restored && resultEls.status) {
      resultEls.status.textContent = "Notebook event restored.";
    }

    return restored;
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
  if (saveButton) saveButton.addEventListener("click", () => void saveResults());
  if (loadButton && loadFileInput) loadButton.addEventListener("click", () => loadFileInput.click());
  if (loadFileInput) loadFileInput.addEventListener("change", loadResults);

  reset();
  void initializePlateThicknessToolSurface();

  function formatNumber(value: number) {
    if (!Number.isFinite(value)) return "";
    const fixed = value.toFixed(2);
    return fixed.replace(/\.?0+$/, "");
  }
})();
