import { aggregateDecayQ } from "./resonate_q_aggregation.js";
import { qSettingsResolve } from "./resonate_q_settings.js";
import type { ModeCard } from "./resonate_types.js";

export type DecayQFit = (state: Record<string, any>, mode: ModeCard) => {
  pending?: boolean;
  result: { Q: number | null; flags?: string[] };
} | null;

export function resolveQForModeCards<Card extends ModeCard>(state: Record<string, any>, cards: Card[], fit?: DecayQFit): Card[] {
  if (qSettingsResolve(state).method === "spectral") return cards;
  return cards.map((card) => resolveDecayQForMode(state, card, fit));
}

function resolveDecayQForMode<Card extends ModeCard>(state: Record<string, any>, card: Card, fit?: DecayQFit): Card {
  const aggregation = qSettingsResolve(state).aggregation;
  const taps = decayQFitsForMode(state, card, fit);
  const pending = taps.some((tap) => tap.pending);
  return { ...card, q: pending ? null : aggregateDecayQ(taps.map((tap) => tap.q), aggregation), qEvidence: {
    method: "decay", aggregation, spectralQ: spectralQFromMode(card), taps, ...(pending ? { pending: true } : {}),
  } };
}

export function spectralQFromMode(mode: Pick<ModeCard, "q" | "qEvidence">): number | null {
  return mode.qEvidence ? mode.qEvidence.spectralQ : mode.q;
}

function decayQFitsForMode(state: Record<string, any>, card: ModeCard, fit?: DecayQFit) {
  if (!fit || !Number.isFinite(card.freq)) return [];
  return tapIndexesInAnalysisWindow(state).map((tapIndex) => decayQFitForTap(state, card, tapIndex, fit));
}

function decayQFitForTap(state: Record<string, any>, card: ModeCard, tapIndex: number, fit: DecayQFit) {
  const data = fit({ ...state, peakAnalysisSelectedTapIndex: tapIndex }, card);
  return { tapIndex, q: data?.result.Q ?? null, flags: data?.result.flags ?? [], ...(data?.pending ? { pending: true } : {}) };
}

export function tapIndexesInAnalysisWindow(state: Record<string, any>): number[] {
  const taps: Array<{ start: number }> = state.tapSegments || [];
  return taps.map((tap, index) => ({ tap, index }))
    .filter(({ tap }) => tapOnsetIsInAnalysisWindow(state, tap.start))
    .map(({ index }) => index);
}

function tapOnsetIsInAnalysisWindow(state: Record<string, any>, startSample: number): boolean {
  const range = qAnalysisWindowFromState(state);
  const onsetMs = 1000 * startSample / Number(state.currentWave?.sampleRate);
  const startMs = Number(range?.start ?? range?.[0] ?? 0);
  const endMs = Number(range?.end ?? range?.[1] ?? Infinity);
  return Number.isFinite(onsetMs) && onsetMs >= startMs && onsetMs < endMs;
}

function qAnalysisWindowFromState(state: Record<string, any>) {
  if ("qAnalysisWindowMs" in state) return state.qAnalysisWindowMs;
  return state.viewRangeMs;
}
