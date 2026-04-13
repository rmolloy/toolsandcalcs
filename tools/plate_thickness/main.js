"use strict";
/*
© 2025 Rick Molloy. All rights reserved.

Panel thickness calculator UI logic.
*/
(function initPlateThicknessTool() {
    const calculator = (typeof window !== "undefined" && window.PlateThickness) ? window.PlateThickness : null;
    const queryParams = (typeof window !== "undefined" && window.PlateThicknessQueryParams)
        ? window.PlateThicknessQueryParams
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
        longFreq: 74, // Hz
        crossFreq: 109, // Hz
        twistFreq: 42, // Hz
        targetFreq: 75 // Hz
    };
    const fields = {};
    document.querySelectorAll("[data-field]").forEach((input) => {
        const key = input.dataset.field;
        if (key)
            fields[key] = input;
    });
    const resultEls = {
        thickness: document.getElementById("result_thickness"),
        mass: document.getElementById("result_mass"),
        density: document.getElementById("result_density"),
        EL: document.getElementById("result_el"),
        EC: document.getElementById("result_ec"),
        ratio: document.getElementById("result_ratio"),
        shear: document.getElementById("result_shear"),
        status: document.getElementById("result_status")
    };
    const saveButton = document.getElementById("save_results");
    const loadButton = document.getElementById("load_results");
    const loadFileInput = document.getElementById("load_results_file");
    const saveRunner = readPlateThicknessSaveRunner();
    function format(value, { digits = 2, notation = "standard" } = {}) {
        if (!Number.isFinite(value))
            return "—";
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
            notation
        }).format(value);
    }
    function readInputs() {
        const values = {};
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
    function setResults(result) {
        if (resultEls.thickness)
            resultEls.thickness.textContent = `${format(result.thicknessMm, { digits: 2 })} mm`;
        if (resultEls.mass)
            resultEls.mass.textContent = `${format(result.projectedMassG, { digits: 1 })} g`;
        if (resultEls.density)
            resultEls.density.textContent = `${format(result.density, { digits: 1 })} kg/m³`;
        if (resultEls.EL)
            resultEls.EL.textContent = `${format(result.EL / 1e9, { digits: 2 })} GPa`;
        if (resultEls.EC)
            resultEls.EC.textContent = `${format(result.EC / 1e9, { digits: 2 })} GPa`;
        if (resultEls.ratio)
            resultEls.ratio.textContent = format(result.ELoverEC, { digits: 2 });
        if (resultEls.shear)
            resultEls.shear.textContent = `${format(result.GLC / 1e9, { digits: 2 })} GPa`;
        if (resultEls.status)
            resultEls.status.textContent = "Live: computed from current inputs";
    }
    function setError(message) {
        if (resultEls.thickness)
            resultEls.thickness.textContent = "—";
        if (resultEls.mass)
            resultEls.mass.textContent = "—";
        if (resultEls.density)
            resultEls.density.textContent = "—";
        if (resultEls.EL)
            resultEls.EL.textContent = "—";
        if (resultEls.EC)
            resultEls.EC.textContent = "—";
        if (resultEls.ratio)
            resultEls.ratio.textContent = "—";
        if (resultEls.shear)
            resultEls.shear.textContent = "—";
        if (resultEls.status)
            resultEls.status.textContent = message;
    }
    async function loadResults() {
        var _a;
        const file = (_a = loadFileInput === null || loadFileInput === void 0 ? void 0 : loadFileInput.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file) {
            return;
        }
        try {
            const snapshot = await window.PlateThicknessSaveSurface.readPlateThicknessSavePackageFile(file);
            applyLoadedPlateThicknessSnapshot(snapshot);
            if (resultEls.status)
                resultEls.status.textContent = "Loaded JSON package";
        }
        catch (_error) {
            if (resultEls.status)
                resultEls.status.textContent = "Unable to load JSON package";
        }
        finally {
            if (loadFileInput)
                loadFileInput.value = "";
        }
    }
    function run() {
        var _a, _b, _c, _d, _e, _f;
        try {
            const raw = readInputs();
            const mapped = {
                bodyLength: ((_a = raw.body_length) !== null && _a !== void 0 ? _a : 0) / 1000,
                lowerBout: ((_b = raw.lower_bout) !== null && _b !== void 0 ? _b : 0) / 1000,
                panelMass: ((_c = raw.panel_mass) !== null && _c !== void 0 ? _c : 0) / 1000,
                panelHeight: ((_d = raw.panel_height) !== null && _d !== void 0 ? _d : 0) / 1000,
                panelLength: ((_e = raw.panel_length) !== null && _e !== void 0 ? _e : 0) / 1000,
                panelWidth: ((_f = raw.panel_width) !== null && _f !== void 0 ? _f : 0) / 1000,
                longFreq: raw.long_freq,
                crossFreq: raw.cross_freq,
                twistFreq: raw.twist_freq,
                targetFreq: raw.target_freq
            };
            const result = calc.computePlateSolution(mapped);
            setResults(result);
        }
        catch (error) {
            setError(error.message);
        }
    }
    function reset() {
        Object.entries(fields).forEach(([key, input]) => {
            const defaultKey = key;
            const value = defaults[camelCase(defaultKey)];
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
    function scaleForField(key, baseValue) {
        if (key.includes("mass"))
            return baseValue * 1000;
        if (key.includes("height") || key.includes("length") || key.includes("width") || key.includes("body") || key.includes("bout")) {
            return baseValue * 1000;
        }
        return baseValue;
    }
    function camelCase(snake) {
        return snake.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
    function applyQueryParams() {
        if (typeof window === "undefined" || !window.location)
            return;
        const changed = queryParams.applyToFields(fields, window.location.search, formatNumber);
        if (changed)
            run();
    }
    function applyLoadedPlateThicknessSnapshot(snapshot) {
        const plan = window.PlateThicknessSaveSnapshot.buildPlateThicknessSnapshotApplyPlan(snapshot, defaults);
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
        var _a;
        return ((_a = window.PlateThicknessNotebookRestore) === null || _a === void 0 ? void 0 : _a.restorePlateThicknessNotebookEventIntoUi)
            ? window.PlateThicknessNotebookRestore
            : null;
    }
    function readCurrentPlateThicknessSaveInputs() {
        return Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value]));
    }
    function readCurrentPlateThicknessSaveResults() {
        var _a, _b, _c, _d, _e, _f, _g;
        return {
            result_thickness: ((_a = resultEls.thickness) === null || _a === void 0 ? void 0 : _a.textContent) || "",
            result_mass: ((_b = resultEls.mass) === null || _b === void 0 ? void 0 : _b.textContent) || "",
            result_density: ((_c = resultEls.density) === null || _c === void 0 ? void 0 : _c.textContent) || "",
            result_el: ((_d = resultEls.EL) === null || _d === void 0 ? void 0 : _d.textContent) || "",
            result_ec: ((_e = resultEls.EC) === null || _e === void 0 ? void 0 : _e.textContent) || "",
            result_ratio: ((_f = resultEls.ratio) === null || _f === void 0 ? void 0 : _f.textContent) || "",
            result_shear: ((_g = resultEls.shear) === null || _g === void 0 ? void 0 : _g.textContent) || "",
        };
    }
    function readPlateThicknessSaveRunner() {
        var _a;
        if ((_a = window.PlateThicknessSaveTarget) === null || _a === void 0 ? void 0 : _a.plateThicknessSaveRunnerCreate) {
            return window.PlateThicknessSaveTarget.plateThicknessSaveRunnerCreate();
        }
        return {
            readPlateThicknessSaveSurface() {
                return Promise.resolve({
                    mode: "offline",
                    label: "Download JSON",
                    hint: "",
                });
            },
            runPlateThicknessSaveAction(request) {
                const savePackage = window.PlateThicknessSaveSurface.buildPlateThicknessSavePackage(request.readSnapshot());
                window.PlateThicknessSaveSurface.downloadPlateThicknessSavePackage(window, savePackage);
                request.setStatus("JSON package downloaded");
                return Promise.resolve(true);
            },
        };
    }
    function writeStatusText(message) {
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
            applySnapshot(snapshot) {
                applyLoadedPlateThicknessSnapshot(snapshot);
            },
        });
        if (restored && resultEls.status) {
            resultEls.status.textContent = "Notebook event restored.";
        }
        return restored;
    }
    document.querySelectorAll("input[data-field]").forEach((input) => {
        input.addEventListener("input", (event) => {
            const target = event.target;
            const value = parseFloat(target.value);
            if (Number.isFinite(value)) {
                target.value = formatNumber(value);
            }
            run();
        });
    });
    const resetBtn = document.getElementById("reset_inputs");
    if (resetBtn)
        resetBtn.addEventListener("click", event => {
            event.preventDefault();
            reset();
        });
    if (saveButton)
        saveButton.addEventListener("click", () => void saveResults());
    if (loadButton && loadFileInput)
        loadButton.addEventListener("click", () => loadFileInput.click());
    if (loadFileInput)
        loadFileInput.addEventListener("change", loadResults);
    reset();
    void initializePlateThicknessToolSurface();
    function formatNumber(value) {
        if (!Number.isFinite(value))
            return "";
        const fixed = value.toFixed(2);
        return fixed.replace(/\.?0+$/, "");
    }
})();
