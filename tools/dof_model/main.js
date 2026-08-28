// @ts-nocheck
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./dof_display_format", "./dof_peak_detection", "./dof_plot_data", "./dof_target_fit", "./dof_task_cards", "./dof_legacy_solver", "./dof_series_sampling", "./dof_plot_pointer", "./dof_plot_resize", "./dof_trace_visibility", "./dof_fit_input_policy", "./dof_mode_card_presentation", "./dof_parameter_input_policy", "./dof_simple_sources", "./dof_plot_callouts"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const dof_display_format_1 = require("./dof_display_format");
    const dof_peak_detection_1 = require("./dof_peak_detection");
    const dof_plot_data_1 = require("./dof_plot_data");
    const dof_target_fit_1 = require("./dof_target_fit");
    const dof_task_cards_1 = require("./dof_task_cards");
    const dof_legacy_solver_1 = require("./dof_legacy_solver");
    const dof_series_sampling_1 = require("./dof_series_sampling");
    const dof_plot_pointer_1 = require("./dof_plot_pointer");
    const dof_plot_resize_1 = require("./dof_plot_resize");
    const dof_trace_visibility_1 = require("./dof_trace_visibility");
    const dof_fit_input_policy_1 = require("./dof_fit_input_policy");
    const dof_mode_card_presentation_1 = require("./dof_mode_card_presentation");
    const dof_parameter_input_policy_1 = require("./dof_parameter_input_policy");
    const dof_simple_sources_1 = require("./dof_simple_sources");
    const dof_plot_callouts_1 = require("./dof_plot_callouts");
    const DEFAULT_PARAMS = {
        model_order: 4,
        ambient_temp: 20,
        altitude: 0,
        driving_force: 0.4,
        area_hole: 0.0055,
        // Masses are in kg in the solver core.
        // UI shows grams, but we convert g -> kg on input.
        mass_air: 0.0005,
        volume_air: 0.0141,
        damping_air: 0.005,
        mass_top: 0.043,
        stiffness_top: 42700,
        damping_top: 1.5,
        area_top: 0.039,
        mass_back: 0.094,
        stiffness_back: 130000,
        damping_back: 7.0,
        area_back: 0.04,
        mass_sides: 0.8,
        stiffness_sides: 1400000,
        damping_sides: 10.0,
        area_sides: 0.025,
    };
    const CARD_DEFS = [
        {
            key: "air",
            label: "Air",
            alias: "T(1,1)1",
            degree: 1,
            color: "var(--purple)",
            badgeText: "DOF 1",
            fields: [
                { label: "Soundhole Area (m²)", param: "area_hole", step: 0.0001, min: 0.003, max: 0.01 },
                { label: "Cavity Volume (m³)", param: "volume_air", step: 0.0005, min: 0.01, max: 0.025 },
                { label: "Moving Air Mass (g)", param: "mass_air", step: 0.01, min: 0.1, max: 2.0 },
                { label: "Air Damping Rₐ", param: "damping_air", step: 0.0005, min: 0.001, max: 0.02 },
            ],
        },
        {
            key: "top",
            label: "Top",
            alias: "T(1,1)2",
            degree: 2,
            color: "var(--blue)",
            badgeText: "DOF 2",
            fields: [
                { label: "Mass mₜ (g)", param: "mass_top", step: 0.1, min: 5, max: 120 },
                { label: "Stiffness kₜ (N/m)", param: "stiffness_top", step: 100, min: 10000, max: 150000 },
                { label: "Damping Rₜ", param: "damping_top", step: 0.1, min: 0.5, max: 6.0 },
                { label: "Radiating Area Aₜ (m²)", param: "area_top", step: 0.0005, min: 0.02, max: 0.06 },
            ],
        },
        {
            key: "back",
            label: "Back",
            alias: "T(1,1)3",
            degree: 3,
            color: "var(--green)",
            badgeText: "DOF 3",
            fields: [
                { label: "Mass mᵦ (g)", param: "mass_back", step: 0.5, min: 40, max: 220 },
                { label: "Stiffness kᵦ (N/m)", param: "stiffness_back", step: 200, min: 80000, max: 400000 },
                { label: "Damping Rᵦ", param: "damping_back", step: 0.1, min: 1.0, max: 15.0 },
                { label: "Radiating Area Aᵦ (m²)", param: "area_back", step: 0.0005, min: 0.02, max: 0.06 },
            ],
        },
        {
            key: "sides",
            label: "Sides",
            alias: "External",
            degree: 4,
            color: "var(--yellow)",
            badgeText: "DOF 4",
            fields: [
                { label: "Sides Mass (g)", param: "mass_sides", step: 5, min: 300, max: 1500 },
                { label: "Sides Stiffness (N/m)", param: "stiffness_sides", step: 500, min: 500000, max: 3000000 },
                { label: "Sides Damping", param: "damping_sides", step: 0.1, min: 1.0, max: 30.0 },
                { label: "Sides Area (m²)", param: "area_sides", step: 0.0005, min: 0.01, max: 0.06 },
            ],
        },
        {
            key: "environment",
            label: "Environment",
            alias: "Inputs",
            degree: 0,
            color: "var(--muted)",
            badgeText: "Always",
            fields: [
                { label: "Ambient Temp (°C)", param: "ambient_temp", step: 0.5, min: -10, max: 40 },
                { label: "Altitude (m)", param: "altitude", step: 10, min: 0, max: 3000 },
                { label: "Driving Force F (N)", param: "driving_force", step: 0.05, min: 0.05, max: 1.0 },
            ],
        },
    ];
    const FIT_TASK_CARD_DEFS = [
        {
            key: "air",
            label: "Air",
            alias: "Measured mode + body",
            badgeText: "Fit",
            copy: "Match the air resonance from the measured mode and the body inputs you already know.",
            fieldIds: ["fit_target_air", "fit_target_volume_air", "fit_target_area_hole_diam"],
        },
        {
            key: "top",
            label: "Top",
            alias: "Measured mode + plate",
            badgeText: "Fit",
            copy: "Anchor the top mode with the observed frequency and the effective top properties you trust.",
            fieldIds: ["fit_target_top", "fit_target_mass_top", "fit_target_stiffness_top"],
        },
        {
            key: "back",
            label: "Back",
            alias: "Measured mode + plate",
            badgeText: "Fit",
            copy: "Anchor the back mode with the observed frequency and the effective back properties you trust.",
            fieldIds: ["fit_target_back", "fit_target_mass_back", "fit_target_stiffness_back"],
        },
        {
            key: "environment",
            label: "Environment",
            alias: "Atmosphere + actions",
            badgeText: "Fit",
            copy: "Set the measurement altitude, run the fitter, and clear the inputs when you want to start over.",
            fieldIds: ["fit_altitude"],
            actionIds: ["btn_fit_guitar", "btn_fit_clear"],
            statusId: "fit_status",
        },
    ];
    const SOLVE_TASK_CARD_DEFS = [
        {
            key: "air",
            label: "Air",
            alias: "Target mode + body",
            badgeText: "Solve",
            copy: "Set the air goal first, then shape the body inputs that most directly move it.",
            fieldIds: ["fit_target_air", "fit_target_volume_air", "fit_target_area_hole_diam"],
        },
        {
            key: "top",
            label: "Top",
            alias: "Target mode + plate",
            badgeText: "Solve",
            copy: "Set the top target and the effective top properties that define the move you want.",
            fieldIds: ["fit_target_top", "fit_target_mass_top", "fit_target_stiffness_top"],
        },
        {
            key: "back",
            label: "Back",
            alias: "Target mode + plate",
            badgeText: "Solve",
            copy: "Set the back target and the effective back properties you want the solver to respect.",
            fieldIds: ["fit_target_back", "fit_target_mass_back", "fit_target_stiffness_back"],
        },
        {
            key: "environment",
            label: "Environment",
            alias: "Recipe actions",
            badgeText: "Solve",
            copy: "Constrain the recipe, solve the what-if, and review the suggested structural moves.",
            optionIds: ["fit_restrict_simple"],
            actionIds: ["btn_solve_targets", "btn_reset_whatif"],
            panelIds: ["whatif_summary"],
        },
    ];
    const TASK_MODE_COPY = {
        edit: {
            cardsTitle: "Current Model",
            cardsCopy: "Direct parameter editing for each degree of freedom.",
        },
        fit: {
            cardsTitle: "Fit by System",
            cardsCopy: "Use measured modes and known inputs to infer the current model.",
        },
        solve: {
            cardsTitle: "Solve by System",
            cardsCopy: "Set goals and constraints, then review the suggested moves.",
        },
    };
    function cardDefsForTaskMode(taskMode) {
        if (taskMode === "edit")
            return CARD_DEFS;
        if (taskMode === "fit")
            return CARD_DEFS;
        return CARD_DEFS;
    }
    function fitTaskControlGridRead() {
        var _a;
        return (_a = fitPanelSection()) === null || _a === void 0 ? void 0 : _a.querySelector(".dof-fit-controls");
    }
    function solveTaskActionsGroupRead() {
        var _a;
        return (_a = solvePanelSection()) === null || _a === void 0 ? void 0 : _a.querySelector(".dof-guided-actions");
    }
    function solveTaskControlsRestoreHome() {
        (0, dof_task_cards_1.restoreDofSolveTaskControls)(document, solvePanelSection(), solveTaskActionsGroupRead(), SOLVE_TASK_CARD_DEFS);
    }
    const MODE_META = {
        air: { label: "Air", color: "var(--purple)" },
        top: { label: "Top", color: "var(--blue)" },
        back: { label: "Back", color: "var(--green)" },
    };
    const MODE_KEYS = ["air", "top", "back"];
    const TARGET_OVERLAY = {
        min: 85,
        max: 260,
        feather: 60,
        widths: { thin: 1.0, mid: 2.0, thick: 3.0 },
        opacities: { thin: 0.25, mid: 0.8, thick: 0.9 },
    };
    const FIT_BOUNDS = {
        area_hole: { min: 0.003, max: 0.01 },
        volume_air: { min: 0.01, max: 0.025 },
        mass_top: { min: 0.005, max: 0.12 },
        stiffness_top: { min: 10000, max: 150000 },
        stiffness_back: { min: 80000, max: 400000 },
    };
    const SOLVE_TWEAK_IDS = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
    const SIMPLE_SOURCE_COLORS = ["var(--orange)", "var(--yellow)", "var(--purple)", "var(--blue)", "var(--green)"];
    let currentParams = { ...DEFAULT_PARAMS };
    let currentOrder = 4;
    let currentTaskMode = "edit";
    let currentSimpleSources = {
        enabled: false,
        sources: [],
    };
    const dofPerTabSession = dofPerTabSessionRead();
    let plotlyRef = null;
    let pendingRender = null;
    let lastResponse = null;
    let lastDisplayedResponse = null;
    let plotListenersBound = false;
    let plotResizeObserver = null;
    const thumbEls = {};
    const simpleSourceThumbEls = {};
    const modeCardEls = {};
    const paramInputs = {};
    const paramSliders = {};
    const overlaySliders = {};
    const paramDeltaBars = {};
    const paramGlowDots = {};
    const paramWhatIfRows = {};
    const paramWhatIfValues = {};
    const paramWhatIfDeltas = {};
    const overlayLatched = new Set();
    let lastWhatIfResponse = null;
    const dragState = {
        mode: null,
        freq: null,
        pointerId: null,
    };
    const simpleSourceDragState = {
        amplitude: null,
        level: null,
        pointerId: null,
        sourceId: null,
    };
    let pendingDragSolve = null;
    let pendingDragMode = null;
    let pendingDragFreq = null;
    let dragLockedTargets = null;
    let dragUseWhatIf = false;
    const traceVisibilityState = { ...dof_trace_visibility_1.DOF_TRACE_DEFAULT_VISIBLE };
    const DOF_FIT_FIELD_IDS = [
        "fit_target_air",
        "fit_target_top",
        "fit_target_back",
        "fit_target_mass_top",
        "fit_target_stiffness_top",
        "fit_target_mass_back",
        "fit_target_stiffness_back",
        "fit_target_volume_air",
        "fit_target_area_hole_diam",
    ];
    function dofParamsFromLocation() {
        return (0, dof_parameter_input_policy_1.readDofParamsFromSearch)(window.location.search, Object.keys(DEFAULT_PARAMS));
    }
    function dofCardsRead() {
        return document.getElementById("dof_cards");
    }
    function simpleSourceAddButtonRead() {
        return document.getElementById("add_simple_source");
    }
    function simpleSourcesPanelAvailable() {
        return currentTaskMode === "edit" && currentOrder === 4;
    }
    function simpleSourcesClone(sources) {
        return sources.map((source) => ({ ...source }));
    }
    function simpleSourceNameRead(source, index) {
        const name = String(source.name || "").trim();
        return name || `Peak ${index + 1}`;
    }
    const SIMPLE_SOURCE_DEFAULT_SEMITONE_OFFSET = 3;
    const SIMPLE_SOURCE_FALLBACK_FREQUENCY_HZ = 200;
    function simpleSourceDefaultFrequencyRead() {
        const peaks = lastResponse ? (0, dof_peak_detection_1.modelPeaksFromResponse)(lastResponse) : null;
        const candidates = [
            peaks === null || peaks === void 0 ? void 0 : peaks.air,
            peaks === null || peaks === void 0 ? void 0 : peaks.top,
            peaks === null || peaks === void 0 ? void 0 : peaks.back,
            ...currentSimpleSources.sources.map((source) => source.frequencyHz),
        ].filter((frequency) => Number.isFinite(frequency !== null && frequency !== void 0 ? frequency : NaN));
        const highest = candidates.length
            ? Math.max(...candidates)
            : SIMPLE_SOURCE_FALLBACK_FREQUENCY_HZ;
        return simpleSourceValueRound(highest * Math.pow(2, SIMPLE_SOURCE_DEFAULT_SEMITONE_OFFSET / 12));
    }
    function simpleSourceDefaultRead(index) {
        return {
            id: `source_${index + 1}`,
            name: `Peak ${index + 1}`,
            frequencyHz: simpleSourceDefaultFrequencyRead(),
            q: 30,
            amplitudeM2PerKg: 0.1,
        };
    }
    function simpleSourceColorRead(sourceId) {
        const index = currentSimpleSources.sources.findIndex((source) => source.id === sourceId);
        return SIMPLE_SOURCE_COLORS[Math.max(index, 0) % SIMPLE_SOURCE_COLORS.length];
    }
    function simpleSourcesStateNormalize(value) {
        const sourceState = value && typeof value === "object" ? value : {};
        const sources = Array.isArray(sourceState.sources) ? sourceState.sources : [];
        return {
            enabled: Boolean(sourceState.enabled) && sources.length > 0,
            sources: sources.map((candidate, index) => {
                const defaultSource = simpleSourceDefaultRead(index);
                const valueFor = (key) => {
                    const value = Number(candidate[key]);
                    return Number.isFinite(value) ? value : defaultSource[key];
                };
                const amplitudeM2PerKgRead = () => {
                    const value = Number(candidate.amplitudeM2PerKg);
                    if (Number.isFinite(value))
                        return value;
                    // Legacy saved sources stored amplitude in cm²/g (1 cm²/g = 0.1 m²/kg).
                    const legacy = Number(candidate.amplitudeCm2PerG);
                    if (Number.isFinite(legacy))
                        return Math.round(legacy * 100) / 1000;
                    return defaultSource.amplitudeM2PerKg;
                };
                return {
                    id: String((candidate === null || candidate === void 0 ? void 0 : candidate.id) || defaultSource.id),
                    name: simpleSourceNameRead(candidate, index),
                    frequencyHz: valueFor("frequencyHz"),
                    q: valueFor("q"),
                    amplitudeM2PerKg: amplitudeM2PerKgRead(),
                };
            }),
        };
    }
    function simpleSourceInputBuild(source, field, label, type = "number") {
        const input = document.createElement("input");
        input.type = type;
        input.className = field === "name" ? "dof-simple-source-name" : "param-number";
        input.value = String(source[field]);
        input.dataset.simpleSourceId = source.id;
        input.dataset.simpleSourceField = field;
        input.setAttribute("aria-label", `${source.name} ${label}`);
        if (type === "number") {
            input.inputMode = "decimal";
            input.step = field === "amplitudeM2PerKg" ? "0.01" : "0.1";
            input.min = field === "q" ? "1" : field === "frequencyHz" ? "20" : "-2";
            input.max = field === "q" ? "200" : field === "frequencyHz" ? "1000" : "2";
        }
        input.addEventListener("input", () => simpleSourcesInputApply(input));
        input.addEventListener("change", () => simpleSourcesInputApply(input));
        return input;
    }
    function simpleSourceSliderFillSync(slider) {
        const minimum = Number(slider.min);
        const maximum = Number(slider.max);
        const value = Number(slider.value);
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum || !Number.isFinite(value))
            return;
        sliderPresentationSync(slider, 0, 0, ((value - minimum) / (maximum - minimum)) * 100, 0);
    }
    function simpleSourceNumericFieldBuild(source, label, field) {
        const row = document.createElement("div");
        row.className = "param-row";
        const caption = document.createElement("div");
        caption.className = "param-label";
        caption.textContent = label;
        const input = simpleSourceInputBuild(source, field, label);
        const slider = simpleSourceInputBuild(source, field, label);
        slider.type = "range";
        slider.className = "param-slider";
        slider.value = input.value;
        slider.addEventListener("input", () => {
            input.value = slider.value;
            simpleSourcesInputApply(slider);
            simpleSourceSliderFillSync(slider);
        });
        input.addEventListener("input", () => {
            if ((0, dof_parameter_input_policy_1.isDofUncommittedDecimalInput)(input.value))
                return;
            slider.value = input.value;
            simpleSourceSliderFillSync(slider);
        });
        const sliderStack = document.createElement("div");
        sliderStack.className = "param-slider-stack";
        sliderStack.append(slider);
        simpleSourceSliderFillSync(slider);
        row.append(caption, input, sliderStack);
        return row;
    }
    function simpleSourceCardBuild(source) {
        const card = document.createElement("article");
        card.className = "mode-card dof-simple-source-card";
        card.dataset.degree = "4";
        card.style.setProperty("--peak-color", simpleSourceColorRead(source.id));
        card.style.setProperty("--mode-dot", simpleSourceColorRead(source.id));
        const header = document.createElement("div");
        header.className = "dof-card-title";
        const title = document.createElement("div");
        title.className = "mode-label dof-simple-source-title";
        const swatch = document.createElement("span");
        swatch.className = "dof-simple-source-swatch";
        const nameInput = simpleSourceInputBuild(source, "name", "name", "text");
        title.append(swatch, nameInput);
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "Peak";
        badge.style.background = simpleSourceColorRead(source.id);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ghost-btn btn-small dof-simple-source-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => simpleSourceRemove(source.id));
        header.append(title, badge, remove);
        const fields = document.createElement("div");
        fields.className = "param-grid";
        [
            ["Frequency (Hz)", "frequencyHz"],
            ["Q", "q"],
            ["Amplitude (m²/kg)", "amplitudeM2PerKg"],
        ].forEach(([label, field]) => {
            fields.appendChild(simpleSourceNumericFieldBuild(source, label, field));
        });
        card.append(header, fields);
        return card;
    }
    function simpleSourceCardsAppend(container) {
        if (!simpleSourcesPanelAvailable())
            return;
        currentSimpleSources.sources.forEach((source) => container.appendChild(simpleSourceCardBuild(source)));
    }
    function simpleSourceCardsSync() {
        document.querySelectorAll(".dof-simple-source-card").forEach((card) => card.remove());
        const cards = dofCardsRead();
        if (cards)
            simpleSourceCardsAppend(cards);
    }
    function simpleSourcesInputApply(input) {
        const source = currentSimpleSources.sources.find((candidate) => candidate.id === input.dataset.simpleSourceId);
        const field = input.dataset.simpleSourceField;
        if (!source || !field || field === "id")
            return;
        if (field === "name") {
            source.name = input.value;
            scheduleRender();
            return;
        }
        if ((0, dof_parameter_input_policy_1.isDofUncommittedDecimalInput)(input.value))
            return;
        const value = Number(input.value);
        if (!Number.isFinite(value))
            return;
        source[field] = value;
        scheduleRender();
    }
    function simpleSourceCardsInputSync(source) {
        document.querySelectorAll(`[data-simple-source-id="${source.id}"]`).forEach((input) => {
            const field = input.dataset.simpleSourceField;
            if (!field || field === "id")
                return;
            input.value = String(source[field]);
            if (input.type === "range")
                simpleSourceSliderFillSync(input);
        });
    }
    function simpleSourceAdd() {
        if (currentOrder !== 4)
            return;
        if (currentTaskMode !== "edit")
            setTaskMode("edit");
        currentSimpleSources.sources.push(simpleSourceDefaultRead(currentSimpleSources.sources.length));
        currentSimpleSources.enabled = true;
        buildCards();
        scheduleRender();
    }
    function simpleSourceRemove(sourceId) {
        currentSimpleSources.sources = currentSimpleSources.sources.filter((source) => source.id !== sourceId);
        currentSimpleSources.enabled = currentSimpleSources.sources.length > 0;
        buildCards();
        scheduleRender();
    }
    function simpleSourcesPanelSync() {
        const addButton = simpleSourceAddButtonRead();
        if (addButton)
            addButton.disabled = currentOrder !== 4;
        simpleSourceCardsSync();
    }
    function simpleSourcesBind() {
        var _a;
        (_a = simpleSourceAddButtonRead()) === null || _a === void 0 ? void 0 : _a.addEventListener("click", simpleSourceAdd);
        simpleSourcesPanelSync();
    }
    function simpleSourcesStateRead() {
        return {
            enabled: currentSimpleSources.enabled,
            sources: simpleSourcesClone(currentSimpleSources.sources),
        };
    }
    function simpleSourcesStateApply(value) {
        currentSimpleSources = simpleSourcesStateNormalize(value);
        simpleSourcesPanelSync();
    }
    function simpleSourcesActive() {
        return simpleSourcesPanelAvailable() && currentSimpleSources.enabled && currentSimpleSources.sources.length > 0;
    }
    function getPlotly() {
        if (plotlyRef)
            return plotlyRef;
        const ref = window.Plotly;
        plotlyRef = ref || null;
        return plotlyRef;
    }
    function updateParam(param, value) {
        if (Number.isFinite(value)) {
            currentParams[param] = (0, dof_parameter_input_policy_1.dofDisplayValueToInternal)(param, value);
            scheduleRender();
        }
    }
    function updateParamFromCommittedInput(param, input, slider) {
        if ((0, dof_parameter_input_policy_1.isDofUncommittedDecimalInput)(input.value))
            return;
        const value = parseFloat(input.value);
        if (Number.isFinite(value))
            slider.value = String(value);
        updateParam(param, value);
    }
    function commitParamInput(param, input, slider) {
        const value = parseFloat(input.value);
        if (Number.isFinite(value)) {
            input.value = String(value);
            slider.value = String(value);
        }
        updateParam(param, value);
    }
    function tokenColor(token, fallbackToken = "--ink") {
        const styles = getComputedStyle(document.documentElement);
        return styles.getPropertyValue(token).trim()
            || styles.getPropertyValue(fallbackToken).trim()
            || "currentColor";
    }
    function plotThemeColors() {
        const blue = tokenColor("--blue");
        const green = tokenColor("--green");
        const purple = tokenColor("--purple");
        const yellow = tokenColor("--yellow");
        const orange = tokenColor("--orange");
        const ink = tokenColor("--ink");
        return {
            current: blue,
            top: blue,
            air: purple,
            back: green,
            sides: yellow,
            whatIf: (0, dof_display_format_1.colorWithAlpha)(orange, 0.9),
            ink,
            grid: (0, dof_display_format_1.colorWithAlpha)(ink, 0.08),
        };
    }
    function cssPercentValue(value) {
        return `${value}%`;
    }
    function cssPixelValue(value) {
        return `${value}px`;
    }
    function styleVariableWrite(element, name, value) {
        element.style.setProperty(name, value);
    }
    function stylePercentVariableWrite(element, name, value) {
        styleVariableWrite(element, name, cssPercentValue(value));
    }
    function stylePixelVariableWrite(element, name, value) {
        styleVariableWrite(element, name, cssPixelValue(value));
    }
    function sliderStackElementRead(slider) {
        return slider.parentElement;
    }
    function sliderPresentationSync(slider, start, end, baseFill, overlayFill) {
        const sliderStack = sliderStackElementRead(slider);
        if (!sliderStack)
            return;
        stylePercentVariableWrite(sliderStack, "--param-slider-fill-end", baseFill);
        stylePercentVariableWrite(sliderStack, "--param-overlay-start", start);
        stylePercentVariableWrite(sliderStack, "--param-overlay-end", end);
        stylePercentVariableWrite(sliderStack, "--param-overlay-width", Math.max(0, end - start));
        stylePercentVariableWrite(sliderStack, "--param-overlay-fill", overlayFill);
    }
    function buildCards() {
        const container = dofCardsRead();
        if (!container)
            return;
        (0, dof_task_cards_1.restoreDofFitTaskControls)(document, fitPanelSection(), fitTaskControlGridRead(), FIT_TASK_CARD_DEFS);
        solveTaskControlsRestoreHome();
        container.innerHTML = "";
        if (currentTaskMode === "fit") {
            (0, dof_task_cards_1.buildDofTaskCards)(document, container, FIT_TASK_CARD_DEFS);
            return;
        }
        if (currentTaskMode === "solve") {
            (0, dof_task_cards_1.buildDofTaskCards)(document, container, SOLVE_TASK_CARD_DEFS);
            return;
        }
        cardDefsForTaskMode(currentTaskMode).forEach((card) => {
            const cardEl = document.createElement("div");
            cardEl.className = `mode-card mode-${card.key}`;
            cardEl.dataset.degree = String(card.degree);
            if (isModeKey(card.key))
                cardEl.dataset.mode = card.key;
            const title = document.createElement("div");
            title.className = "dof-card-title";
            const badge = card.badgeText || `DOF ${card.degree}`;
            const aliasInline = card.alias ? `<span class="mode-label-alias">${card.alias}</span>` : "";
            title.innerHTML = `<div class="mode-label">${card.label}${aliasInline}</div><span class="badge" style="background:${card.color};">${badge}</span>`;
            cardEl.appendChild(title);
            if (isModeKey(card.key)) {
                const modeKey = card.key;
                const meta = document.createElement("div");
                meta.className = "mode-meta";
                const freqRow = document.createElement("div");
                freqRow.className = "mode-value-row";
                const freqValue = document.createElement("div");
                freqValue.className = "mode-value";
                freqValue.textContent = "--";
                const freqUnit = document.createElement("span");
                freqUnit.className = "mode-unit";
                freqUnit.textContent = "Hz";
                freqRow.append(freqValue, freqUnit);
                const noteRow = document.createElement("div");
                noteRow.className = "mode-note";
                const noteName = document.createElement("span");
                noteName.className = "mode-note-name";
                noteName.textContent = "--";
                const noteCents = document.createElement("span");
                noteCents.className = "mode-note-cents";
                noteCents.textContent = "--";
                noteRow.append(noteName, noteCents);
                const whatIfRow = document.createElement("div");
                whatIfRow.className = "mode-whatif-row";
                whatIfRow.style.display = "none";
                const whatIfLabel = document.createElement("span");
                whatIfLabel.className = "mode-whatif-label";
                whatIfLabel.textContent = "Target";
                const whatIfValue = document.createElement("span");
                whatIfValue.className = "mode-whatif-value";
                whatIfValue.textContent = "--";
                const whatIfDelta = document.createElement("span");
                whatIfDelta.className = "mode-whatif-delta";
                whatIfDelta.textContent = "";
                whatIfRow.append(whatIfLabel, whatIfValue, whatIfDelta);
                const whatIfNoteRow = document.createElement("div");
                whatIfNoteRow.className = "mode-whatif-note";
                whatIfNoteRow.style.display = "none";
                const whatIfNoteName = document.createElement("span");
                whatIfNoteName.className = "mode-whatif-note-name";
                whatIfNoteName.textContent = "--";
                const whatIfNoteCents = document.createElement("span");
                whatIfNoteCents.className = "mode-whatif-note-cents";
                whatIfNoteCents.textContent = "--";
                whatIfNoteRow.append(whatIfNoteName, whatIfNoteCents);
                meta.append(freqRow, noteRow, whatIfRow, whatIfNoteRow);
                cardEl.appendChild(meta);
                modeCardEls[modeKey] = {
                    root: cardEl,
                    freqValue,
                    noteName,
                    noteCents,
                    whatIfRow,
                    whatIfValue,
                    whatIfDelta,
                    whatIfNoteRow,
                    whatIfNoteName,
                    whatIfNoteCents,
                };
            }
            const grid = document.createElement("div");
            grid.className = "param-grid";
            card.fields.forEach((field) => {
                const row = document.createElement("div");
                row.className = "param-row";
                const label = document.createElement("div");
                label.className = "param-label";
                label.textContent = field.label;
                const input = document.createElement("input");
                input.type = "number";
                input.className = "param-number";
                input.step = field.step != null ? String(field.step) : "any";
                if (field.min != null)
                    input.min = String(field.min);
                if (field.max != null)
                    input.max = String(field.max);
                input.value = String((0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(field.param, currentParams[field.param]));
                input.dataset.param = field.param;
                const slider = document.createElement("input");
                slider.type = "range";
                slider.className = "param-slider";
                if (field.min != null)
                    slider.min = String(field.min);
                if (field.max != null)
                    slider.max = String(field.max);
                slider.step = field.step != null ? String(field.step) : "any";
                slider.value = input.value;
                slider.dataset.param = field.param;
                input.addEventListener("input", () => {
                    updateParamFromCommittedInput(field.param, input, slider);
                    syncOverlayToBase(field.param);
                    updateOverlayLatch(field.param);
                });
                input.addEventListener("change", () => {
                    commitParamInput(field.param, input, slider);
                    syncOverlayToBase(field.param);
                    updateOverlayLatch(field.param);
                });
                slider.addEventListener("input", (event) => {
                    const val = parseFloat(event.target.value);
                    if (Number.isFinite(val))
                        input.value = String(val);
                    updateParam(field.param, val);
                    syncOverlayToBase(field.param);
                    updateOverlayLatch(field.param);
                });
                const sliderWrap = document.createElement("div");
                sliderWrap.className = "param-slider-stack";
                sliderWrap.appendChild(slider);
                const overlay = document.createElement("input");
                overlay.type = "range";
                overlay.className = "param-slider param-slider-overlay";
                if (field.min != null)
                    overlay.min = String(field.min);
                if (field.max != null)
                    overlay.max = String(field.max);
                overlay.step = field.step != null ? String(field.step) : "any";
                overlay.value = input.value;
                overlay.dataset.param = field.param;
                overlay.addEventListener("input", () => {
                    updateOverlayLatch(field.param);
                    scheduleRender();
                });
                sliderWrap.appendChild(overlay);
                const deltaBar = document.createElement("div");
                deltaBar.className = "param-slider-delta";
                sliderWrap.appendChild(deltaBar);
                const glowDot = document.createElement("div");
                glowDot.className = "param-slider-glow";
                sliderWrap.appendChild(glowDot);
                const whatIfRow = document.createElement("div");
                whatIfRow.className = "param-whatif-row";
                const whatIfValue = document.createElement("span");
                whatIfValue.className = "param-whatif-value";
                whatIfValue.textContent = "--";
                const whatIfDelta = document.createElement("span");
                whatIfDelta.className = "param-whatif-delta";
                whatIfDelta.textContent = "";
                whatIfRow.append(whatIfValue, whatIfDelta);
                paramInputs[field.param] = input;
                paramSliders[field.param] = slider;
                overlaySliders[field.param] = overlay;
                paramDeltaBars[field.param] = deltaBar;
                paramGlowDots[field.param] = glowDot;
                paramWhatIfRows[field.param] = whatIfRow;
                paramWhatIfValues[field.param] = whatIfValue;
                paramWhatIfDeltas[field.param] = whatIfDelta;
                row.append(label, input, sliderWrap, whatIfRow);
                grid.appendChild(row);
            });
            cardEl.appendChild(grid);
            container.appendChild(cardEl);
        });
        simpleSourceCardsAppend(container);
        applyCardVisibility();
    }
    function applyCardVisibility() {
        if (currentTaskMode !== "edit")
            return;
        const cards = document.querySelectorAll(".mode-card");
        cards.forEach((card) => {
            const degree = Number(card.dataset.degree || 4);
            card.classList.toggle("card-hidden", degree > currentOrder);
        });
    }
    function getActiveModes() {
        if (currentOrder <= 1)
            return ["air"];
        if (currentOrder === 2)
            return ["air", "top"];
        return ["air", "top", "back"];
    }
    function isModeKey(key) {
        return key === "air" || key === "top" || key === "back";
    }
    function isWhatIfEnabled() {
        const toggle = document.getElementById("toggle_overlay");
        return Boolean(toggle === null || toggle === void 0 ? void 0 : toggle.checked);
    }
    function hasActiveOverlays() {
        return overlayLatched.size > 0;
    }
    function syncOverlayToBase(param) {
        const overlay = overlaySliders[param];
        if (!overlay || overlayLatched.has(param))
            return;
        const baseValue = (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(param, currentParams[param]);
        if (Number.isFinite(baseValue))
            overlay.value = String(baseValue);
    }
    function updateOverlayLatch(param) {
        const slider = paramSliders[param];
        const overlay = overlaySliders[param];
        const deltaBar = paramDeltaBars[param];
        const glowDot = paramGlowDots[param];
        const whatIfRow = paramWhatIfRows[param];
        const whatIfValue = paramWhatIfValues[param];
        const whatIfDelta = paramWhatIfDeltas[param];
        if (!slider || !overlay)
            return;
        const baseValue = (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(param, currentParams[param]);
        const overlayValue = parseFloat(overlay.value);
        const presentation = (0, dof_display_format_1.buildDofOverlayPresentation)({
            baseSlider: slider,
            overlaySlider: overlay,
            baseValue,
            overlayValue,
            showWhatIf: isWhatIfEnabled(),
        });
        if (presentation.isActive)
            overlayLatched.add(param);
        else
            overlayLatched.delete(param);
        overlay.classList.toggle("overlay-active", presentation.isActive);
        sliderPresentationSync(slider, presentation.start, presentation.end, presentation.baseFill, presentation.overlayFill);
        if (deltaBar) {
            deltaBar.classList.toggle("active", presentation.deltaBarActive);
        }
        if (glowDot) {
            glowDot.classList.toggle("active", presentation.isActive);
        }
        if (whatIfRow && whatIfValue && whatIfDelta) {
            whatIfRow.classList.toggle("active", presentation.whatIfActive);
            whatIfValue.textContent = presentation.overlayValueText;
            whatIfDelta.textContent = presentation.delta == null
                ? ""
                : (0, dof_mode_card_presentation_1.formatDofSigned)(presentation.delta, presentation.deltaDigits);
        }
    }
    function refreshOverlayVisuals() {
        Object.keys(overlaySliders).forEach((key) => {
            updateOverlayLatch(key);
        });
    }
    function resetWhatIf() {
        overlayLatched.clear();
        Object.keys(overlaySliders).forEach((key) => {
            const param = key;
            const overlay = overlaySliders[param];
            if (!overlay)
                return;
            const baseValue = (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(param, currentParams[param]);
            if (Number.isFinite(baseValue))
                overlay.value = String(baseValue);
            overlay.classList.remove("overlay-active");
        });
        refreshOverlayVisuals();
        lastWhatIfResponse = null;
        updateModeCards(lastResponse, null);
        whatIfSummarySet(null);
    }
    function resetWhatIfComparison() {
        const toggle = document.getElementById("toggle_overlay");
        if (!(toggle === null || toggle === void 0 ? void 0 : toggle.checked)) {
            resetWhatIf();
            return;
        }
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change"));
    }
    function getWhatIfParams() {
        if (!isWhatIfEnabled() || !hasActiveOverlays())
            return null;
        const out = { ...currentParams };
        overlayLatched.forEach((param) => {
            const overlay = overlaySliders[param];
            if (!overlay)
                return;
            const value = parseFloat(overlay.value);
            if (!Number.isFinite(value))
                return;
            out[param] = (0, dof_parameter_input_policy_1.dofDisplayValueToInternal)(param, value);
        });
        return out;
    }
    function computeResponseForParams(raw) {
        return computeResponseSafe(adaptParamsToSolver(raw));
    }
    function getDragLockResponse(useWhatIf) {
        if (useWhatIf) {
            const whatParams = getWhatIfParams() || currentParams;
            return lastWhatIfResponse || computeResponseForParams(whatParams);
        }
        return lastResponse || computeResponseForParams(currentParams);
    }
    function updateModeCards(baseResponse = lastResponse, whatIfResponse = lastWhatIfResponse) {
        const basePeaks = baseResponse ? (0, dof_peak_detection_1.modelPeaksFromResponse)(baseResponse) : null;
        const whatIfPeaks = whatIfResponse ? (0, dof_peak_detection_1.modelPeaksFromResponse)(whatIfResponse) : null;
        MODE_KEYS.forEach((mode) => {
            const els = modeCardEls[mode];
            if (!els)
                return;
            const presentation = (0, dof_mode_card_presentation_1.buildDofModeCardPresentation)({
                mode,
                basePeaks,
                whatIfPeaks,
                drag: {
                    mode: dragState.mode,
                    frequency: dragState.freq,
                    useWhatIf: dragUseWhatIf,
                },
            });
            (0, dof_mode_card_presentation_1.applyDofModeCardPresentation)(els, presentation);
        });
    }
    function syncCardInputs() {
        Object.entries(paramInputs).forEach(([key, input]) => {
            const param = key;
            const next = (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(param, currentParams[param]);
            if (Number.isFinite(next)) {
                input.value = String(next);
                const slider = paramSliders[param];
                if (slider)
                    slider.value = String(next);
            }
            syncOverlayToBase(param);
            updateOverlayLatch(param);
        });
        fitAltitudeControlSync();
    }
    function fitAltitudeControlSync() {
        const slider = document.getElementById("fit_altitude");
        const value = document.getElementById("fit_altitude_value");
        if (!slider || !value)
            return;
        const altitude = (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)("altitude", currentParams.altitude);
        if (!Number.isFinite(altitude))
            return;
        slider.value = String(altitude);
        value.textContent = `${Math.round(altitude)} m`;
    }
    function fitAltitudeControlBind() {
        const slider = document.getElementById("fit_altitude");
        if (!slider)
            return;
        fitAltitudeControlSync();
        slider.addEventListener("input", () => {
            const altitude = parseFloat(slider.value);
            if (!Number.isFinite(altitude))
                return;
            updateParam("altitude", altitude);
            fitAltitudeControlSync();
        });
    }
    function setOrder(order) {
        currentOrder = order;
        currentParams.model_order = order;
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            const isActive = Number(btn.dataset.order) === order;
            btn.classList.toggle("tab-btn-active", isActive);
        });
        applyCardVisibility();
        simpleSourcesPanelSync();
        scheduleRender();
    }
    function taskModeCopyRead(mode) {
        return TASK_MODE_COPY[mode];
    }
    function taskModeCopyApply(mode) {
        const copy = taskModeCopyRead(mode);
        const cardsTitle = document.getElementById("dof_cards_title");
        const cardsCopy = document.getElementById("dof_cards_copy");
        if (cardsTitle)
            cardsTitle.textContent = copy.cardsTitle;
        if (cardsCopy)
            cardsCopy.textContent = copy.cardsCopy;
    }
    function fitPanelSection() {
        return document.getElementById("dof_fit_panel");
    }
    function solvePanelSection() {
        return document.getElementById("dof_solve_panel");
    }
    function setTaskMode(mode) {
        currentTaskMode = mode;
        document.querySelectorAll("[data-task-mode]").forEach((btn) => {
            const isActive = String(btn.dataset.taskMode || "") === mode;
            btn.classList.toggle("task-tab-btn-active", isActive);
        });
        taskModeCopyApply(mode);
        buildCards();
        simpleSourcesPanelSync();
    }
    function scheduleRender() {
        dofPerTabSessionPersist();
        if (pendingRender !== null)
            cancelAnimationFrame(pendingRender);
        pendingRender = requestAnimationFrame(() => {
            pendingRender = null;
            dofRenderExecute();
        });
    }
    function dofPipelineEnabledRead() {
        return Boolean(window.DofPipelineEnabled);
    }
    function dofPipelineEmitBuild() {
        return (event) => {
            console.info("[DOF Pipeline]", event.eventType, event.stageId || "-", event.payload || {});
        };
    }
    function dofPipelineRunnerRead() {
        return window.DofPipelineRunner;
    }
    function dofRenderExecute() {
        if (!dofPipelineEnabledRead()) {
            renderPlot();
            return;
        }
        const runner = dofPipelineRunnerRead();
        if (!(runner === null || runner === void 0 ? void 0 : runner.run)) {
            renderPlot();
            return;
        }
        void runner.run({ trigger: "render.schedule" }, { useStageList: true, stages: ["refresh"] }, dofPipelineEmitBuild());
    }
    function sharedDofSolverAdapterRead() {
        const adapter = window.dof_solver_adapter;
        if (!adapter)
            return null;
        const adapt = adapter.adaptParamsToSolver;
        const compute = adapter.computeResponseSafe;
        if (typeof adapt !== "function" || typeof compute !== "function")
            return null;
        return { adaptParamsToSolver: adapt, computeResponseSafe: compute };
    }
    function computeResponseSafeLegacy(params) {
        return (0, dof_legacy_solver_1.computeDofLegacyResponse)(window, params);
    }
    function adaptParamsToSolverLegacy(raw) {
        return (0, dof_legacy_solver_1.adaptDofLegacyParams)(window, raw);
    }
    function computeResponseSafe(params) {
        const sharedAdapter = sharedDofSolverAdapterRead();
        if (sharedAdapter)
            return sharedAdapter.computeResponseSafe(params);
        return computeResponseSafeLegacy(params);
    }
    function adaptParamsToSolver(raw) {
        const sharedAdapter = sharedDofSolverAdapterRead();
        if (sharedAdapter)
            return sharedAdapter.adaptParamsToSolver(raw);
        return adaptParamsToSolverLegacy(raw);
    }
    function simpleSourcesCombinedResponseRead(solverParams, frequencyStartHz, frequencyEndHz) {
        var _a;
        const solverCore = window.SolverCore;
        const pressureAtFrequency = solverCore === null || solverCore === void 0 ? void 0 : solverCore.computeFourDofPressuresAtFrequency;
        if (typeof pressureAtFrequency !== "function")
            return null;
        return (0, dof_simple_sources_1.simpleSourcesCombinedResponseSeries)(currentSimpleSources.sources, (frequencyHz) => pressureAtFrequency(solverParams, frequencyHz).total, {
            airDensityKgPerM3: solverParams.air_density,
            driveForceN: solverParams.driving_force,
            frequencyStartHz,
            frequencyEndHz,
            pressureReferencePa: (_a = solverCore.constants) === null || _a === void 0 ? void 0 : _a.pref,
            stepHz: 0.1,
        });
    }
    function simpleSourceResponseRead(source, solverParams, frequencyStartHz, frequencyEndHz) {
        var _a;
        const solverCore = window.SolverCore;
        const pressureAtFrequency = solverCore === null || solverCore === void 0 ? void 0 : solverCore.computeFourDofPressuresAtFrequency;
        if (typeof pressureAtFrequency !== "function")
            return null;
        return (0, dof_simple_sources_1.simpleSourcesCombinedResponseSeries)([source], (frequencyHz) => pressureAtFrequency(solverParams, frequencyHz).total, {
            airDensityKgPerM3: solverParams.air_density,
            driveForceN: solverParams.driving_force,
            frequencyStartHz,
            frequencyEndHz,
            pressureReferencePa: (_a = solverCore.constants) === null || _a === void 0 ? void 0 : _a.pref,
            stepHz: 0.1,
        });
    }
    function sharedSeriesSamplerRead() {
        const sampler = window.series_sampling;
        const sample = sampler === null || sampler === void 0 ? void 0 : sampler.seriesValueSampleAtFrequency;
        if (typeof sample !== "function")
            return null;
        return { seriesValueSampleAtFrequency: sample };
    }
    function clampToBounds(id, value) {
        const bounds = FIT_BOUNDS[id];
        if (!bounds || !Number.isFinite(value))
            return value;
        return Math.max(bounds.min, Math.min(bounds.max, value));
    }
    function sampleSeriesAtFreq(series, freq) {
        const sharedSampler = sharedSeriesSamplerRead();
        if (sharedSampler)
            return sharedSampler.seriesValueSampleAtFrequency(series, freq);
        return (0, dof_series_sampling_1.sampleDofSeriesAtFrequency)(series, freq);
    }
    function fit4DofFromTargets(targets, opts = {}) {
        return (0, dof_target_fit_1.fitDofFromTargets)(targets, opts, {
            defaultParams: DEFAULT_PARAMS,
            defaultTweakIds: SOLVE_TWEAK_IDS,
            clampToBounds,
            computeResponse: computeResponseSafe,
            adaptParams: adaptParamsToSolver,
            peaksFromResponse: dof_peak_detection_1.modelPeaksFromResponse,
        });
    }
    function targetOverlaySharedBuilderRead() {
        const shared = window.overlay_segments;
        const buildShared = shared === null || shared === void 0 ? void 0 : shared.overlaySegmentsBuildFromPoints;
        return typeof buildShared === "function" ? buildShared : undefined;
    }
    function buildTargetOverlayTraces(points, color) {
        return (0, dof_plot_data_1.buildDofTargetOverlayTraces)(points, color, TARGET_OVERLAY, dof_display_format_1.colorWithAlpha, targetOverlaySharedBuilderRead());
    }
    function simpleSourceCalloutTextRead(source) {
        return (0, dof_plot_callouts_1.calloutTextBuild)(simpleSourceNameRead(source, 0), source.frequencyHz, `Q ${source.q.toFixed(0)}, Amplitude ${(0, dof_mode_card_presentation_1.formatDofSigned)(source.amplitudeM2PerKg, 2)} m²/kg`);
    }
    function ensureSimpleSourceThumb(source) {
        if (simpleSourceThumbEls[source.id])
            return simpleSourceThumbEls[source.id];
        const overlay = document.getElementById("plot_overlay");
        if (!overlay)
            return null;
        const entry = (0, dof_plot_callouts_1.calloutBuild)(overlay, {
            color: simpleSourceColorRead(source.id),
            dataset: { sourceId: source.id },
            extraClassName: "dof-simple-source-thumb",
            onPointerDown: handleSimpleSourceThumbPointerDown,
        });
        simpleSourceThumbEls[source.id] = entry;
        return entry;
    }
    function simpleSourceThumbsUpdate(series, axes) {
        const sources = simpleSourcesActive() ? currentSimpleSources.sources : [];
        const activeSourceIds = new Set(sources.map((source) => source.id));
        Object.entries(simpleSourceThumbEls).forEach(([sourceId, thumb]) => {
            thumb.root.classList.toggle("thumb-hidden", !activeSourceIds.has(sourceId));
        });
        sources.forEach((source) => {
            const thumb = ensureSimpleSourceThumb(source);
            if (!thumb)
                return;
            positionThumb(thumb, source.frequencyHz, sampleSeriesAtFreq(series, source.frequencyHz), axes);
            thumb.root.style.setProperty("--thumb-color", simpleSourceColorRead(source.id));
            (0, dof_plot_callouts_1.calloutTextApply)(thumb, simpleSourceCalloutTextRead(source));
        });
    }
    function simpleSourcesTraceBuild(series) {
        if (!simpleSourcesActive() || series.length === 0)
            return null;
        const sources = currentSimpleSources.sources;
        return {
            x: sources.map((source) => source.frequencyHz),
            y: sources.map((source) => sampleSeriesAtFreq(series, source.frequencyHz)),
            mode: "markers",
            name: "Simple sources",
            showlegend: false,
            marker: {
                color: sources.map((source) => simpleSourceColorRead(source.id)),
                size: 11,
                line: { color: "rgba(255,255,255,0.72)", width: 1 },
            },
            customdata: sources.map((source) => [
                simpleSourceNameRead(source, 0),
                source.q.toFixed(0),
                (0, dof_mode_card_presentation_1.formatDofSigned)(source.amplitudeM2PerKg, 2),
            ]),
            hovertemplate: "%{customdata[0]}<br><b>%{x:.1f} Hz</b><br>Q %{customdata[1]} · Amplitude %{customdata[2]} m²/kg<extra>Response peak</extra>",
        };
    }
    function simpleSourceComponentTracesRead(solverParams, frequencyStartHz, frequencyEndHz) {
        if (!simpleSourcesActive())
            return [];
        return currentSimpleSources.sources.flatMap((source) => {
            const response = simpleSourceResponseRead(source, solverParams, frequencyStartHz, frequencyEndHz);
            if (!response)
                return [];
            const trace = (0, dof_plot_data_1.buildDofTrace)(response, simpleSourceNameRead(source, 0), simpleSourceColorRead(source.id), { width: 1.25, dash: "dot" });
            if (!trace)
                return [];
            trace.showlegend = false;
            return [trace];
        });
    }
    function ensureThumb(mode) {
        if (thumbEls[mode])
            return thumbEls[mode];
        const overlay = document.getElementById("plot_overlay");
        if (!overlay)
            return null;
        const entry = (0, dof_plot_callouts_1.calloutBuild)(overlay, {
            color: MODE_META[mode].color,
            dataset: { mode },
            onPointerDown: handleThumbPointerDown,
        });
        thumbEls[mode] = entry;
        return entry;
    }
    function positionThumb(thumb, freq, db, axes) {
        if (!Number.isFinite(freq) || !Number.isFinite(db)) {
            thumb.root.classList.add("thumb-hidden");
            return;
        }
        const x = axes.xaxis.l2p(freq) + (axes.xaxis._offset || 0);
        const y = axes.yaxis.l2p(db) + (axes.yaxis._offset || 0);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            thumb.root.classList.add("thumb-hidden");
            return;
        }
        thumb.root.classList.remove("thumb-hidden");
        stylePixelVariableWrite(thumb.root, "--thumb-x", x);
        stylePixelVariableWrite(thumb.root, "--thumb-y", y);
    }
    function updateThumbs(response = lastResponse) {
        var _a, _b;
        const plotEl = document.getElementById("plot_dof");
        const overlay = document.getElementById("plot_overlay");
        if (!plotEl || !overlay)
            return;
        const axes = (0, dof_plot_pointer_1.readDofPlotAxes)(plotEl);
        const activeResponse = isWhatIfEnabled() && ((_a = lastWhatIfResponse === null || lastWhatIfResponse === void 0 ? void 0 : lastWhatIfResponse.total) === null || _a === void 0 ? void 0 : _a.length)
            ? lastWhatIfResponse
            : response;
        if (!axes || !((_b = activeResponse === null || activeResponse === void 0 ? void 0 : activeResponse.total) === null || _b === void 0 ? void 0 : _b.length)) {
            Object.values(thumbEls).forEach((thumb) => {
                if (thumb)
                    thumb.root.classList.add("thumb-hidden");
            });
            Object.values(simpleSourceThumbEls).forEach((thumb) => thumb.root.classList.add("thumb-hidden"));
            updateModeCards(response, lastWhatIfResponse);
            return;
        }
        const peaks = (0, dof_peak_detection_1.modelPeaksFromResponse)(activeResponse) || { air: null, top: null, back: null };
        const activeModes = getActiveModes();
        ["air", "top", "back"].forEach((mode) => {
            const thumb = ensureThumb(mode);
            if (!thumb)
                return;
            const isActive = activeModes.includes(mode);
            thumb.root.classList.toggle("thumb-hidden", !isActive);
            if (!isActive)
                return;
            let freq = dragState.mode === mode && Number.isFinite(dragState.freq) ? dragState.freq : peaks[mode];
            if (!Number.isFinite(freq)) {
                const band = dof_peak_detection_1.DOF_MODE_BANDS[mode];
                freq = (band.low + band.high) / 2;
            }
            const db = sampleSeriesAtFreq(activeResponse.total, freq);
            positionThumb(thumb, freq, db, axes);
            (0, dof_plot_callouts_1.calloutTextApply)(thumb, (0, dof_plot_callouts_1.calloutTextBuild)(MODE_META[mode].label, freq));
            thumb.root.classList.toggle("dragging", dragState.mode === mode);
        });
        simpleSourceThumbsUpdate(lastDisplayedResponse || activeResponse.total, axes);
        updateModeCards(response, lastWhatIfResponse);
    }
    function applyWhatIfParams(raw) {
        if (!isWhatIfEnabled())
            return;
        SOLVE_TWEAK_IDS.forEach((id) => {
            const overlay = overlaySliders[id];
            if (!overlay || !Number.isFinite(raw[id]))
                return;
            const displayValue = (0, dof_parameter_input_policy_1.dofInternalValueToDisplay)(id, raw[id]);
            if (!Number.isFinite(displayValue))
                return;
            overlay.value = String(displayValue);
            updateOverlayLatch(id);
        });
        scheduleRender();
    }
    function solveTargets(targets, opts = {}) {
        const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
        const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
        const fit = fit4DofFromTargets(targets, {
            maxIter: 12,
            tweakIds: opts.tweakIds || Array.from(SOLVE_TWEAK_IDS),
            baseParams: { ...baseParams },
            factorAllowed: opts.factorAllowed,
        });
        if (fit === null || fit === void 0 ? void 0 : fit.raw) {
            if (useWhatIf) {
                applyWhatIfParams(fit.raw);
            }
            else {
                currentParams = { ...currentParams, ...fit.raw };
                syncCardInputs();
                scheduleRender();
            }
        }
    }
    function fitTargetsFromInputs() {
        return (0, dof_fit_input_policy_1.buildDofFitInputTargets)(readDofInputValue, dof_parameter_input_policy_1.dofDisplayValueToInternal);
    }
    function fitTargetsHaveAnyValue(targets) {
        return (0, dof_fit_input_policy_1.dofFitTargetsHaveAnyValue)(targets);
    }
    function fitSolveTweakIdsFromTargets(targets) {
        return (0, dof_fit_input_policy_1.dofFitSolveTweakIdsFromTargets)(targets);
    }
    function fitRecipeRestrictSimpleEnabled() {
        const toggle = document.getElementById("fit_restrict_simple");
        return Boolean(toggle === null || toggle === void 0 ? void 0 : toggle.checked);
    }
    function fitRecipeRestrictedTweakIds() {
        return (0, dof_fit_input_policy_1.readDofRestrictedTweakIds)();
    }
    function fitRecipeIncreaseOnlyFactorAllowed(id, factor) {
        return (0, dof_fit_input_policy_1.dofFitIncreaseOnlyFactorAllowed)(id, factor);
    }
    function fitStatusSet(message) {
        const status = document.getElementById("fit_status");
        if (!status)
            return;
        status.textContent = message;
    }
    function whatIfSummarySet(lines) {
        const panel = document.getElementById("whatif_summary");
        if (!panel)
            return;
        const body = panel.querySelector(".delta-summary__body");
        if (!body)
            return;
        if (!lines || !lines.length) {
            body.textContent = "Run Solve Targets to see suggested adjustments.";
            return;
        }
        body.innerHTML = `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
    }
    function whatIfToggleEnsureEnabled() {
        const toggle = document.getElementById("toggle_overlay");
        if (!toggle)
            return false;
        if (toggle.checked)
            return true;
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change"));
        return true;
    }
    function whatIfSummaryRefreshFromCurrentRecipe() {
        var _a, _b;
        const recipeParams = getWhatIfParams();
        const lines = (_b = (_a = window.buildWhatIfRecipeSummaryLines) === null || _a === void 0 ? void 0 : _a.call(window, currentParams, recipeParams)) !== null && _b !== void 0 ? _b : null;
        whatIfSummarySet(lines);
    }
    function solveRecipeTargetsFromFitInputs() {
        const targets = fitTargetsFromInputs();
        const hasTarget = fitTargetsHaveAnyValue(targets);
        if (!hasTarget) {
            fitStatusSet("Enter at least one target frequency.");
            return;
        }
        if (!whatIfToggleEnsureEnabled()) {
            fitStatusSet("Compare mode is unavailable.");
            return;
        }
        const restrictSimple = fitRecipeRestrictSimpleEnabled();
        solveTargets(targets, {
            useWhatIf: true,
            tweakIds: restrictSimple ? fitRecipeRestrictedTweakIds() : fitSolveTweakIdsFromTargets(targets),
            factorAllowed: restrictSimple ? fitRecipeIncreaseOnlyFactorAllowed : undefined,
        });
        whatIfSummaryRefreshFromCurrentRecipe();
        fitStatusSet("Solve Targets applied as a What-If recipe.");
    }
    function bindSolveRecipeActions() {
        const solveButton = document.getElementById("btn_solve_targets");
        const resetButton = document.getElementById("btn_reset_whatif");
        if (!solveButton || !resetButton)
            return;
        solveButton.addEventListener("click", () => {
            solveRecipeTargetsFromFitInputs();
        });
        resetButton.addEventListener("click", () => {
            resetWhatIfComparison();
            fitStatusSet("What-If comparison reset.");
        });
    }
    function bindFitMyGuitarActions() {
        const fitButton = document.getElementById("btn_fit_guitar");
        const clearButton = document.getElementById("btn_fit_clear");
        if (!fitButton || !clearButton)
            return;
        fitButton.addEventListener("click", () => {
            const targets = fitTargetsFromInputs();
            const hasTarget = fitTargetsHaveAnyValue(targets);
            if (!hasTarget) {
                fitStatusSet("Enter at least one target frequency.");
                return;
            }
            solveTargets(targets, {
                useWhatIf: isWhatIfEnabled(),
                tweakIds: fitSolveTweakIdsFromTargets(targets),
            });
            fitStatusSet("Fit applied.");
        });
        clearButton.addEventListener("click", () => {
            [
                "fit_target_air",
                "fit_target_top",
                "fit_target_back",
                "fit_target_mass_top",
                "fit_target_stiffness_top",
                "fit_target_mass_back",
                "fit_target_stiffness_back",
                "fit_target_volume_air",
                "fit_target_area_hole_diam",
            ].forEach((elementId) => {
                const input = document.getElementById(elementId);
                if (!input)
                    return;
                input.value = "";
            });
            fitStatusSet("");
        });
    }
    function solveTargetsFast(targets, opts = {}) {
        const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
        const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
        const response = useWhatIf
            ? (lastWhatIfResponse || computeResponseForParams(baseParams))
            : lastResponse;
        const peaks = response ? (0, dof_peak_detection_1.modelPeaksFromResponse)(response) : null;
        if (!peaks) {
            const fit = fit4DofFromTargets(targets, {
                maxIter: 2,
                tweakIds: Array.from(SOLVE_TWEAK_IDS),
                baseParams: { ...baseParams },
            });
            if (fit === null || fit === void 0 ? void 0 : fit.raw) {
                if (useWhatIf)
                    applyWhatIfParams(fit.raw);
                else {
                    currentParams = { ...currentParams, ...fit.raw };
                    scheduleRender();
                }
            }
            return;
        }
        const warm = (0, dof_target_fit_1.buildDofFastTargetWarmParams)({
            baseParams,
            targets,
            peaks,
            clampToBounds,
        });
        if (useWhatIf)
            applyWhatIfParams(warm);
        else {
            currentParams = { ...currentParams, ...warm };
            scheduleRender();
        }
    }
    function scheduleDragSolve(mode, freq) {
        pendingDragMode = mode;
        pendingDragFreq = freq;
        if (pendingDragSolve !== null)
            return;
        pendingDragSolve = requestAnimationFrame(() => {
            pendingDragSolve = null;
            if (pendingDragMode && Number.isFinite(pendingDragFreq)) {
                const locked = dragLockedTargets || { air: null, top: null, back: null };
                const targets = { ...locked, [pendingDragMode]: pendingDragFreq };
                solveTargetsFast(targets, { useWhatIf: dragUseWhatIf });
            }
        });
    }
    function handleThumbPointerDown(event) {
        var _a, _b;
        const target = event.currentTarget;
        const mode = (_a = target === null || target === void 0 ? void 0 : target.dataset) === null || _a === void 0 ? void 0 : _a.mode;
        if (!mode)
            return;
        const plotEl = document.getElementById("plot_dof");
        if (!plotEl)
            return;
        event.preventDefault();
        dragUseWhatIf = isWhatIfEnabled();
        const lockResponse = getDragLockResponse(dragUseWhatIf);
        dragLockedTargets = lockResponse ? (0, dof_peak_detection_1.modelPeaksFromResponse)(lockResponse) : { air: null, top: null, back: null };
        dragState.mode = mode;
        dragState.pointerId = event.pointerId;
        const freq = (0, dof_plot_pointer_1.readDofPointerFrequency)(event, plotEl);
        if (Number.isFinite(freq))
            dragState.freq = freq;
        (_b = target.setPointerCapture) === null || _b === void 0 ? void 0 : _b.call(target, event.pointerId);
        updateThumbs();
    }
    function simpleSourceAmplitudeFromLevelShift(amplitude, levelShiftDb) {
        const sign = amplitude < 0 ? -1 : 1;
        const magnitude = Math.max(0.001, Math.abs(amplitude)) * Math.pow(10, levelShiftDb / 20);
        return simpleSourceAmplitudeRound(sign * Math.max(0.001, Math.min(2, magnitude)));
    }
    function simpleSourceAmplitudeRound(value) {
        return Math.round(value * 100) / 100;
    }
    function simpleSourceValueRound(value) {
        return Math.round(value * 10) / 10;
    }
    function simpleSourceDragStart(event, source) {
        var _a, _b;
        const plotEl = document.getElementById("plot_dof");
        if (!plotEl)
            return;
        const level = (0, dof_plot_pointer_1.readDofPointerLevel)(event, plotEl);
        event.preventDefault();
        simpleSourceDragState.sourceId = source.id;
        simpleSourceDragState.pointerId = event.pointerId;
        simpleSourceDragState.level = Number.isFinite(level) ? level : null;
        simpleSourceDragState.amplitude = source.amplitudeM2PerKg;
        (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.setPointerCapture) === null || _b === void 0 ? void 0 : _b.call(_a, event.pointerId);
        updateThumbs();
    }
    function handleSimpleSourceThumbPointerDown(event) {
        var _a;
        const sourceId = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset.sourceId;
        const source = currentSimpleSources.sources.find((candidate) => candidate.id === sourceId);
        if (!source)
            return;
        simpleSourceDragStart(event, source);
    }
    function simpleSourceDragApply(event) {
        if (!simpleSourceDragState.sourceId || simpleSourceDragState.pointerId !== event.pointerId)
            return false;
        const plotEl = document.getElementById("plot_dof");
        const source = currentSimpleSources.sources.find((candidate) => candidate.id === simpleSourceDragState.sourceId);
        if (!plotEl || !source)
            return false;
        const frequency = (0, dof_plot_pointer_1.readDofPointerFrequency)(event, plotEl);
        const level = (0, dof_plot_pointer_1.readDofPointerLevel)(event, plotEl);
        if (Number.isFinite(frequency))
            source.frequencyHz = simpleSourceValueRound(frequency);
        if (Number.isFinite(level) && Number.isFinite(simpleSourceDragState.level) && Number.isFinite(simpleSourceDragState.amplitude)) {
            source.amplitudeM2PerKg = simpleSourceAmplitudeFromLevelShift(simpleSourceDragState.amplitude, level - simpleSourceDragState.level);
        }
        simpleSourceCardsInputSync(source);
        updateThumbs();
        scheduleRender();
        return true;
    }
    function simpleSourceDragEnd(event) {
        if (!simpleSourceDragState.sourceId || simpleSourceDragState.pointerId !== event.pointerId)
            return false;
        simpleSourceDragState.sourceId = null;
        simpleSourceDragState.pointerId = null;
        simpleSourceDragState.level = null;
        simpleSourceDragState.amplitude = null;
        updateThumbs();
        return true;
    }
    function modeDragApply(event) {
        if (!dragState.mode || dragState.pointerId !== event.pointerId)
            return false;
        const plotEl = document.getElementById("plot_dof");
        if (!plotEl)
            return true;
        const freq = (0, dof_plot_pointer_1.readDofPointerFrequency)(event, plotEl);
        if (!Number.isFinite(freq))
            return true;
        dragState.freq = freq;
        updateThumbs();
        scheduleDragSolve(dragState.mode, dragState.freq);
        return true;
    }
    function modeDragEnd(event) {
        if (!dragState.mode || dragState.pointerId !== event.pointerId)
            return false;
        const mode = dragState.mode;
        const freq = dragState.freq;
        dragState.mode = null;
        dragState.freq = null;
        dragState.pointerId = null;
        pendingDragMode = null;
        pendingDragFreq = null;
        if (pendingDragSolve !== null) {
            cancelAnimationFrame(pendingDragSolve);
            pendingDragSolve = null;
        }
        updateThumbs();
        if (Number.isFinite(freq)) {
            const locked = dragLockedTargets || { air: null, top: null, back: null };
            const targets = { ...locked, [mode]: freq };
            solveTargets(targets, { useWhatIf: dragUseWhatIf });
        }
        dragLockedTargets = null;
        dragUseWhatIf = false;
        return true;
    }
    const calloutDragBehaviors = [
        { move: simpleSourceDragApply, end: simpleSourceDragEnd },
        { move: modeDragApply, end: modeDragEnd },
    ];
    function handleThumbPointerMove(event) {
        (0, dof_plot_callouts_1.calloutDragDispatch)(calloutDragBehaviors, "move", event);
    }
    function handleThumbPointerUp(event) {
        (0, dof_plot_callouts_1.calloutDragDispatch)(calloutDragBehaviors, "end", event);
    }
    function bindPlotInteractions(plotEl) {
        if (plotListenersBound || typeof plotEl.on !== "function")
            return;
        plotListenersBound = true;
        plotEl.on("plotly_relayout", () => updateThumbs());
        plotEl.on("plotly_restyle", () => (0, dof_trace_visibility_1.syncDofTraceVisibilityStateFromPlot)(plotEl, traceVisibilityState));
        plotEl.on("plotly_legendclick", () => {
            requestAnimationFrame(() => (0, dof_trace_visibility_1.syncDofTraceVisibilityStateFromPlot)(plotEl, traceVisibilityState));
        });
        bindPlotResizeSync(plotEl);
        window.addEventListener("pointermove", handleThumbPointerMove);
        window.addEventListener("pointerup", handleThumbPointerUp);
        window.addEventListener("pointercancel", handleThumbPointerUp);
    }
    function readCurrentDofSaveSnapshot() {
        return {
            params: { ...currentParams },
            modelOrder: currentOrder,
            taskMode: currentTaskMode,
            overlayEnabled: isWhatIfEnabled(),
            fitInputs: readCurrentDofFitInputs(),
            solveOptions: readCurrentDofSolveOptions(),
            simpleSources: simpleSourcesStateRead(),
        };
    }
    function dofPerTabSessionRead() {
        var _a;
        return ((_a = window.PerTabToolSession) === null || _a === void 0 ? void 0 : _a.perTabToolSessionCreate)
            ? window.PerTabToolSession.perTabToolSessionCreate({ toolId: "dof_model", version: 1 })
            : null;
    }
    function dofPerTabSessionPersist() {
        dofPerTabSession === null || dofPerTabSession === void 0 ? void 0 : dofPerTabSession.write(readCurrentDofSaveSnapshot());
    }
    function dofPerTabSessionSnapshotRead() {
        return (dofPerTabSession === null || dofPerTabSession === void 0 ? void 0 : dofPerTabSession.read()) || null;
    }
    function readCurrentDofFitInputs() {
        return Object.fromEntries(DOF_FIT_FIELD_IDS.map((id) => [id, readDofInputValue(id)]));
    }
    function readCurrentDofSolveOptions() {
        var _a;
        return {
            fit_restrict_simple: Boolean((_a = document.getElementById("fit_restrict_simple")) === null || _a === void 0 ? void 0 : _a.checked),
        };
    }
    function readDofInputValue(id) {
        var _a;
        return String(((_a = document.getElementById(id)) === null || _a === void 0 ? void 0 : _a.value) || "");
    }
    function writeDofInputValue(id, value) {
        const input = document.getElementById(id);
        if (!input)
            return;
        input.value = String(value || "");
    }
    function applyLoadedDofSnapshot(snapshot) {
        var _a;
        const plan = window.DofSaveSnapshot.buildDofSnapshotApplyPlan(snapshot, {
            params: DEFAULT_PARAMS,
            modelOrder: 4,
        });
        currentParams = { ...plan.params };
        simpleSourcesStateApply(plan.simpleSources);
        DOF_FIT_FIELD_IDS.forEach((id) => { var _a; return writeDofInputValue(id, (_a = plan.fitInputs) === null || _a === void 0 ? void 0 : _a[id]); });
        const solveToggle = document.getElementById("fit_restrict_simple");
        if (solveToggle)
            solveToggle.checked = Boolean((_a = plan.solveOptions) === null || _a === void 0 ? void 0 : _a.fit_restrict_simple);
        const overlayToggle = document.getElementById("toggle_overlay");
        if (overlayToggle) {
            overlayToggle.checked = Boolean(plan.overlayEnabled);
            overlayToggle.dispatchEvent(new Event("change"));
        }
        syncCardInputs();
        setTaskMode(plan.taskMode);
        setOrder(plan.modelOrder);
        fitStatusSet("");
        whatIfSummarySet(null);
        scheduleRender();
    }
    async function loadResults() {
        var _a;
        const loadFileInput = document.getElementById("load_model_file");
        const file = (_a = loadFileInput === null || loadFileInput === void 0 ? void 0 : loadFileInput.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        try {
            const snapshot = await window.DofSaveSurface.readDofSavePackageFile(file);
            applyLoadedDofSnapshot(snapshot);
            fitStatusSet("Loaded JSON package.");
        }
        catch (_error) {
            fitStatusSet("Unable to load JSON package.");
        }
        finally {
            if (loadFileInput)
                loadFileInput.value = "";
        }
    }
    async function saveResults() {
        await readDofSaveRunner().runDofSaveAction({
            readSnapshot: readCurrentDofSaveSnapshot,
            setStatus: fitStatusSet,
        });
    }
    function readDofSaveRunner() {
        var _a;
        if ((_a = window.DofSaveTarget) === null || _a === void 0 ? void 0 : _a.dofSaveRunnerCreate) {
            return window.DofSaveTarget.dofSaveRunnerCreate();
        }
        return {
            readDofSaveSurface() {
                return Promise.resolve({
                    mode: "offline",
                    label: "Download JSON",
                    hint: "",
                });
            },
            runDofSaveAction(request) {
                const savePackage = window.DofSaveSurface.buildDofSavePackage(request.readSnapshot());
                window.DofSaveSurface.downloadDofSavePackage(window, savePackage);
                request.setStatus("JSON package downloaded.");
                return Promise.resolve(true);
            },
        };
    }
    function readDofNotebookRestoreApi() {
        var _a;
        return ((_a = window.DofNotebookRestore) === null || _a === void 0 ? void 0 : _a.restoreDofNotebookEventIntoUi)
            ? window.DofNotebookRestore
            : null;
    }
    async function applyDofSaveSurface() {
        const saveButton = document.getElementById("save_model");
        const saveSurface = await readDofSaveRunner().readDofSaveSurface();
        if (!saveButton)
            return;
        saveButton.textContent = saveSurface.label || "Download JSON";
        saveButton.title = saveSurface.hint || "";
    }
    async function initializeDofSaveSurface() {
        if (await restoreNotebookEventIntoUi())
            return;
        await applyDofSaveSurface();
    }
    async function restoreNotebookEventIntoUi() {
        const restoreApi = readDofNotebookRestoreApi();
        if (!restoreApi)
            return false;
        const restored = await restoreApi.restoreDofNotebookEventIntoUi({
            runtime: window,
            applySnapshot(snapshot) {
                applyLoadedDofSnapshot(snapshot);
            },
        });
        if (restored) {
            fitStatusSet("Notebook event restored.");
        }
        return restored;
    }
    function bindPlotResizeSync(plotEl) {
        const sync = () => syncPlotWidthToContainer(plotEl);
        window.addEventListener("resize", sync);
        const plotShell = plotEl.closest(".plot-shell");
        if (typeof ResizeObserver !== "function" || plotResizeObserver)
            return;
        plotResizeObserver = new ResizeObserver(() => sync());
        plotResizeObserver.observe(plotShell || plotEl);
    }
    function syncPlotWidthToContainer(plotEl) {
        Promise.resolve((0, dof_plot_resize_1.applyDofPlotResize)(getPlotly(), plotEl)).finally(() => updateThumbs());
    }
    function renderPlot() {
        var _a;
        const plotEl = document.getElementById("plot_dof");
        if (!plotEl)
            return;
        const solverParams = adaptParamsToSolver(currentParams);
        const response = computeResponseSafe(solverParams);
        lastResponse = response;
        const whatIfParams = getWhatIfParams();
        const whatIfResponse = whatIfParams ? computeResponseSafe(adaptParamsToSolver(whatIfParams)) : null;
        lastWhatIfResponse = whatIfResponse;
        updateModeCards(response, whatIfResponse);
        if (!response || !Array.isArray(response.total)) {
            plotEl.innerHTML = `<div class="muted small">Model response unavailable.</div>`;
            lastDisplayedResponse = null;
            updateThumbs(null);
            return;
        }
        const colors = plotThemeColors();
        const xRange = simpleSourcesActive() ? [50, 800] : [50, 300];
        const composedResponse = simpleSourcesActive()
            ? simpleSourcesCombinedResponseRead(solverParams, xRange[0], xRange[1])
            : null;
        const composedWhatIfResponse = simpleSourcesActive() && whatIfParams
            ? simpleSourcesCombinedResponseRead(adaptParamsToSolver(whatIfParams), xRange[0], xRange[1])
            : null;
        const displayedResponse = (composedResponse === null || composedResponse === void 0 ? void 0 : composedResponse.length) ? composedResponse : response.total;
        lastDisplayedResponse = displayedResponse;
        const traces = [];
        const totalTrace = (0, dof_plot_data_1.buildDofTrace)(displayedResponse, (composedResponse === null || composedResponse === void 0 ? void 0 : composedResponse.length) ? "4DOF + Sources" : "Current", colors.current, { width: 3 });
        (0, dof_trace_visibility_1.applyDofTraceVisibility)(totalTrace, "Current", traceVisibilityState);
        if (totalTrace)
            traces.push(totalTrace);
        if (composedResponse === null || composedResponse === void 0 ? void 0 : composedResponse.length) {
            const baseTrace = (0, dof_plot_data_1.buildDofTrace)(response.total, "4DOF base", (0, dof_display_format_1.colorWithAlpha)(colors.ink, 0.55), {
                width: 1.25,
                dash: "dot",
            });
            if (baseTrace)
                traces.push(baseTrace);
        }
        const sourceTrace = simpleSourcesTraceBuild(displayedResponse);
        if (sourceTrace)
            traces.push(sourceTrace);
        simpleSourceComponentTracesRead(solverParams, xRange[0], xRange[1]).forEach((trace) => traces.push(trace));
        if ((_a = whatIfResponse === null || whatIfResponse === void 0 ? void 0 : whatIfResponse.total) === null || _a === void 0 ? void 0 : _a.length) {
            const targetTraces = buildTargetOverlayTraces((composedWhatIfResponse === null || composedWhatIfResponse === void 0 ? void 0 : composedWhatIfResponse.length) ? composedWhatIfResponse : whatIfResponse.total, colors.whatIf);
            targetTraces.forEach((trace) => {
                (0, dof_trace_visibility_1.applyDofTraceVisibility)(trace, "Target", traceVisibilityState);
                traces.push(trace);
            });
        }
        const topTrace = (0, dof_plot_data_1.buildDofTrace)(response.top, "Top", colors.top, { width: 1.5, dash: "dot" });
        const airTrace = (0, dof_plot_data_1.buildDofTrace)(response.air, "Air", colors.air, { width: 1.5, dash: "dot" });
        const backTrace = (0, dof_plot_data_1.buildDofTrace)(response.back, "Back", colors.back, { width: 1.5, dash: "dot" });
        const sidesTrace = (0, dof_plot_data_1.buildDofTrace)(response.sides, "Sides", colors.sides, { width: 1, dash: "dot" });
        (0, dof_trace_visibility_1.applyDofTraceVisibility)(topTrace, "Top", traceVisibilityState);
        (0, dof_trace_visibility_1.applyDofTraceVisibility)(airTrace, "Air", traceVisibilityState);
        (0, dof_trace_visibility_1.applyDofTraceVisibility)(backTrace, "Back", traceVisibilityState);
        (0, dof_trace_visibility_1.applyDofTraceVisibility)(sidesTrace, "Sides", traceVisibilityState);
        [topTrace, airTrace, backTrace, sidesTrace].forEach((t) => { if (t)
            traces.push(t); });
        const layout = {
            margin: { l: 40, r: 20, t: 20, b: 50 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: colors.ink },
            xaxis: {
                title: "Frequency (Hz)",
                range: xRange,
                gridcolor: colors.grid,
                zeroline: false,
            },
            yaxis: {
                title: "Level (dB)",
                gridcolor: colors.grid,
                autorange: false,
                zeroline: false,
            },
            showlegend: true,
        };
        const yRange = (0, dof_plot_data_1.computeDofYRange)(displayedResponse, 6, xRange[0], xRange[1]);
        if (yRange)
            layout.yaxis = { ...layout.yaxis, range: yRange };
        const plotly = getPlotly();
        if (!plotly)
            return;
        plotly.react(plotEl, traces, layout, { displayModeBar: true, displaylogo: false })
            .then(() => {
            (0, dof_trace_visibility_1.syncDofTraceVisibilityStateFromPlot)(plotEl, traceVisibilityState);
            bindPlotInteractions(plotEl);
            updateThumbs(response);
        })
            .catch((err) => {
            console.error("Plotly render failed", err);
        });
    }
    function bindTabs() {
        document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const order = Number(btn.dataset.order || "4");
                setOrder(order);
            });
        });
    }
    function bindTaskModeTabs() {
        document.querySelectorAll("[data-task-mode]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const mode = String(btn.dataset.taskMode || "edit");
                setTaskMode(mode);
            });
        });
    }
    function dofPipelineRunnerExpose() {
        var _a;
        const sharedRunner = (_a = window.dof_pipeline_runner) === null || _a === void 0 ? void 0 : _a.dofPipelineRunnerRun;
        window.DofPipelineRunner = {
            run: (input, config, emit) => {
                if (typeof sharedRunner === "function") {
                    return sharedRunner(input || {}, config || {}, emit, {
                        refresh: async () => {
                            renderPlot();
                        },
                    });
                }
                return dofPipelineFallbackRun(input || {}, config || {}, emit);
            },
        };
    }
    function dofPipelineFallbackRun(input, config, emit) {
        const runId = `dof_fallback_${Date.now()}`;
        dofPipelineFallbackStartedEmit(emit, runId, input, config);
        dofPipelineFallbackRefreshStartedEmit(emit, runId);
        renderPlot();
        dofPipelineFallbackRefreshCompletedEmit(emit, runId);
        dofPipelineFallbackCompletedEmit(emit, runId, (input === null || input === void 0 ? void 0 : input.trigger) || null);
        return Promise.resolve();
    }
    function dofPipelineFallbackStartedEmit(emit, runId, input, config) {
        emit === null || emit === void 0 ? void 0 : emit({
            eventType: "pipeline.started",
            stageId: undefined,
            payload: { input, config },
            runId,
        });
    }
    function dofPipelineFallbackRefreshStartedEmit(emit, runId) {
        emit === null || emit === void 0 ? void 0 : emit({
            eventType: "stage.started",
            stageId: "refresh",
            payload: { stage: "refresh" },
            runId,
        });
    }
    function dofPipelineFallbackRefreshCompletedEmit(emit, runId) {
        emit === null || emit === void 0 ? void 0 : emit({
            eventType: "stage.completed",
            stageId: "refresh",
            payload: { stage: "refresh" },
            runId,
        });
    }
    function dofPipelineFallbackCompletedEmit(emit, runId, trigger) {
        emit === null || emit === void 0 ? void 0 : emit({
            eventType: "pipeline.completed",
            stageId: undefined,
            payload: { summary: { trigger } },
            runId,
        });
    }
    function init() {
        const saveButton = document.getElementById("save_model");
        const loadButton = document.getElementById("load_model");
        const loadFileInput = document.getElementById("load_model_file");
        const perTabSnapshot = dofPerTabSessionSnapshotRead();
        const fromUrl = dofParamsFromLocation();
        bindTabs();
        bindTaskModeTabs();
        simpleSourcesBind();
        bindFitMyGuitarActions();
        fitAltitudeControlBind();
        bindSolveRecipeActions();
        if (saveButton)
            saveButton.addEventListener("click", () => void saveResults());
        if (loadButton && loadFileInput)
            loadButton.addEventListener("click", () => loadFileInput.click());
        if (loadFileInput)
            loadFileInput.addEventListener("change", loadResults);
        setTaskMode(currentTaskMode);
        setOrder(currentOrder);
        if (perTabSnapshot)
            applyLoadedDofSnapshot(perTabSnapshot);
        if (fromUrl) {
            currentParams = { ...currentParams, ...fromUrl };
            if (Number.isFinite(fromUrl.model_order))
                currentOrder = fromUrl.model_order;
            syncCardInputs();
            setOrder(currentOrder);
        }
        void initializeDofSaveSurface();
        dofPipelineRunnerExpose();
        scheduleRender();
        const overlayToggle = document.getElementById("toggle_overlay");
        if (overlayToggle) {
            overlayToggle.addEventListener("change", () => {
                document.body.classList.toggle("whatif-mode", overlayToggle.checked);
                if (!overlayToggle.checked)
                    resetWhatIf();
                refreshOverlayVisuals();
                scheduleRender();
            });
            document.body.classList.toggle("whatif-mode", overlayToggle.checked);
            refreshOverlayVisuals();
        }
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }
});
