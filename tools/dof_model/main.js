"use strict";
// @ts-nocheck
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
        label: "Air / Helmholtz",
        alias: "T(1,1)₁",
        degree: 1,
        color: "#8ecbff",
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
        label: "Top Plate",
        alias: "T(1,1)₂",
        degree: 2,
        color: "#f5c46f",
        badgeText: "DOF 2",
        fields: [
            { label: "Mass mₜ (g)", param: "mass_top", step: 0.1, min: 20, max: 120 },
            { label: "Stiffness kₜ (N/m)", param: "stiffness_top", step: 100, min: 20000, max: 150000 },
            { label: "Damping Rₜ", param: "damping_top", step: 0.1, min: 0.5, max: 6.0 },
            { label: "Radiating Area Aₜ (m²)", param: "area_top", step: 0.0005, min: 0.02, max: 0.06 },
        ],
    },
    {
        key: "back",
        label: "Back Plate",
        alias: "T(1,1)₃",
        degree: 3,
        color: "#7ce3b1",
        badgeText: "DOF 3",
        fields: [
            { label: "Mass mᵦ (g)", param: "mass_back", step: 0.5, min: 40, max: 220 },
            { label: "Stiffness kᵦ (N/m)", param: "stiffness_back", step: 200, min: 80000, max: 220000 },
            { label: "Damping Rᵦ", param: "damping_back", step: 0.1, min: 1.0, max: 15.0 },
            { label: "Radiating Area Aᵦ (m²)", param: "area_back", step: 0.0005, min: 0.02, max: 0.06 },
        ],
    },
    {
        key: "sides",
        label: "Sides / Coupling",
        alias: "External",
        degree: 4,
        color: "#b4a5ff",
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
        color: "#9aa4b6",
        badgeText: "Always",
        fields: [
            { label: "Ambient Temp (°C)", param: "ambient_temp", step: 0.5, min: -10, max: 40 },
            { label: "Altitude (m)", param: "altitude", step: 10, min: 0, max: 3000 },
            { label: "Driving Force F (N)", param: "driving_force", step: 0.05, min: 0.05, max: 1.0 },
        ],
    },
];
const MODE_META = {
    air: { label: "Air", color: "#8ecbff" },
    top: { label: "Top", color: "#f5c46f" },
    back: { label: "Back", color: "#7ce3b1" },
};
const MODE_BANDS = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 },
};
const MODE_KEYS = ["air", "top", "back"];
const FIT_BOUNDS = {
    area_hole: { min: 0.003, max: 0.01 },
    volume_air: { min: 0.01, max: 0.025 },
    stiffness_top: { min: 20000, max: 150000 },
    stiffness_back: { min: 80000, max: 220000 },
};
const SOLVE_TWEAK_IDS = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"];
let currentParams = { ...DEFAULT_PARAMS };
let currentOrder = 4;
let plotlyRef = null;
let pendingRender = null;
let lastResponse = null;
let plotListenersBound = false;
const thumbEls = {};
const modeCardEls = {};
const paramInputs = {};
const paramSliders = {};
const overlaySliders = {};
const overlayLatched = new Set();
let lastWhatIfResponse = null;
const dragState = {
    mode: null,
    freq: null,
    pointerId: null,
};
let pendingDragSolve = null;
let pendingDragMode = null;
let pendingDragFreq = null;
let dragLockedTargets = null;
let dragUseWhatIf = false;
function dofParamsFromLocation() {
    const raw = new URLSearchParams(window.location.search).get("params");
    if (!raw)
        return null;
    try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        if (!parsed || typeof parsed !== "object")
            return null;
        const next = {};
        Object.keys(DEFAULT_PARAMS).forEach((key) => {
            const value = parsed[key];
            if (Number.isFinite(value))
                next[key] = value;
        });
        return Object.keys(next).length ? next : null;
    }
    catch {
        return null;
    }
}
function displayToInternal(param, displayValue) {
    if (!Number.isFinite(displayValue))
        return displayValue;
    if (String(param).startsWith("mass_"))
        return displayValue / 1000;
    return displayValue;
}
function internalToDisplay(param, internalValue) {
    if (!Number.isFinite(internalValue))
        return internalValue;
    if (String(param).startsWith("mass_"))
        return internalValue * 1000;
    return internalValue;
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
        currentParams[param] = displayToInternal(param, value);
        scheduleRender();
    }
}
function buildCards() {
    const container = document.getElementById("dof_cards");
    if (!container)
        return;
    container.innerHTML = "";
    CARD_DEFS.forEach((card) => {
        const cardEl = document.createElement("div");
        cardEl.className = `mode-card mode-${card.key}`;
        cardEl.dataset.degree = String(card.degree);
        if (isModeKey(card.key))
            cardEl.dataset.mode = card.key;
        const title = document.createElement("div");
        title.className = "dof-card-title";
        const badge = card.badgeText || `DOF ${card.degree}`;
        title.innerHTML = `<div><div class="mode-label">${card.label}</div><div class="muted small">${card.alias}</div></div><span class="badge" style="background:${card.color};">${badge}</span>`;
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
            whatIfLabel.textContent = "What-If";
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
            input.value = String(internalToDisplay(field.param, currentParams[field.param]));
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
            input.addEventListener("input", (event) => {
                const val = parseFloat(event.target.value);
                if (Number.isFinite(val))
                    slider.value = String(val);
                updateParam(field.param, val);
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
            paramInputs[field.param] = input;
            paramSliders[field.param] = slider;
            overlaySliders[field.param] = overlay;
            row.append(label, input, sliderWrap);
            grid.appendChild(row);
        });
        cardEl.appendChild(grid);
        container.appendChild(cardEl);
    });
    applyCardVisibility();
}
function applyCardVisibility() {
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
    const baseValue = internalToDisplay(param, currentParams[param]);
    if (Number.isFinite(baseValue))
        overlay.value = String(baseValue);
}
function updateOverlayLatch(param) {
    const overlay = overlaySliders[param];
    if (!overlay)
        return;
    const baseValue = internalToDisplay(param, currentParams[param]);
    const overlayValue = parseFloat(overlay.value);
    const step = parseFloat(overlay.step || "0.0001");
    const epsilon = Math.max(1e-6, step * 0.5);
    const isActive = Number.isFinite(baseValue) && Number.isFinite(overlayValue)
        ? Math.abs(overlayValue - baseValue) > epsilon
        : false;
    if (isActive)
        overlayLatched.add(param);
    else
        overlayLatched.delete(param);
    overlay.classList.toggle("overlay-active", isActive);
}
function resetWhatIf() {
    overlayLatched.clear();
    Object.keys(overlaySliders).forEach((key) => {
        const param = key;
        const overlay = overlaySliders[param];
        if (!overlay)
            return;
        const baseValue = internalToDisplay(param, currentParams[param]);
        if (Number.isFinite(baseValue))
            overlay.value = String(baseValue);
        overlay.classList.remove("overlay-active");
    });
    lastWhatIfResponse = null;
    updateModeCards(lastResponse, null);
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
        out[param] = displayToInternal(param, value);
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
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function freqToNoteCents(freq) {
    if (!Number.isFinite(freq) || freq <= 0) {
        return { name: "--", cents: "--", centsNum: null };
    }
    const midi = 69 + 12 * Math.log2(freq / 440);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);
    const name = `${NOTE_NAMES[(nearest + 1200) % 12]}${Math.floor(nearest / 12) - 1}`;
    const centsStr = `${cents >= 0 ? "+" : ""}${cents}c`;
    return { name, cents: centsStr, centsNum: cents };
}
function formatSigned(value, digits = 1) {
    if (!Number.isFinite(value))
        return "--";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(digits)}`;
}
function getModeDisplayFreq(mode, peaks) {
    if (!dragUseWhatIf && dragState.mode === mode && Number.isFinite(dragState.freq))
        return dragState.freq;
    const freq = peaks === null || peaks === void 0 ? void 0 : peaks[mode];
    return Number.isFinite(freq) ? freq : null;
}
function updateModeCards(baseResponse = lastResponse, whatIfResponse = lastWhatIfResponse) {
    const basePeaks = baseResponse ? modelPeaksFromResponse(baseResponse) : null;
    const whatIfPeaks = whatIfResponse ? modelPeaksFromResponse(whatIfResponse) : null;
    const showWhatIf = Boolean(whatIfResponse);
    MODE_KEYS.forEach((mode) => {
        const els = modeCardEls[mode];
        if (!els)
            return;
        const baseFreq = getModeDisplayFreq(mode, basePeaks || { air: null, top: null, back: null });
        els.freqValue.textContent = Number.isFinite(baseFreq) ? baseFreq.toFixed(1) : "--";
        const baseNote = freqToNoteCents(baseFreq);
        els.noteName.textContent = baseNote.name;
        els.noteCents.textContent = baseNote.cents;
        els.noteCents.classList.toggle("positive", typeof baseNote.centsNum === "number" && baseNote.centsNum > 0);
        els.noteCents.classList.toggle("negative", typeof baseNote.centsNum === "number" && baseNote.centsNum < 0);
        els.whatIfRow.style.display = showWhatIf ? "" : "none";
        els.whatIfNoteRow.style.display = showWhatIf ? "" : "none";
        if (!showWhatIf) {
            els.whatIfValue.textContent = "--";
            els.whatIfDelta.textContent = "";
            els.whatIfNoteName.textContent = "--";
            els.whatIfNoteCents.textContent = "--";
            els.whatIfNoteCents.classList.remove("positive", "negative");
            return;
        }
        const whatIfFreq = whatIfPeaks === null || whatIfPeaks === void 0 ? void 0 : whatIfPeaks[mode];
        els.whatIfValue.textContent = Number.isFinite(whatIfFreq) ? `${whatIfFreq.toFixed(1)} Hz` : "--";
        if (Number.isFinite(baseFreq) && Number.isFinite(whatIfFreq)) {
            const hzDelta = whatIfFreq - baseFreq;
            els.whatIfDelta.textContent = `(${formatSigned(hzDelta, 1)} Hz)`;
        }
        else {
            els.whatIfDelta.textContent = "";
        }
        const whatNote = freqToNoteCents(whatIfFreq);
        els.whatIfNoteName.textContent = whatNote.name;
        els.whatIfNoteCents.textContent = whatNote.cents;
        els.whatIfNoteCents.classList.toggle("positive", typeof whatNote.centsNum === "number" && whatNote.centsNum > 0);
        els.whatIfNoteCents.classList.toggle("negative", typeof whatNote.centsNum === "number" && whatNote.centsNum < 0);
    });
}
function syncCardInputs() {
    Object.entries(paramInputs).forEach(([key, input]) => {
        const param = key;
        const next = internalToDisplay(param, currentParams[param]);
        if (Number.isFinite(next)) {
            input.value = String(next);
            const slider = paramSliders[param];
            if (slider)
                slider.value = String(next);
        }
        syncOverlayToBase(param);
        updateOverlayLatch(param);
    });
}
function setOrder(order) {
    currentOrder = order;
    currentParams.model_order = order;
    const label = document.getElementById("model_order_label");
    if (label)
        label.textContent = String(order);
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        const isActive = Number(btn.dataset.order) === order;
        btn.classList.toggle("tab-btn-active", isActive);
    });
    applyCardVisibility();
    scheduleRender();
}
function scheduleRender() {
    if (pendingRender !== null)
        cancelAnimationFrame(pendingRender);
    pendingRender = requestAnimationFrame(() => {
        pendingRender = null;
        renderPlot();
    });
}
function computeResponseSafe(params) {
    var _a;
    try {
        const fn = window.computeResponse || ((_a = window.ModelCore) === null || _a === void 0 ? void 0 : _a.computeResponse);
        if (typeof fn === "function")
            return fn(params);
    }
    catch (err) {
        console.warn("computeResponse failed", err);
    }
    return null;
}
function adaptParamsToSolver(raw) {
    var _a;
    const out = { ...raw };
    const AtmosphereLib = window.Atmosphere;
    const deriveAtmosphere = AtmosphereLib === null || AtmosphereLib === void 0 ? void 0 : AtmosphereLib.deriveAtmosphere;
    const referenceRho = (_a = AtmosphereLib === null || AtmosphereLib === void 0 ? void 0 : AtmosphereLib.REFERENCE_RHO) !== null && _a !== void 0 ? _a : 1.205;
    const altitude = typeof out.altitude === "number" && Number.isFinite(out.altitude) ? out.altitude : 0;
    const temp = typeof out.ambient_temp === "number" && Number.isFinite(out.ambient_temp) ? out.ambient_temp : 20;
    if (typeof deriveAtmosphere === "function") {
        const atm = deriveAtmosphere(altitude, temp);
        out.air_density = atm.rho;
        out.speed_of_sound = atm.c;
        out.air_pressure = atm.pressure;
        out.air_temp_k = atm.tempK;
        const baseMassAirKg = typeof out.mass_air === "number" && Number.isFinite(out.mass_air) ? out.mass_air : null;
        if (baseMassAirKg !== null) {
            const densityScale = atm.rho / referenceRho;
            out.mass_air = baseMassAirKg * densityScale;
        }
        out._atm = atm;
    }
    return out;
}
function clampToBounds(id, value) {
    const bounds = FIT_BOUNDS[id];
    if (!bounds || !Number.isFinite(value))
        return value;
    return Math.max(bounds.min, Math.min(bounds.max, value));
}
function peakFreqInBand(series, band) {
    let bestX = null;
    let bestY = -Infinity;
    for (let i = 0; i < series.length; i += 1) {
        const point = series[i];
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
            continue;
        if (point.x < band.low || point.x > band.high)
            continue;
        if (point.y > bestY) {
            bestY = point.y;
            bestX = point.x;
        }
    }
    return bestX;
}
function median(values) {
    if (!values.length)
        return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function refineParabolicPeak(xs, ys, idx) {
    if (idx <= 0 || idx >= ys.length - 1)
        return null;
    const a = ys[idx - 1];
    const b = ys[idx];
    const c = ys[idx + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c))
        return null;
    const bw = xs.length > 1 ? Math.abs(xs[1] - xs[0]) : null;
    if (!bw || !Number.isFinite(bw) || bw <= 0)
        return null;
    const denom = a - (2 * b) + c;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12)
        return null;
    const delta = 0.5 * (a - c) / denom;
    if (!Number.isFinite(delta))
        return null;
    const clamped = Math.max(-1, Math.min(1, delta));
    const freq = xs[idx] + clamped * bw;
    const y = b - ((a - c) * clamped) / 4;
    return { freq, y, delta: clamped };
}
function collectLocalPeaks(series, band) {
    var _a, _b;
    if (!Array.isArray(series) || series.length < 3)
        return [];
    const xs = series.map((pt) => pt === null || pt === void 0 ? void 0 : pt.x);
    const ys = series.map((pt) => pt === null || pt === void 0 ? void 0 : pt.y);
    const peaks = [];
    for (let i = 1; i < series.length - 1; i += 1) {
        const y = ys[i];
        const yPrev = ys[i - 1];
        const yNext = ys[i + 1];
        if (!Number.isFinite(y) || !Number.isFinite(yPrev) || !Number.isFinite(yNext))
            continue;
        if (!(y > yPrev && y > yNext))
            continue;
        const x = xs[i];
        if (!Number.isFinite(x))
            continue;
        if (band && (x < band.low || x > band.high))
            continue;
        const start = Math.max(0, i - 6);
        const end = Math.min(ys.length - 1, i + 6);
        const neighbors = [];
        for (let j = start; j <= end; j += 1) {
            if (j === i)
                continue;
            const v = ys[j];
            if (Number.isFinite(v))
                neighbors.push(v);
        }
        const baseline = neighbors.length ? median(neighbors) : y;
        const prominence = y - baseline;
        const refined = refineParabolicPeak(xs, ys, i);
        peaks.push({
            idx: i,
            freq: (_a = refined === null || refined === void 0 ? void 0 : refined.freq) !== null && _a !== void 0 ? _a : x,
            db: (_b = refined === null || refined === void 0 ? void 0 : refined.y) !== null && _b !== void 0 ? _b : y,
            prominence,
        });
    }
    return peaks;
}
function pickDominantPeak(series, band) {
    const peaks = collectLocalPeaks(series, band);
    if (!peaks.length)
        return null;
    peaks.sort((a, b) => b.prominence - a.prominence);
    return peaks[0];
}
function assignPeaksToModes(totalPeaks, targets) {
    const modes = ["air", "top", "back"];
    const out = { air: null, top: null, back: null };
    if (!totalPeaks.length)
        return out;
    if (totalPeaks.length >= modes.length) {
        const perms = [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0],
        ];
        let best = perms[0];
        let bestCost = Infinity;
        perms.forEach((perm) => {
            let cost = 0;
            modes.forEach((mode, i) => {
                const target = targets[mode];
                const peak = totalPeaks[perm[i]];
                if (!Number.isFinite(target)) {
                    cost += 1e6;
                    return;
                }
                cost += Math.abs(peak.freq - target);
            });
            if (cost < bestCost) {
                bestCost = cost;
                best = perm;
            }
        });
        modes.forEach((mode, i) => {
            var _a, _b;
            out[mode] = (_b = (_a = totalPeaks[best[i]]) === null || _a === void 0 ? void 0 : _a.freq) !== null && _b !== void 0 ? _b : null;
        });
        return out;
    }
    const remaining = totalPeaks.slice();
    modes.forEach((mode) => {
        var _a;
        if (!remaining.length)
            return;
        const target = targets[mode];
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i += 1) {
            const dist = Number.isFinite(target) ? Math.abs(remaining[i].freq - target) : 0;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        const chosen = remaining.splice(bestIdx, 1)[0];
        out[mode] = (_a = chosen === null || chosen === void 0 ? void 0 : chosen.freq) !== null && _a !== void 0 ? _a : null;
    });
    return out;
}
function modelPeaksFromResponse(resp) {
    var _a, _b, _c, _d, _e, _f;
    const total = resp === null || resp === void 0 ? void 0 : resp.total;
    if (!Array.isArray(total) || !total.length)
        return null;
    const totalPeaks = collectLocalPeaks(total).sort((a, b) => b.prominence - a.prominence).slice(0, 3);
    if (!totalPeaks.length) {
        return {
            air: peakFreqInBand(total, MODE_BANDS.air),
            top: peakFreqInBand(total, MODE_BANDS.top),
            back: peakFreqInBand(total, MODE_BANDS.back),
        };
    }
    const bandCenter = (mode) => (MODE_BANDS[mode].low + MODE_BANDS[mode].high) / 2;
    const componentPeaks = {
        air: pickDominantPeak((resp === null || resp === void 0 ? void 0 : resp.air) || [], MODE_BANDS.air),
        top: pickDominantPeak((resp === null || resp === void 0 ? void 0 : resp.top) || [], MODE_BANDS.top),
        back: pickDominantPeak((resp === null || resp === void 0 ? void 0 : resp.back) || [], MODE_BANDS.back),
    };
    const targets = {
        air: (_b = (_a = componentPeaks.air) === null || _a === void 0 ? void 0 : _a.freq) !== null && _b !== void 0 ? _b : bandCenter("air"),
        top: (_d = (_c = componentPeaks.top) === null || _c === void 0 ? void 0 : _c.freq) !== null && _d !== void 0 ? _d : bandCenter("top"),
        back: (_f = (_e = componentPeaks.back) === null || _e === void 0 ? void 0 : _e.freq) !== null && _f !== void 0 ? _f : bandCenter("back"),
    };
    return assignPeaksToModes(totalPeaks, targets);
}
function sampleSeriesAtFreq(series, freq) {
    if (!Array.isArray(series) || !series.length || !Number.isFinite(freq))
        return null;
    let i = 0;
    while (i + 1 < series.length && series[i + 1].x < freq)
        i += 1;
    const a = series[i];
    const b = series[Math.min(i + 1, series.length - 1)];
    if (!Number.isFinite(a === null || a === void 0 ? void 0 : a.x) || !Number.isFinite(a === null || a === void 0 ? void 0 : a.y))
        return Number.isFinite(b === null || b === void 0 ? void 0 : b.y) ? b.y : null;
    if (!Number.isFinite(b === null || b === void 0 ? void 0 : b.x) || !Number.isFinite(b === null || b === void 0 ? void 0 : b.y) || a.x === b.x)
        return a.y;
    const t = (freq - a.x) / (b.x - a.x);
    return a.y + t * (b.y - a.y);
}
function fit4DofFromTargets(targets, opts = {}) {
    var _a, _b;
    const maxIter = (_a = opts.maxIter) !== null && _a !== void 0 ? _a : 12;
    const baseParams = opts.baseParams || DEFAULT_PARAMS;
    const tweakIds = opts.tweakIds || Array.from(SOLVE_TWEAK_IDS);
    const desired = {
        air: Number.isFinite(targets.air) ? targets.air : null,
        top: Number.isFinite(targets.top) ? targets.top : null,
        back: Number.isFinite(targets.back) ? targets.back : null,
    };
    if (!desired.air && !desired.top && !desired.back)
        return null;
    const baselineResp = computeResponseSafe(adaptParamsToSolver(baseParams));
    const baselinePeaks = baselineResp ? modelPeaksFromResponse(baselineResp) : null;
    const clampCandidate = (id, value) => clampToBounds(id, value);
    const warm = { ...baseParams };
    if (tweakIds.includes("stiffness_top") || tweakIds.includes("stiffness_back")) {
        ["top", "back"].forEach((k) => {
            const tgt = desired[k];
            const base = baselinePeaks === null || baselinePeaks === void 0 ? void 0 : baselinePeaks[k];
            if (Number.isFinite(tgt) && Number.isFinite(base) && base > 0) {
                const ratio = tgt / base;
                const id = k === "top" ? "stiffness_top" : "stiffness_back";
                if (tweakIds.includes(id))
                    warm[id] = clampCandidate(id, warm[id] * ratio * ratio);
            }
        });
    }
    if (tweakIds.includes("volume_air") && Number.isFinite(desired.air) && Number.isFinite(baselinePeaks === null || baselinePeaks === void 0 ? void 0 : baselinePeaks.air) && baselinePeaks.air > 0) {
        const ratio = desired.air / baselinePeaks.air;
        warm.volume_air = clampCandidate("volume_air", warm.volume_air / (ratio * ratio));
    }
    const evaluate = (rawParams) => {
        const resp = computeResponseSafe(adaptParamsToSolver(rawParams));
        const peaks = resp ? modelPeaksFromResponse(resp) : null;
        if (!peaks)
            return { cost: Infinity, peaks: null };
        let cost = 0;
        ["air", "top", "back"].forEach((k) => {
            const target = desired[k];
            const predicted = peaks[k];
            if (!Number.isFinite(target) || !Number.isFinite(predicted) || !target)
                return;
            const diff = (predicted - target) / target;
            cost += diff * diff;
        });
        return { cost, peaks };
    };
    let best = { ...warm };
    let bestEval = evaluate(best);
    const steps = {};
    tweakIds.forEach((id) => {
        if (id.startsWith("stiffness_"))
            steps[id] = 0.2;
        else if (id === "volume_air")
            steps[id] = 0.15;
        else if (id === "area_hole")
            steps[id] = 0.12;
        else
            steps[id] = 0.15;
    });
    const ids = tweakIds.slice();
    for (let iter = 0; iter < maxIter; iter += 1) {
        let improved = false;
        for (const id of ids) {
            const baseVal = best[id];
            if (!Number.isFinite(baseVal))
                continue;
            const delta = steps[id];
            const tryFactor = (factor) => {
                const candidate = { ...best, [id]: clampCandidate(id, baseVal * factor) };
                return { candidate, eval: evaluate(candidate) };
            };
            const plus = tryFactor(1 + delta);
            const minus = tryFactor(1 - delta);
            let next = null;
            if (plus.eval.cost < bestEval.cost)
                next = plus;
            if (minus.eval.cost < ((_b = next === null || next === void 0 ? void 0 : next.eval.cost) !== null && _b !== void 0 ? _b : bestEval.cost))
                next = minus;
            if (next) {
                best = next.candidate;
                bestEval = next.eval;
                improved = true;
            }
        }
        ids.forEach((k) => {
            steps[k] *= improved ? 0.85 : 0.65;
        });
        if (Object.values(steps).every((s) => s < 0.02))
            break;
    }
    return { raw: best, evaluation: bestEval };
}
function toTrace(points, name, color, opts = {}) {
    if (!Array.isArray(points) || points.length === 0)
        return null;
    return {
        x: points.map(p => p.x),
        y: points.map(p => p.y),
        mode: "lines",
        name,
        line: { color, ...(opts || {}) },
        hovertemplate: "%{x:.1f} Hz · %{y:.1f} dB<extra>" + name + "</extra>"
    };
}
function computeYRange(series, pad = 6, minX, maxX) {
    if (!Array.isArray(series) || !series.length)
        return null;
    let min = Infinity;
    let max = -Infinity;
    series.forEach((pt) => {
        if (!Number.isFinite(pt === null || pt === void 0 ? void 0 : pt.y))
            return;
        if (Number.isFinite(minX) && Number.isFinite(maxX)) {
            if (!Number.isFinite(pt === null || pt === void 0 ? void 0 : pt.x))
                return;
            if (pt.x < minX || pt.x > maxX)
                return;
        }
        min = Math.min(min, pt.y);
        max = Math.max(max, pt.y);
    });
    if (!Number.isFinite(min) || !Number.isFinite(max))
        return null;
    const padding = Math.max(2, pad);
    return [min - padding, max + padding];
}
function getPlotAxes(plotEl) {
    const layout = plotEl._fullLayout;
    const xaxis = layout === null || layout === void 0 ? void 0 : layout.xaxis;
    const yaxis = layout === null || layout === void 0 ? void 0 : layout.yaxis;
    if (!xaxis || !yaxis || typeof xaxis.l2p !== "function" || typeof yaxis.l2p !== "function")
        return null;
    return { xaxis, yaxis };
}
function getAxisRange(xaxis) {
    if (Array.isArray(xaxis === null || xaxis === void 0 ? void 0 : xaxis.range) && xaxis.range.length === 2) {
        const min = Math.min(xaxis.range[0], xaxis.range[1]);
        const max = Math.max(xaxis.range[0], xaxis.range[1]);
        return [min, max];
    }
    return [50, 500];
}
function pointerEventToFreq(event, plotEl) {
    const axes = getPlotAxes(plotEl);
    if (!axes || typeof axes.xaxis.p2l !== "function")
        return null;
    const rect = plotEl.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const xPix = localX - (axes.xaxis._offset || 0);
    const clampedPix = Math.max(0, Math.min(axes.xaxis._length || 0, xPix));
    const raw = axes.xaxis.p2l(clampedPix);
    if (!Number.isFinite(raw))
        return null;
    const [min, max] = getAxisRange(axes.xaxis);
    return Math.max(min, Math.min(max, raw));
}
function ensureThumb(mode) {
    if (thumbEls[mode])
        return thumbEls[mode];
    const overlay = document.getElementById("plot_overlay");
    if (!overlay)
        return null;
    const root = document.createElement("div");
    root.className = "dof-thumb";
    root.dataset.mode = mode;
    root.style.setProperty("--thumb-color", MODE_META[mode].color);
    const label = document.createElement("div");
    label.className = "dof-thumb-label";
    const stem = document.createElement("div");
    stem.className = "dof-thumb-stem";
    const halo = document.createElement("div");
    halo.className = "dof-thumb-halo";
    const dot = document.createElement("div");
    dot.className = "dof-thumb-dot";
    root.append(label, stem, halo, dot);
    root.addEventListener("pointerdown", handleThumbPointerDown);
    overlay.appendChild(root);
    const entry = { root, label, stem, dot, halo };
    thumbEls[mode] = entry;
    return entry;
}
function positionThumb(thumb, freq, db, axes) {
    if (!Number.isFinite(freq) || !Number.isFinite(db)) {
        thumb.root.style.display = "none";
        return;
    }
    const x = axes.xaxis.l2p(freq) + (axes.xaxis._offset || 0);
    const y = axes.yaxis.l2p(db) + (axes.yaxis._offset || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        thumb.root.style.display = "none";
        return;
    }
    thumb.root.style.display = "";
    thumb.root.style.left = `${x}px`;
    thumb.root.style.top = `${y}px`;
}
function updateThumbs(response = lastResponse) {
    var _a, _b;
    const plotEl = document.getElementById("plot_dof");
    const overlay = document.getElementById("plot_overlay");
    if (!plotEl || !overlay)
        return;
    const axes = getPlotAxes(plotEl);
    const activeResponse = isWhatIfEnabled() && ((_a = lastWhatIfResponse === null || lastWhatIfResponse === void 0 ? void 0 : lastWhatIfResponse.total) === null || _a === void 0 ? void 0 : _a.length)
        ? lastWhatIfResponse
        : response;
    if (!axes || !((_b = activeResponse === null || activeResponse === void 0 ? void 0 : activeResponse.total) === null || _b === void 0 ? void 0 : _b.length)) {
        Object.values(thumbEls).forEach((thumb) => {
            if (thumb)
                thumb.root.style.display = "none";
        });
        updateModeCards(response, lastWhatIfResponse);
        return;
    }
    const peaks = modelPeaksFromResponse(activeResponse) || { air: null, top: null, back: null };
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
            const band = MODE_BANDS[mode];
            freq = (band.low + band.high) / 2;
        }
        const db = sampleSeriesAtFreq(activeResponse.total, freq);
        positionThumb(thumb, freq, db, axes);
        thumb.label.innerHTML = `${MODE_META[mode].label}<br><span>${freq.toFixed(1)} Hz</span>`;
        thumb.root.classList.toggle("dragging", dragState.mode === mode);
    });
    updateModeCards(response, lastWhatIfResponse);
}
function applyWhatIfParams(raw) {
    if (!isWhatIfEnabled())
        return;
    SOLVE_TWEAK_IDS.forEach((id) => {
        const overlay = overlaySliders[id];
        if (!overlay || !Number.isFinite(raw[id]))
            return;
        const displayValue = internalToDisplay(id, raw[id]);
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
        tweakIds: Array.from(SOLVE_TWEAK_IDS),
        baseParams: { ...baseParams },
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
function solveTargetsFast(targets, opts = {}) {
    const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
    const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
    const response = useWhatIf
        ? (lastWhatIfResponse || computeResponseForParams(baseParams))
        : lastResponse;
    const peaks = response ? modelPeaksFromResponse(response) : null;
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
    const desired = {
        air: Number.isFinite(targets.air) ? targets.air : null,
        top: Number.isFinite(targets.top) ? targets.top : null,
        back: Number.isFinite(targets.back) ? targets.back : null,
    };
    const warm = { ...baseParams };
    ["top", "back"].forEach((k) => {
        const target = desired[k];
        const base = peaks[k];
        if (!Number.isFinite(target) || !Number.isFinite(base) || base <= 0)
            return;
        const ratio = target / base;
        const id = k === "top" ? "stiffness_top" : "stiffness_back";
        warm[id] = clampToBounds(id, warm[id] * ratio * ratio);
    });
    if (Number.isFinite(desired.air) && Number.isFinite(peaks.air) && peaks.air > 0) {
        const ratio = desired.air / peaks.air;
        warm.volume_air = clampToBounds("volume_air", warm.volume_air / (ratio * ratio));
    }
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
    dragLockedTargets = lockResponse ? modelPeaksFromResponse(lockResponse) : { air: null, top: null, back: null };
    dragState.mode = mode;
    dragState.pointerId = event.pointerId;
    const freq = pointerEventToFreq(event, plotEl);
    if (Number.isFinite(freq))
        dragState.freq = freq;
    (_b = target.setPointerCapture) === null || _b === void 0 ? void 0 : _b.call(target, event.pointerId);
    updateThumbs();
}
function handleThumbPointerMove(event) {
    if (!dragState.mode || dragState.pointerId !== event.pointerId)
        return;
    const plotEl = document.getElementById("plot_dof");
    if (!plotEl)
        return;
    const freq = pointerEventToFreq(event, plotEl);
    if (!Number.isFinite(freq))
        return;
    dragState.freq = freq;
    updateThumbs();
    scheduleDragSolve(dragState.mode, dragState.freq);
}
function handleThumbPointerUp(event) {
    if (!dragState.mode || dragState.pointerId !== event.pointerId)
        return;
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
}
function bindPlotInteractions(plotEl) {
    if (plotListenersBound || typeof plotEl.on !== "function")
        return;
    plotListenersBound = true;
    plotEl.on("plotly_relayout", () => updateThumbs());
    window.addEventListener("resize", () => updateThumbs());
    window.addEventListener("pointermove", handleThumbPointerMove);
    window.addEventListener("pointerup", handleThumbPointerUp);
    window.addEventListener("pointercancel", handleThumbPointerUp);
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
        updateThumbs(null);
        return;
    }
    const traces = [];
    const totalTrace = toTrace(response.total, "Current", "#5fa8ff", { width: 3 });
    if (totalTrace)
        traces.push(totalTrace);
    const topTrace = toTrace(response.top, "Top", "#f5c46f", { width: 1.5, dash: "dot" });
    const airTrace = toTrace(response.air, "Air", "#8ecbff", { width: 1.5, dash: "dot" });
    const backTrace = toTrace(response.back, "Back", "#7ce3b1", { width: 1.5, dash: "dot" });
    const sidesTrace = toTrace(response.sides, "Sides", "#b4a5ff", { width: 1, dash: "dot" });
    [topTrace, airTrace, backTrace, sidesTrace].forEach((t) => { if (t)
        traces.push(t); });
    if ((_a = whatIfResponse === null || whatIfResponse === void 0 ? void 0 : whatIfResponse.total) === null || _a === void 0 ? void 0 : _a.length) {
        const whatIfTrace = toTrace(whatIfResponse.total, "What-If", "rgba(245,196,111,0.9)", { width: 2.5, dash: "dash" });
        if (whatIfTrace)
            traces.push(whatIfTrace);
    }
    const xRange = [50, 300];
    const layout = {
        margin: { l: 40, r: 20, t: 20, b: 50 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#eef2ff" },
        xaxis: {
            title: "Frequency (Hz)",
            range: xRange,
            gridcolor: "rgba(255,255,255,0.08)",
            zeroline: false,
        },
        yaxis: {
            title: "Level (dB)",
            gridcolor: "rgba(255,255,255,0.08)",
            autorange: false,
            zeroline: false,
        },
        showlegend: true,
    };
    const yRange = computeYRange(response.total, 6, xRange[0], xRange[1]);
    if (yRange)
        layout.yaxis = { ...layout.yaxis, range: yRange };
    const plotly = getPlotly();
    if (!plotly)
        return;
    plotly.react(plotEl, traces, layout, { displayModeBar: true, displaylogo: false })
        .then(() => {
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
function init() {
    const fromUrl = dofParamsFromLocation();
    if (fromUrl) {
        currentParams = { ...currentParams, ...fromUrl };
        if (Number.isFinite(fromUrl.model_order))
            currentOrder = fromUrl.model_order;
    }
    bindTabs();
    buildCards();
    setOrder(currentOrder);
    if (fromUrl)
        syncCardInputs();
    scheduleRender();
    const overlayToggle = document.getElementById("toggle_overlay");
    if (overlayToggle) {
        overlayToggle.addEventListener("change", () => {
            document.body.classList.toggle("whatif-mode", overlayToggle.checked);
            if (!overlayToggle.checked)
                resetWhatIf();
            scheduleRender();
        });
        document.body.classList.toggle("whatif-mode", overlayToggle.checked);
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
}
else {
    init();
}
