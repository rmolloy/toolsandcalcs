import { aggregateDecayQ } from "./resonate_q_aggregation.js?rev=bd81c33a8408";
import { qSettingsResolve } from "./resonate_q_settings.js?rev=bd81c33a8408";
export function resolveQForModeCards(state, cards, fit) {
    if (qSettingsResolve(state).method === "spectral")
        return cards;
    return cards.map((card) => resolveDecayQForMode(state, card, fit));
}
function resolveDecayQForMode(state, card, fit) {
    const aggregation = qSettingsResolve(state).aggregation;
    const taps = decayQFitsForMode(state, card, fit);
    const pending = taps.some((tap) => tap.pending);
    return { ...card, q: pending ? null : aggregateDecayQ(taps.map((tap) => tap.q), aggregation), qEvidence: {
            method: "decay", aggregation, spectralQ: spectralQFromMode(card), taps, ...(pending ? { pending: true } : {}),
        } };
}
export function spectralQFromMode(mode) {
    return mode.qEvidence ? mode.qEvidence.spectralQ : mode.q;
}
function decayQFitsForMode(state, card, fit) {
    if (!fit || !Number.isFinite(card.freq))
        return [];
    return tapIndexesInAnalysisWindow(state).map((tapIndex) => decayQFitForTap(state, card, tapIndex, fit));
}
function decayQFitForTap(state, card, tapIndex, fit) {
    const data = fit({ ...state, peakAnalysisSelectedTapIndex: tapIndex }, card);
    return { tapIndex, q: data?.result.Q ?? null, flags: data?.result.flags ?? [], ...(data?.pending ? { pending: true } : {}) };
}
export function tapIndexesInAnalysisWindow(state) {
    const taps = state.tapSegments || [];
    return taps.map((tap, index) => ({ tap, index }))
        .filter(({ tap }) => tapOnsetIsInAnalysisWindow(state, tap.start))
        .map(({ index }) => index);
}
function tapOnsetIsInAnalysisWindow(state, startSample) {
    const range = qAnalysisWindowFromState(state);
    const onsetMs = 1000 * startSample / Number(state.currentWave?.sampleRate);
    const startMs = Number(range?.start ?? range?.[0] ?? 0);
    const endMs = Number(range?.end ?? range?.[1] ?? Infinity);
    return Number.isFinite(onsetMs) && onsetMs >= startMs && onsetMs < endMs;
}
function qAnalysisWindowFromState(state) {
    if ("qAnalysisWindowMs" in state)
        return state.qAnalysisWindowMs;
    return state.viewRangeMs;
}
