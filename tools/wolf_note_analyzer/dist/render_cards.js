/**
 * Card renderers for tap summary, played note, and wolf risk.
 */
import { EXCHANGE_DEPTH_DB_MIN_UI, UNLABELED_META, appState, deriveFirstThreePartialsFromNote, formatCentsValue, formatNote, renderBodyModesUi, } from "./state.js";
import { WolfNoteCore } from "./core.js";
const { classifyWolfRisk, isUnstableDecay } = WolfNoteCore;
export function addExtraModeAndRenderBodyModes() {
    const id = `extra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    appState.extraModes.push({ id, label: UNLABELED_META.label, peakFreq: null, q: null, source: "Manual" });
    renderBodyModesUi();
}
export function renderTapSummary() {
    const el = document.getElementById("tap_summary");
    if (!el)
        return;
    const inferred = Object.values(appState.bodyModes).some((m) => (m === null || m === void 0 ? void 0 : m.source) === "Inferred");
    if (!appState.tapSegments.length) {
        el.textContent = inferred
            ? "No taps detected yet. Modes inferred; override to confirm."
            : "No taps detected yet.";
    }
    else {
        el.textContent = inferred
            ? `${appState.tapSegments.length} tap${appState.tapSegments.length === 1 ? "" : "s"} detected. Some modes inferred; override to confirm.`
            : `${appState.tapSegments.length} tap${appState.tapSegments.length === 1 ? "" : "s"} detected.`;
    }
}
export function renderPlayedNote(result) {
    var _a, _b, _c, _d, _e, _f, _g;
    const summary = document.getElementById("note_summary");
    const harmonics = document.getElementById("note_harmonics");
    const status = document.getElementById("note_status");
    if (!summary || !harmonics || !status)
        return;
    if (!result) {
        summary.innerHTML = "--";
        harmonics.innerHTML = "";
        status.textContent = "Stable";
        status.className = "status-chip stable";
        return;
    }
    const components = deriveFirstThreePartialsFromNote(result);
    const drivers = (_b = (_a = appState.energyMetrics) === null || _a === void 0 ? void 0 : _a.drivers) !== null && _b !== void 0 ? _b : [];
    const primaryKey = (_f = (_e = (_d = (_c = appState.energyMetrics) === null || _c === void 0 ? void 0 : _c.primary) === null || _d === void 0 ? void 0 : _d.partial) === null || _e === void 0 ? void 0 : _e.key) !== null && _f !== void 0 ? _f : null;
    const driverMap = new Map(drivers.map((entry) => { var _a; return [(_a = entry === null || entry === void 0 ? void 0 : entry.partial) === null || _a === void 0 ? void 0 : _a.key, entry]; }));
    const renderRow = (comp) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const note = formatNote(comp.freq);
        const freqLabel = Number.isFinite(comp.freq) ? `${comp.freq.toFixed(1)} Hz` : "--";
        const centsLabel = (note === null || note === void 0 ? void 0 : note.cents) || "";
        const entry = driverMap.get(comp.key);
        const coupledMode = ((_b = (_a = entry === null || entry === void 0 ? void 0 : entry.driver) === null || _a === void 0 ? void 0 : _a.mode) === null || _b === void 0 ? void 0 : _b.label) || null;
        const coupledCents = (_d = (_c = entry === null || entry === void 0 ? void 0 : entry.driver) === null || _c === void 0 ? void 0 : _c.cents) !== null && _d !== void 0 ? _d : null;
        const nearMode = ((_f = (_e = entry === null || entry === void 0 ? void 0 : entry.nearest) === null || _e === void 0 ? void 0 : _e.mode) === null || _f === void 0 ? void 0 : _f.label) || null;
        const nearCents = (_h = (_g = entry === null || entry === void 0 ? void 0 : entry.nearest) === null || _g === void 0 ? void 0 : _g.cents) !== null && _h !== void 0 ? _h : null;
        let chip = "";
        if (coupledMode) {
            const centsTag = formatCentsValue(coupledCents);
            chip = `<span class="note-chip coupled">Coupled (${coupledMode}${centsTag ? ` ${centsTag}` : ""})</span>`;
        }
        else if (((_j = entry === null || entry === void 0 ? void 0 : entry.nearest) === null || _j === void 0 ? void 0 : _j.tier) === "strong" && nearMode) {
            const centsTag = formatCentsValue(nearCents);
            chip = `<span class="note-chip near">Near ${nearMode}${centsTag ? ` ${centsTag}` : ""}</span>`;
        }
        else if (((_k = entry === null || entry === void 0 ? void 0 : entry.nearest) === null || _k === void 0 ? void 0 : _k.tier) === "possible" && nearMode) {
            const centsTag = formatCentsValue(nearCents);
            chip = `<span class="note-chip possible">Possible ${nearMode}${centsTag ? ` ${centsTag}` : ""}</span>`;
        }
        const rowClass = comp.key === primaryKey ? "note-row is-primary" : "note-row";
        return `
      <div class="${rowClass}">
        <div class="note-label">${comp.label}${chip}</div>
        <div class="note-name">${(note === null || note === void 0 ? void 0 : note.name) || "--"}</div>
        <div class="note-freq">${freqLabel}</div>
        <div class="note-cents">${centsLabel}</div>
      </div>
    `;
    };
    summary.innerHTML = components.length ? renderRow(components[0]) : "--";
    harmonics.innerHTML = components.length ? components.slice(1).map(renderRow).join("") : "";
    const unstable = ((_g = appState.partialInstability) === null || _g === void 0 ? void 0 : _g.f0)
        ? appState.partialInstability.f0.unstable
        : isUnstableDecay(result);
    status.textContent = unstable ? "Unstable" : "Stable";
    status.className = `status-chip ${unstable ? "unstable" : "stable"}`;
}
export function renderWolfRisk(result, status) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const riskChip = document.getElementById("wolf_risk");
    const reason = document.getElementById("wolf_reason");
    const meta = document.getElementById("wolf_meta");
    if (!riskChip || !reason || !meta)
        return;
    if (!result) {
        riskChip.textContent = "None";
        riskChip.className = "risk-chip none";
        reason.textContent = "No coupling flags yet.";
        meta.textContent = "";
        return;
    }
    const risk = status.couplingOk ? classifyWolfRisk(result.wolfScore) : "None";
    riskChip.textContent = risk;
    riskChip.className = `risk-chip ${risk.toLowerCase()}`;
    reason.textContent = status.reason;
    const primary = status.primary;
    const modeLabel = ((_b = (_a = primary === null || primary === void 0 ? void 0 : primary.driver) === null || _a === void 0 ? void 0 : _a.mode) === null || _b === void 0 ? void 0 : _b.label) || ((_d = (_c = primary === null || primary === void 0 ? void 0 : primary.nearest) === null || _c === void 0 ? void 0 : _c.mode) === null || _d === void 0 ? void 0 : _d.label) || "--";
    const modeFreq = Number.isFinite((_f = (_e = primary === null || primary === void 0 ? void 0 : primary.driver) === null || _e === void 0 ? void 0 : _e.mode) === null || _f === void 0 ? void 0 : _f.peakFreq)
        ? `${primary.driver.mode.peakFreq.toFixed(1)} Hz`
        : Number.isFinite((_h = (_g = primary === null || primary === void 0 ? void 0 : primary.nearest) === null || _g === void 0 ? void 0 : _g.mode) === null || _h === void 0 ? void 0 : _h.peakFreq)
            ? `${primary.nearest.mode.peakFreq.toFixed(1)} Hz`
            : "";
    const modeDisplay = modeFreq ? `${modeLabel} ${modeFreq}` : modeLabel;
    const centsLabel = (primary === null || primary === void 0 ? void 0 : primary.driver)
        ? formatCentsValue(primary.driver.cents)
        : (primary === null || primary === void 0 ? void 0 : primary.nearest)
            ? formatCentsValue(primary.nearest.cents)
            : "";
    let couplingDetail = "none within 50c";
    if (primary === null || primary === void 0 ? void 0 : primary.driver) {
        couplingDetail = `${modeDisplay} ${centsLabel}`.trim();
    }
    else if ((primary === null || primary === void 0 ? void 0 : primary.nearest) && primary.nearest.tier !== "none") {
        couplingDetail = `${modeDisplay} ${centsLabel}`.trim();
    }
    const dominance = Boolean((primary === null || primary === void 0 ? void 0 : primary.dominanceTime) && !(primary === null || primary === void 0 ? void 0 : primary.sharedBand) && (primary === null || primary === void 0 ? void 0 : primary.slopeIndependent));
    const exchangeOk = Number.isFinite(primary === null || primary === void 0 ? void 0 : primary.exchangeDepthDb) && primary.exchangeDepthDb >= EXCHANGE_DEPTH_DB_MIN_UI;
    const componentLabel = ((_j = primary === null || primary === void 0 ? void 0 : primary.partial) === null || _j === void 0 ? void 0 : _j.label) || "--";
    const confidence = (primary === null || primary === void 0 ? void 0 : primary.confidence) || "Low";
    const lines = [
        `Coupling detected: ${status.couplingOk ? "Yes" : "No"} (${couplingDetail || "none"})`,
        `Dominance crossover: ${dominance ? "Yes" : "No"}`,
        `Exchange depth >= ${EXCHANGE_DEPTH_DB_MIN_UI} dB: ${exchangeOk ? "Yes" : "No"}`,
        `Unstable decay: ${status.instability ? "Yes" : "No"}`,
        `Component: ${componentLabel}`,
        `Body mode: ${modeDisplay}`,
        `Confidence: ${confidence}`,
    ];
    meta.innerHTML = lines.map((c) => `<div>${c}</div>`).join("");
}
if (typeof window !== "undefined") {
    window.addExtraModeAndRenderBodyModes = addExtraModeAndRenderBodyModes;
    window.renderTapSummary = renderTapSummary;
    window.renderPlayedNote = renderPlayedNote;
    window.renderWolfRisk = renderWolfRisk;
}
