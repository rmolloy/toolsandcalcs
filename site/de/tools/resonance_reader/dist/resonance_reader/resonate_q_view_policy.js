import { measureModeNormalize } from "./resonate_mode_config.js?rev=bd81c33a8408";
import { resolveQForModeCards, spectralQFromMode } from "./resonate_q_measurement.js?rev=bd81c33a8408";
import { qSettingsResolve } from "./resonate_q_settings.js?rev=bd81c33a8408";
export function resolveQForViewModeCards(state, cards, fit) {
    if (stockQSettingsAreApplicable(state) && qSettingsResolve(state).method === "decay")
        return resolveQForModeCards(state, cards, fit);
    if (measureModeNormalize(state.measureMode) === "peak_analysis")
        return cards.map((card) => resolveSelectedTapCardQ(state, card, fit));
    return cards.map(restoreSpectralCardQ);
}
function resolveSelectedTapCardQ(state, card, fit) {
    const data = fit?.(state, card);
    const tapIndex = data?.provenance?.tapIndex;
    return { ...card, q: data?.pending ? null : data?.result.Q ?? null, qEvidence: {
            method: "decay", aggregation: "selected_tap", spectralQ: spectralQFromMode(card),
            taps: tapIndex == null ? [] : [{ tapIndex, q: data?.result.Q ?? null, flags: data?.result.flags ?? [] }],
            ...(data?.pending ? { pending: true } : {}),
        } };
}
export function stockQSettingsAreApplicable(state) {
    return ["plate_stock", "brace_stock"].includes(measureModeNormalize(state.measureMode));
}
function restoreSpectralCardQ(card) {
    if (!card.qEvidence)
        return card;
    const { qEvidence, ...spectralCard } = card;
    return { ...spectralCard, q: qEvidence.spectralQ };
}
