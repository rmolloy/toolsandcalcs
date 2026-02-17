/**
 * Energy-series computation helpers (pure math, no DOM/Plotly).
 */
import { ENERGY_DB_FLOOR, clamp01 } from "./state.js";
import { WolfNoteCore } from "./core.js";
const ENERGY_STRIDE_TARGET = 360;
const { demodulatePartial, modeBandWidth, partialBandWidth, normalizeEnvelope } = WolfNoteCore;
function buildBodyEnvelopes(slice, modeList) {
    const bodyEnvs = {};
    modeList.forEach((mode) => {
        bodyEnvs[mode.id] = demodulatePartial(slice.wave, slice.sampleRate, mode.peakFreq, modeBandWidth(mode.peakFreq), 20);
    });
    return bodyEnvs;
}
function accumulateEnergyShares(slice, fundEnv, harm2Env, harm3Env, bodyEnvs, modeList) {
    const len = fundEnv.length;
    const stride = Math.max(1, Math.ceil(len / ENERGY_STRIDE_TARGET));
    const t = [];
    const partialRaw = { f0: [], h2: [], h3: [] };
    const partialShares = { f0: [], h2: [], h3: [] };
    const bodyRaw = {};
    const bodyShares = {};
    modeList.forEach((m) => {
        bodyRaw[m.id] = [];
        bodyShares[m.id] = [];
    });
    const totalRaw = [];
    for (let i = 0; i < len; i += stride) {
        const f = fundEnv[i] || 0;
        const h2 = harm2Env[i] || 0;
        const h3 = harm3Env[i] || 0;
        const bodyVals = {};
        let total = f + h2 + h3;
        modeList.forEach((mode) => {
            const env = bodyEnvs[mode.id];
            const val = env ? (env[i] || 0) : 0;
            bodyVals[mode.id] = val;
            total += val;
        });
        total = Math.max(1e-9, total);
        t.push(i / slice.sampleRate);
        partialRaw.f0.push(f);
        partialRaw.h2.push(h2);
        partialRaw.h3.push(h3);
        partialShares.f0.push(f / total);
        partialShares.h2.push(h2 / total);
        partialShares.h3.push(h3 / total);
        modeList.forEach((mode) => {
            const val = bodyVals[mode.id] || 0;
            bodyRaw[mode.id].push(val);
            bodyShares[mode.id].push(val / total);
        });
        totalRaw.push(total);
    }
    return { t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw };
}
function normalizeEnergyLevels(partialRaw, bodyRaw, modeList) {
    const partialNorm = {
        f0: normalizeEnvelope(partialRaw.f0),
        h2: normalizeEnvelope(partialRaw.h2),
        h3: normalizeEnvelope(partialRaw.h3),
    };
    const bodyNorm = {};
    modeList.forEach((mode) => {
        bodyNorm[mode.id] = normalizeEnvelope(bodyRaw[mode.id] || []);
    });
    return { partialNorm, bodyNorm };
}
function computeLevelScale(totalRaw) {
    const maxTotal = Math.max(...totalRaw, 1e-9);
    return totalRaw.map((val) => {
        const db = 20 * Math.log10(val / maxTotal);
        if (!Number.isFinite(db))
            return 0;
        return clamp01((db - ENERGY_DB_FLOOR) / -ENERGY_DB_FLOOR);
    });
}
function composeEnergySeries(modeList, t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw) {
    const levelScale = computeLevelScale(totalRaw);
    const { partialNorm, bodyNorm } = normalizeEnergyLevels(partialRaw, bodyRaw, modeList);
    return {
        t,
        partialShares,
        bodyShares,
        partialRaw,
        bodyRaw,
        partialNorm,
        bodyNorm,
        levelScale,
        bodyModes: modeList,
        dominanceTime: null,
        exchangeDepthDb: null,
    };
}
export function computeEnergySeries(slice, f0, modes) {
    if (!slice || !Number.isFinite(f0))
        return null;
    const modeList = (modes || []).filter((m) => Number.isFinite(m === null || m === void 0 ? void 0 : m.peakFreq));
    const fundEnv = demodulatePartial(slice.wave, slice.sampleRate, f0, partialBandWidth("f0", f0), 20);
    const harm2Env = demodulatePartial(slice.wave, slice.sampleRate, f0 * 2, partialBandWidth("h2", f0 * 2), 20);
    const harm3Env = demodulatePartial(slice.wave, slice.sampleRate, f0 * 3, partialBandWidth("h3", f0 * 3), 20);
    const bodyEnvs = buildBodyEnvelopes(slice, modeList);
    const { t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw, } = accumulateEnergyShares(slice, fundEnv, harm2Env, harm3Env, bodyEnvs, modeList);
    return composeEnergySeries(modeList, t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw);
}
if (typeof window !== "undefined") {
    window.computeEnergySeries = computeEnergySeries;
}
