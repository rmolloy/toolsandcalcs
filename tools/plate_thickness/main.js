"use strict";
/*
© 2025 Rick Molloy. All rights reserved.

Panel thickness calculator UI logic.
*/
(function initPlateThicknessTool() {
    const calculator = (typeof window !== "undefined" && window.PlateThickness) ? window.PlateThickness : null;
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
        const params = new URLSearchParams(window.location.search);
        const overrides = {
            long_freq: params.get("long"),
            cross_freq: params.get("cross"),
            twist_freq: params.get("twisting")
        };
        let changed = false;
        Object.entries(overrides).forEach(([field, raw]) => {
            if (!raw)
                return;
            const numeric = parseFloat(raw);
            if (!Number.isFinite(numeric))
                return;
            if (fields[field]) {
                const scaled = field.includes("_freq") ? numeric : numeric;
                fields[field].value = formatNumber(scaled);
                changed = true;
            }
        });
        if (changed)
            run();
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
    reset();
    function formatNumber(value) {
        if (!Number.isFinite(value))
            return "";
        const fixed = value.toFixed(2);
        return fixed.replace(/\.?0+$/, "");
    }
})();
