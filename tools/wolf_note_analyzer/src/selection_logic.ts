/**
 * Selection + coupling reasoning helpers.
 *
 * Pure helpers that derive secondary state from the current selection.
 * Kept DOM-free so `main2.ts` can stay thin.
 */

import {
  formatCentsValue,
  deriveFirstThreePartialsFromNote,
  allBodyModes,
} from "./state.js";
import { computeEnergySeries } from "./energy_series.js";
import { WolfNoteCore } from "./core.js";

type SelectionBodyMode = {
  id: string;
  label?: string;
  alias?: string;
  color?: string;
  tooltip?: string;
  peakFreq: number | null;
  q?: number | null;
  source?: string | null;
  isExtra?: boolean;
};

type SelectionPartialEntry = { key: string; label: string; freq: number };

type SelectionPartialInstabilityEntry = { unstable: boolean; beatRate?: number | null; wobbleDepth?: number | null; stability?: number | null };

type SelectionEnergySeries = {
  dominanceTime?: number | null;
  exchangeDepthDb?: number | null;
} & Record<string, any>;

type SelectionModeEntry = { id: string; peakFreq: number | null; q?: number | null; source?: string | null; label?: string };

type SelectionDriverEntry = {
  partial: SelectionPartialEntry;
  driver: { mode: SelectionModeEntry; cents: number; centsAbs: number } | null;
  nearest: { mode: SelectionModeEntry; cents: number; centsAbs: number; tier?: string } | null;
  confidence: string;
  dominanceTime?: number | null;
  exchangeDepthDb?: number | null;
  sharedBand: boolean;
  slopeIndependent: boolean;
  instability: boolean;
  state: SelectionDriverState;
  sinkFlavor: string | null;
  bodySlope?: number | null;
  partialSlope?: number | null;
};

export type DerivedSelectionState = {
  modes: SelectionBodyMode[];
  partials: SelectionPartialEntry[];
  energy: SelectionEnergySeries | null;
  partialInstability: Record<string, SelectionPartialInstabilityEntry> | null;
  drivers: SelectionDriverEntry[];
  primary: SelectionDriverEntry | null;
  couplingOk: boolean;
  instability: boolean;
};

type NoteResultLite = { f0: number | null; wolfScore?: number | null };
type NoteSliceLite = { wave: ArrayLike<number>; sampleRate: number };

const NO_RESONANCE_REASON = "No close body resonance; wolf classification not allowed.";
export const NO_COUPLING_REASON = "No coupling flags yet.";

const {
  buildPartialDriverMap,
  computePartialInstabilityMap,
  pickNearestCandidate,
  pickPrimaryDriver,
  isUnstableDecay,
  classifyWolfRisk,
} = WolfNoteCore;

export function computeSelectionDerivedState(slice: NoteSliceLite, noteResult: NoteResultLite | null): DerivedSelectionState {
  const modes = allBodyModes();
  const partials = deriveFirstThreePartialsFromNote(noteResult);
  const baseEnergy = computeEnergySeries(slice, noteResult.f0, modes);
  const partialInstability = baseEnergy ? computePartialInstabilityMap(baseEnergy) : {};
  const hasPartialInstability = Object.keys(partialInstability).length > 0;
  const drivers = baseEnergy ? buildPartialDriverMap(partials, modes, baseEnergy, partialInstability) : [];
  const primary = pickPrimaryDriver(drivers) || pickNearestCandidate(drivers);
  const couplingOk = Boolean(primary?.driver);
  const instability = partialInstability?.f0 ? partialInstability.f0.unstable : isUnstableDecay(noteResult as any);
  const energy = baseEnergy
    ? { ...baseEnergy, dominanceTime: primary?.dominanceTime ?? null, exchangeDepthDb: primary?.exchangeDepthDb ?? null }
    : null;

  return {
    modes,
    partials,
    energy,
    partialInstability: hasPartialInstability ? partialInstability : null,
    drivers,
    primary,
    couplingOk,
    instability,
  };
}

type SelectionDriverState = "wolf" | "sink" | "normal";
type SelectionHelpersApi = {
  computeSelectionDerivedState: typeof computeSelectionDerivedState;
  buildSelectionReason: typeof buildSelectionReason;
  buildNoCouplingReason: typeof buildNoCouplingReason;
  buildCoupledReason: typeof buildCoupledReason;
  appendSharedBandDescriptor: typeof appendSharedBandDescriptor;
};

export function buildSelectionReason(
  noteResult: any,
  derived: Pick<DerivedSelectionState, "drivers" | "primary" | "couplingOk">,
) {
  const { drivers, primary, couplingOk } = derived;

  const noCouplingReason = buildNoCouplingReason(drivers, couplingOk);
  if (!couplingOk) return noCouplingReason;

  if (!primary?.driver) return noCouplingReason;

  const labels = collectPrimaryLabels(primary, noteResult);
  let reason = buildCoupledReason(primary, labels);
  reason = appendSharedBandDescriptor(primary, reason);

  return reason;
}

export function buildNoCouplingReason(drivers: SelectionDriverEntry[], couplingOk: boolean): string {
  if (couplingOk) return NO_RESONANCE_REASON;
  const hasStrong = drivers.some((d) => d.nearest?.tier === "strong");
  const hasPossible = drivers.some((d) => d.nearest?.tier === "possible");
  if (hasStrong) {
    return "Coupling flagged, but no late-time stable body resonance; wolf classification not allowed.";
  }
  if (hasPossible) {
    return "Possible coupling within 50c; wolf classification not allowed.";
  }
  return NO_RESONANCE_REASON;
}

function collectPrimaryLabels(primary: SelectionDriverEntry, noteResult: NoteResultLite | null) {
  return {
    modeLabel: primary.driver?.mode?.label || "Body mode",
    partialLabel: primary.partial?.label || "Partial",
    centsLabel: formatCentsValue(primary.driver?.cents),
    confidence: primary.confidence || "Low",
    risk: classifyWolfRisk(noteResult?.wolfScore ?? null),
  };
}

export function buildCoupledReason(primary: SelectionDriverEntry, labels: ReturnType<typeof collectPrimaryLabels>): string {
  const { modeLabel, partialLabel, centsLabel, confidence, risk } = labels;
  switch (primary.state as SelectionDriverState) {
    case "wolf":
      return buildWolfReason(modeLabel, partialLabel, centsLabel, confidence, risk);
    case "sink":
      return buildDirectionalSinkReason(partialLabel, confidence);
    case "normal":
    default:
      return buildStableCouplingReason(modeLabel, partialLabel, centsLabel, confidence);
  }
}

function buildWolfReason(
  modeLabel: string,
  partialLabel: string,
  centsLabel: string,
  confidence: string,
  risk: string,
) {
  return `${risk} risk, ${partialLabel} coupling to ${modeLabel} (${centsLabel}). Confidence: ${confidence}.`;
}

function buildDirectionalSinkReason(partialLabel: string, confidence: string) {
  return `Directional sink on ${partialLabel}; not a wolf. Confidence: ${confidence}.`;
}

function buildStableCouplingReason(
  modeLabel: string,
  partialLabel: string,
  centsLabel: string,
  confidence: string,
) {
  return `${partialLabel} couples to ${modeLabel} (${centsLabel}); decay stable. Confidence: ${confidence}.`;
}

export function appendSharedBandDescriptor(primary: any, base: string): string {
  if (primary.state === "sink" && primary.sinkFlavor === "shared-band") {
    return `${base} Shared-band sink; envelopes track by design.`;
  }
  if (primary.sharedBand) {
    return `${base} Shared-band energy; envelopes track by design.`;
  }
  return base;
}

// Expose for UI and tests (global script context).
if (typeof window !== "undefined") {
  (window as any).WolfSelection = {
    computeSelectionDerivedState,
    buildSelectionReason,
    buildNoCouplingReason,
    buildCoupledReason,
    appendSharedBandDescriptor,
  } as SelectionHelpersApi;
}
