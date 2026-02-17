/**
 * Wolf Note Analyzer (shared state + small helpers).
 *
 * This file defines global configuration + `appState`, and provides helpers
 * shared across rendering and orchestration.
 *
 * Signal-processing and coupling logic lives in `core.ts`.
 */
var _a;
import { WolfNoteCore } from "./core.js";
export const fftState = window.FFTState || {};
const freqToNoteCents = ((_a = window.FFTUtils) === null || _a === void 0 ? void 0 : _a.freqToNoteCents) ||
    undefined;
export const fftEngine = createFftEngine({});
const wolfNoteCore = WolfNoteCore;
const { analyzeModes, bandOverlapRatio, buildPartialDriverMap, centsBetween, classifyWolfRisk, computePartialInstabilityMap, demodulatePartial, confidenceFrom, couplingTier, estimateQFromDb, fitTwoModeEnvelopeAndComputeWolfMetrics, isUnstableDecay, lateTimeSlope, lateTimeStats, lateWindowIndices, modeBandWidth, normalizeEnvelope, partialBandWidth, pickNearestCandidate, pickPrimaryDriver, } = wolfNoteCore;
export const MODE_META = {
    air: { label: "Air", alias: "A0 / T(1,1)1", color: "#8ecbff", tooltip: "Air mode A0 (T(1,1)1)" },
    top: { label: "Top", alias: "T(1,1)2", color: "#f5c46f", tooltip: "Top mode T(1,1)2" },
    back: { label: "Back", alias: "T(1,1)3", color: "#7ce3b1", tooltip: "Back mode T(1,1)3" },
};
export const UNLABELED_META = {
    label: "Unlabeled",
    color: "#a7b3c5",
    tooltip: "Unlabeled resonance (late-time confirmed)",
};
export const MODE_BANDS = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 },
};
export const ENERGY_COLORS = {
    body: "rgba(245, 175, 25, 0.8)",
    harmonic: "rgba(95, 200, 190, 0.7)",
    fundamental: "rgba(110, 180, 255, 0.85)",
};
export const HARMONIC3_COLOR = "rgba(125, 210, 200, 0.7)";
export const HARMONIC3_FILL = "rgba(125, 210, 200, 0.3)";
export const EXCHANGE_DEPTH_DB_MIN_UI = 3;
export const ENERGY_DB_FLOOR = -60;
export const DEFAULT_F0_SETTINGS = {
    f0Min: 60,
    f0Max: 450,
    hpsDownsample: 2,
    hpsHarmonics: 4,
};
export const appState = {
    tapSegments: [],
    bodyModes: { air: null, top: null, back: null },
    modeStatus: { air: "--", top: "--", back: "--" },
    modeOverrides: {},
    extraModes: [],
    noteSlices: [],
    noteResults: [],
    selectedNoteId: null,
    manualSelection: null,
    autoSelect: true,
    analysisToken: 0,
    energyMetrics: null,
    energySeries: null,
    energyMode: null,
    partialInstability: null,
};
let fftDefaultRanges = null;
let waveUpdatingShapes = false;
export function getFftDefaultRanges() {
    return fftDefaultRanges;
}
export function setFftDefaultRanges(ranges) {
    fftDefaultRanges = ranges;
}
export function isWaveUpdatingShapes() {
    return waveUpdatingShapes;
}
export function setWaveUpdatingShapes(value) {
    waveUpdatingShapes = value;
}
export function setWaveStatus(text) {
    const el = document.getElementById("wave_status");
    if (el)
        el.textContent = text;
}
function median(arr) {
    if (!arr.length)
        return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function clamp01(x) {
    return Math.min(1, Math.max(0, x));
}
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string")
        return `rgba(245, 175, 25, ${alpha})`;
    let h = hex.trim();
    if (h.startsWith("#"))
        h = h.slice(1);
    if (h.length === 3)
        h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6)
        return `rgba(245, 175, 25, ${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v)))
        return `rgba(245, 175, 25, ${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function formatNote(freq) {
    if (!Number.isFinite(freq))
        return null;
    const note = freqToNoteCents === null || freqToNoteCents === void 0 ? void 0 : freqToNoteCents(freq);
    if (!note)
        return null;
    const centsNum = Number.isFinite(note.centsNum) ? note.centsNum : 0;
    const sign = centsNum >= 0 ? "+" : "";
    return { name: note.name, cents: `${sign}${Math.round(centsNum)}c` };
}
function formatHz(val, digits = 1) {
    if (!Number.isFinite(val))
        return "--";
    return `${val.toFixed(digits)} Hz`;
}
function formatCentsValue(cents) {
    if (!Number.isFinite(cents))
        return "";
    const sign = cents >= 0 ? "+" : "";
    return `${sign}${Math.round(cents)}c`;
}
function deriveFirstThreeFrequenciesFromNote(noteResult) {
    const partials = deriveFirstThreePartialsFromNote(noteResult);
    return partials.map((p) => ({ label: p.label, freq: p.freq }));
}
function deriveFirstThreePartialsFromNote(noteResult) {
    const f0 = noteResult === null || noteResult === void 0 ? void 0 : noteResult.f0;
    if (!Number.isFinite(f0))
        return [];
    return [
        { key: "f0", label: "Fundamental", freq: f0 },
        { key: "h2", label: "2nd Harmonic", freq: f0 * 2 },
        { key: "h3", label: "3rd Harmonic", freq: f0 * 3 },
    ];
}
function allBodyModes() {
    const baseModes = Object.keys(MODE_META).map((key) => {
        var _a, _b;
        const base = appState.bodyModes[key] || { peakFreq: null, q: null, source: "--" };
        const mode = modeFromOverrides(key, base);
        return {
            id: key,
            key,
            label: MODE_META[key].label,
            alias: MODE_META[key].alias || "",
            color: MODE_META[key].color,
            tooltip: MODE_META[key].tooltip,
            peakFreq: (_a = mode.peakFreq) !== null && _a !== void 0 ? _a : null,
            q: (_b = mode.q) !== null && _b !== void 0 ? _b : null,
            source: appState.modeStatus[key] || mode.source || "--",
            isExtra: false,
        };
    });
    const extraModes = (appState.extraModes || []).map((mode) => {
        var _a, _b;
        return ({
            id: mode.id,
            key: mode.id,
            label: mode.label || UNLABELED_META.label,
            alias: mode.alias || "Late-time confirmed",
            color: UNLABELED_META.color,
            tooltip: UNLABELED_META.tooltip,
            peakFreq: (_a = mode.peakFreq) !== null && _a !== void 0 ? _a : null,
            q: (_b = mode.q) !== null && _b !== void 0 ? _b : null,
            source: mode.source || "Manual",
            isExtra: true,
        });
    });
    return [...baseModes, ...extraModes];
}
function detectTaps(wave, sampleRate, opts = {}) {
    var _a, _b, _c, _d;
    const windowMs = (_a = opts.windowMs) !== null && _a !== void 0 ? _a : 10;
    const thresholdMult = (_b = opts.thresholdMult) !== null && _b !== void 0 ? _b : 6;
    const minGapMs = (_c = opts.minGapMs) !== null && _c !== void 0 ? _c : 80;
    const minLenMs = (_d = opts.minLenMs) !== null && _d !== void 0 ? _d : 40;
    const windowSamples = Math.max(1, Math.round((windowMs / 1000) * sampleRate));
    const smoothed = [];
    let acc = 0;
    for (let i = 0; i < wave.length; i += 1) {
        acc += Math.abs(wave[i]);
        if (i >= windowSamples)
            acc -= Math.abs(wave[i - windowSamples]);
        smoothed.push(acc / windowSamples);
    }
    const base = median(smoothed);
    const thresh = thresholdMult * base;
    const minGapSamples = Math.round((minGapMs / 1000) * sampleRate);
    const minLenSamples = Math.round((minLenMs / 1000) * sampleRate);
    const taps = [];
    let i = 0;
    while (i < smoothed.length) {
        if (smoothed[i] > thresh) {
            const start = i;
            while (i < smoothed.length && smoothed[i] > thresh / 2)
                i += 1;
            const end = i;
            if (end - start >= minLenSamples) {
                taps.push({ start, end });
                i = end + minGapSamples;
                continue;
            }
        }
        i += 1;
    }
    return taps;
}
async function averageTapSpectra(wave, sampleRate, taps) {
    if (!taps.length)
        return null;
    const windowMs = 350;
    const windowSamples = Math.round((windowMs / 1000) * sampleRate);
    const spectra = [];
    for (let t = 0; t < taps.length; t += 1) {
        const slice = wave.slice(taps[t].start, Math.min(wave.length, taps[t].start + windowSamples));
        if (!slice.length)
            continue;
        spectra.push(fftEngine.magnitude(slice, sampleRate, { window: "hann", maxFreq: 1200 }));
    }
    if (!spectra.length)
        return null;
    const specs = await Promise.all(spectra);
    const base = specs[0];
    const sum = new Array(base.mags.length).fill(0);
    specs.forEach((s) => {
        s.mags.forEach((m, idx) => { sum[idx] += m; });
    });
    const avgMags = sum.map((s) => s / specs.length);
    return { freqs: base.freqs, mags: avgMags };
}
async function estimateF0Hps(wave, sampleRate, settings) {
    var _a;
    const targetSampleRate = sampleRate / Math.max(1, settings.hpsDownsample);
    const waveNumbers = Array.from(wave);
    const resampled = settings.hpsDownsample > 1
        ? waveNumbers.filter((_, idx) => idx % settings.hpsDownsample === 0)
        : waveNumbers;
    const spectrum = await fftEngine.magnitude(resampled, targetSampleRate, { maxFreq: 1000, window: "hann" });
    const mags = spectrum.mags || [];
    const freqs = spectrum.freqs || [];
    if (!mags.length)
        return null;
    const products = mags.slice();
    for (let h = 2; h <= settings.hpsHarmonics; h += 1) {
        for (let i = 0; i < products.length; i += 1) {
            const idx = Math.floor(i * h);
            if (idx < mags.length) {
                products[i] *= mags[idx];
            }
            else {
                products[i] *= 0.5;
            }
        }
    }
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < products.length; i += 1) {
        if (products[i] > bestVal) {
            bestVal = products[i];
            bestIdx = i;
        }
    }
    const binWidth = freqs.length > 1 ? Math.abs(freqs[1] - freqs[0]) : null;
    let refinedIdx = bestIdx;
    if (bestIdx > 0 && bestIdx < products.length - 1) {
        const a = products[bestIdx - 1];
        const b = products[bestIdx];
        const c = products[bestIdx + 1];
        const denom = a - (2 * b) + c;
        if (Math.abs(denom) > 1e-9) {
            const delta = 0.5 * (a - c) / denom;
            refinedIdx = bestIdx + Math.max(-1.5, Math.min(1.5, delta));
        }
    }
    const baseF0 = Number.isFinite(binWidth)
        ? ((_a = freqs[bestIdx]) !== null && _a !== void 0 ? _a : refinedIdx * binWidth)
        : freqs[bestIdx];
    const f0Raw = Number.isFinite(binWidth) ? (freqs[bestIdx] + (refinedIdx - bestIdx) * binWidth) : baseF0;
    const refineByHarmonics = (f0Candidate) => {
        if (!Number.isFinite(f0Candidate))
            return { freq: f0Candidate, score: -Infinity };
        const maxDivisor = Math.max(3, settings.hpsHarmonics * 2);
        let bestFreq = f0Candidate;
        let bestScore = -Infinity;
        const maxHarm = 6;
        const nearestMag = (target) => {
            let idx = 0;
            let bestDist = Infinity;
            freqs.forEach((f, i) => {
                const d = Math.abs(f - target);
                if (d < bestDist) {
                    bestDist = d;
                    idx = i;
                }
            });
            return mags[idx] || 0;
        };
        for (let div = 1; div <= maxDivisor; div += 1) {
            const cand = f0Candidate / div;
            if (!Number.isFinite(cand) || cand < settings.f0Min || cand > settings.f0Max)
                continue;
            let score = 0;
            for (let h = 1; h <= maxHarm; h += 1) {
                score += nearestMag(cand * h);
            }
            if (score > bestScore || (score === bestScore && cand < bestFreq)) {
                bestScore = score;
                bestFreq = cand;
            }
        }
        return { freq: bestFreq, score: bestScore };
    };
    const { freq: f0 } = refineByHarmonics(f0Raw);
    if (!f0 || f0 < settings.f0Min || f0 > settings.f0Max)
        return null;
    return f0;
}
async function analyzeNoteSlice(slice) {
    const attackSkipMs = 40;
    const analysis = await window.ModalRingdown.analyzeRingdown({
        buffer: slice.wave,
        sampleRate: slice.sampleRate,
        attackSkipMs,
    });
    const f0 = analysis.f0 || await estimateF0Hps(slice.wave, slice.sampleRate, DEFAULT_F0_SETTINGS);
    const envFull = analysis.envelopeFull || [];
    let envelope = normalizeEnvelope(envFull);
    let dt = analysis.dt;
    if (Number.isFinite(f0)) {
        const f0Val = f0;
        const bwFund = Math.max(40, f0Val * 0.03);
        const fundEnv = demodulatePartial(slice.wave, slice.sampleRate, f0Val, bwFund, 20);
        envelope = normalizeEnvelope(fundEnv);
        dt = 1 / slice.sampleRate;
    }
    const twoModeFit = fitTwoModeEnvelopeAndComputeWolfMetrics(envelope, dt, { attackSkipMs, maxAnalysisMs: 2000 });
    return {
        envelope,
        dt,
        f0: Number.isFinite(f0) ? f0 : null,
        wolfScore: twoModeFit.wolfScore,
        category: twoModeFit.category,
        wobbleDepth: twoModeFit.wobbleDepth,
        beatRate: twoModeFit.deltaF,
        stability: twoModeFit.r2,
    };
}
function pickWolfiestNote() {
    if (!appState.noteResults.length)
        return null;
    let best = appState.noteResults[0];
    appState.noteResults.forEach((n) => {
        const score = Number.isFinite(n.wolfScore) ? n.wolfScore : 0;
        const bestScore = Number.isFinite(best.wolfScore) ? best.wolfScore : 0;
        if (score > bestScore)
            best = n;
    });
    return best;
}
function modeFromOverrides(key, fallback) {
    const override = appState.modeOverrides[key];
    if (Number.isFinite(override)) {
        return { ...fallback, peakFreq: override, source: "Manual" };
    }
    return fallback;
}
function updateBodyModeStatus() {
    Object.keys(MODE_BANDS).forEach((key) => {
        if (Number.isFinite(appState.modeOverrides[key])) {
            appState.modeStatus[key] = "Manual";
            return;
        }
        const m = appState.bodyModes[key];
        if (m && Number.isFinite(m.peakFreq)) {
            appState.modeStatus[key] = m.source || "Detected";
        }
        else {
            appState.modeStatus[key] = "--";
        }
    });
}
function statusClassFromChipLabel(status) {
    if (typeof status !== "string" || !status)
        return "unknown";
    return status.toLowerCase().replace(/[^a-z]+/g, "");
}
function proximityLevelFromAbsCents(absCents) {
    if (absCents <= 7)
        return "high";
    if (absCents <= 15)
        return "medium";
    if (absCents <= 30)
        return "low";
    return "none";
}
function modeProximityLabel(level) {
    if (level === "high")
        return "High proximity";
    if (level === "medium")
        return "Medium proximity";
    if (level === "low")
        return "Low proximity";
    return "No proximity";
}
function modeProximityTheme(level) {
    if (level === "high")
        return { tint: "rgba(240, 120, 60, 0.24)", border: "rgba(240, 120, 60, 0.45)" };
    if (level === "medium")
        return { tint: "rgba(245, 196, 111, 0.24)", border: "rgba(245, 196, 111, 0.45)" };
    if (level === "low")
        return { tint: "rgba(86, 180, 233, 0.18)", border: "rgba(86, 180, 233, 0.4)" };
    return { tint: "rgba(120, 140, 170, 0.12)", border: "rgba(120, 140, 170, 0.3)" };
}
function computeModeProximity(modeFreqHz, components) {
    if (!Number.isFinite(modeFreqHz))
        return { level: "none", label: "Enter mode freq", cents: null };
    if (!components.length)
        return { level: "none", label: "No note selected", cents: null };
    if (typeof centsBetween !== "function")
        return { level: "none", label: "No cents helper", cents: null };
    let bestTarget = null;
    let bestCents = null;
    let bestAbs = Infinity;
    components.forEach((comp) => {
        const cents = centsBetween(modeFreqHz, comp.freq);
        const abs = Math.abs(cents);
        if (abs < bestAbs) {
            bestAbs = abs;
            bestCents = cents;
            bestTarget = comp.label;
        }
    });
    const level = proximityLevelFromAbsCents(bestAbs);
    const centsLabel = Number.isFinite(bestCents)
        ? `${bestCents >= 0 ? "+" : ""}${Math.round(bestCents)}c`
        : "";
    const label = bestTarget ? `${bestTarget} ${centsLabel}` : "No note selected";
    return { level, label, cents: bestCents };
}
function renderBodyModesUi() {
    var _a, _b;
    const list = document.getElementById("body_modes_list");
    if (!list)
        return;
    updateBodyModeStatus();
    const selected = (_b = (_a = window).getSelectedNoteData) === null || _b === void 0 ? void 0 : _b.call(_a);
    const components = deriveFirstThreePartialsFromNote(selected === null || selected === void 0 ? void 0 : selected.result);
    const modes = allBodyModes();
    list.innerHTML = modes.map((mode) => {
        var _a;
        const freq = Number.isFinite(mode.peakFreq) ? mode.peakFreq.toFixed(1) : "";
        const qLabel = Number.isFinite(mode.q) ? `Q ${Math.round(mode.q)}` : "Q --";
        const status = mode.source || "--";
        const statusClass = statusClassFromChipLabel(status);
        const gradient = `linear-gradient(120deg, ${hexToRgba(mode.color, 0.18)}, rgba(0,0,0,0.28))`;
        const proximity = computeModeProximity((_a = mode.peakFreq) !== null && _a !== void 0 ? _a : null, components);
        const riskLabel = modeProximityLabel(proximity.level);
        const { tint: riskTint, border: riskBorder } = modeProximityTheme(proximity.level);
        const background = proximity.level !== "none"
            ? `linear-gradient(130deg, ${riskTint}, rgba(0,0,0,0)), ${gradient}`
            : gradient;
        const metaLabel = mode.isExtra ? "Unlabeled" : "";
        const aliasLabel = mode.alias ? `<span class="mode-alias">${mode.alias}</span>` : "";
        return `
      <div class="body-mode-row risk-${proximity.level}" data-mode="${mode.id}" data-extra="${mode.isExtra ? "1" : "0"}" style="background:${background};border-color:${riskBorder}">
        <div class="mode-row-header">
          <div class="mode-label" title="${mode.tooltip}">
            <span class="mode-dot" style="--mode-dot: ${mode.color}"></span>
            <span class="mode-name">${mode.label}</span>
            ${aliasLabel}
            ${metaLabel ? `<span class="mode-tag">${metaLabel}</span>` : ""}
          </div>
          <div class="mode-risk mode-risk-${proximity.level}">${riskLabel}</div>
          ${mode.isExtra ? `<button class="mode-remove" data-remove="${mode.id}" title="Remove">×</button>` : ""}
        </div>
        <div class="mode-fields">
          <div class="mode-freq">
            <label>Frequency</label>
            <div class="mode-input">
              <input type="number" inputmode="decimal" step="0.1" min="0" value="${freq}">
              <span class="unit">Hz</span>
            </div>
          </div>
          <div class="mode-q">
            <label>Q</label>
            <div class="mode-q-value">${qLabel}</div>
          </div>
          <div class="mode-source">
            <label>Source</label>
            <div class="mode-chip mode-chip-${statusClass}">${status}</div>
          </div>
          <div class="mode-proximity">
            <label>Nearest</label>
            <div class="mode-proximity-value">${proximity.label}</div>
          </div>
        </div>
      </div>
    `;
    }).join("");
    list.querySelectorAll(".body-mode-row").forEach((row) => {
        const key = row.getAttribute("data-mode");
        const isExtra = row.getAttribute("data-extra") === "1";
        const input = row.querySelector("input");
        if (!input)
            return;
        input.addEventListener("change", () => {
            var _a, _b;
            const val = Number(input.value);
            if (isExtra) {
                const target = appState.extraModes.find((m) => m.id === key);
                if (target)
                    target.peakFreq = Number.isFinite(val) && val > 0 ? val : null;
            }
            else {
                if (Number.isFinite(val) && val > 0) {
                    appState.modeOverrides[key] = val;
                    appState.modeStatus[key] = "Manual";
                }
                else {
                    delete appState.modeOverrides[key];
                }
            }
            renderBodyModesUi();
            (_b = (_a = window).updateForSelection) === null || _b === void 0 ? void 0 : _b.call(_a).catch((err) => console.error("[Wolf] update after manual mode failed", err));
        });
    });
    list.querySelectorAll(".mode-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
            var _a, _b;
            const id = btn.getAttribute("data-remove");
            if (!id)
                return;
            appState.extraModes = appState.extraModes.filter((m) => m.id !== id);
            renderBodyModesUi();
            (_b = (_a = window).updateForSelection) === null || _b === void 0 ? void 0 : _b.call(_a).catch((err) => console.error("[Wolf] update after remove mode failed", err));
        });
    });
}
export { median, clamp01, hexToRgba, formatNote, formatHz, formatCentsValue, deriveFirstThreeFrequenciesFromNote, deriveFirstThreePartialsFromNote, allBodyModes, detectTaps, averageTapSpectra, estimateF0Hps, analyzeNoteSlice, pickWolfiestNote, modeFromOverrides, updateBodyModeStatus, statusClassFromChipLabel, proximityLevelFromAbsCents, modeProximityLabel, modeProximityTheme, computeModeProximity, renderBodyModesUi, };
