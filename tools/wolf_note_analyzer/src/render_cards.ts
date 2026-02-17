/**
 * Card renderers for tap summary, played note, and wolf risk.
 */

import {
  EXCHANGE_DEPTH_DB_MIN_UI,
  UNLABELED_META,
  appState,
  deriveFirstThreePartialsFromNote,
  formatCentsValue,
  formatNote,
  renderBodyModesUi,
} from "./state.js";
import { WolfNoteCore } from "./core.js";

const { classifyWolfRisk, isUnstableDecay } = WolfNoteCore;

export function addExtraModeAndRenderBodyModes() {
  const id = `extra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  appState.extraModes.push({ id, label: UNLABELED_META.label, peakFreq: null, q: null, source: "Manual" });
  renderBodyModesUi();
}

export function renderTapSummary() {
  const el = document.getElementById("tap_summary");
  if (!el) return;
  const inferred = Object.values(appState.bodyModes).some((m: any) => m?.source === "Inferred");
  if (!appState.tapSegments.length) {
    el.textContent = inferred
      ? "No taps detected yet. Modes inferred; override to confirm."
      : "No taps detected yet.";
  } else {
    el.textContent = inferred
      ? `${appState.tapSegments.length} tap${appState.tapSegments.length === 1 ? "" : "s"} detected. Some modes inferred; override to confirm.`
      : `${appState.tapSegments.length} tap${appState.tapSegments.length === 1 ? "" : "s"} detected.`;
  }
}

export function renderPlayedNote(result: any) {
  const summary = document.getElementById("note_summary");
  const harmonics = document.getElementById("note_harmonics");
  const status = document.getElementById("note_status");
  if (!summary || !harmonics || !status) return;
  if (!result) {
    summary.innerHTML = "--";
    harmonics.innerHTML = "";
    status.textContent = "Stable";
    status.className = "status-chip stable";
    return;
  }
  const components = deriveFirstThreePartialsFromNote(result);
  const drivers: any[] = appState.energyMetrics?.drivers ?? [];
  const primaryKey = appState.energyMetrics?.primary?.partial?.key ?? null;
  const driverMap = new Map<string, any>(drivers.map((entry: any) => [entry?.partial?.key, entry]));
  const renderRow = (comp: { key: string; label: string; freq: number }) => {
    const note = formatNote(comp.freq);
    const freqLabel = Number.isFinite(comp.freq) ? `${comp.freq.toFixed(1)} Hz` : "--";
    const centsLabel = note?.cents || "";
    const entry = driverMap.get(comp.key);
    const coupledMode = entry?.driver?.mode?.label || null;
    const coupledCents = entry?.driver?.cents ?? null;
    const nearMode = entry?.nearest?.mode?.label || null;
    const nearCents = entry?.nearest?.cents ?? null;
    let chip = "";
    if (coupledMode) {
      const centsTag = formatCentsValue(coupledCents);
      chip = `<span class="note-chip coupled">Coupled (${coupledMode}${centsTag ? ` ${centsTag}` : ""})</span>`;
    } else if (entry?.nearest?.tier === "strong" && nearMode) {
      const centsTag = formatCentsValue(nearCents);
      chip = `<span class="note-chip near">Near ${nearMode}${centsTag ? ` ${centsTag}` : ""}</span>`;
    } else if (entry?.nearest?.tier === "possible" && nearMode) {
      const centsTag = formatCentsValue(nearCents);
      chip = `<span class="note-chip possible">Possible ${nearMode}${centsTag ? ` ${centsTag}` : ""}</span>`;
    }
    const rowClass = comp.key === primaryKey ? "note-row is-primary" : "note-row";
    return `
      <div class="${rowClass}">
        <div class="note-label">${comp.label}${chip}</div>
        <div class="note-name">${note?.name || "--"}</div>
        <div class="note-freq">${freqLabel}</div>
        <div class="note-cents">${centsLabel}</div>
      </div>
    `;
  };
  summary.innerHTML = components.length ? renderRow(components[0]) : "--";
  harmonics.innerHTML = components.length ? components.slice(1).map(renderRow).join("") : "";

  const unstable = appState.partialInstability?.f0
    ? appState.partialInstability.f0.unstable
    : isUnstableDecay(result);
  status.textContent = unstable ? "Unstable" : "Stable";
  status.className = `status-chip ${unstable ? "unstable" : "stable"}`;
}

export function renderWolfRisk(
  result: any,
  status: { drivers: any[]; primary: any | null; couplingOk: boolean; instability: boolean; reason: string },
) {
  const riskChip = document.getElementById("wolf_risk");
  const reason = document.getElementById("wolf_reason");
  const meta = document.getElementById("wolf_meta");
  if (!riskChip || !reason || !meta) return;
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
  const modeLabel = primary?.driver?.mode?.label || primary?.nearest?.mode?.label || "--";
  const modeFreq = Number.isFinite(primary?.driver?.mode?.peakFreq)
    ? `${primary.driver.mode.peakFreq.toFixed(1)} Hz`
    : Number.isFinite(primary?.nearest?.mode?.peakFreq)
      ? `${primary.nearest.mode.peakFreq.toFixed(1)} Hz`
      : "";
  const modeDisplay = modeFreq ? `${modeLabel} ${modeFreq}` : modeLabel;
  const centsLabel = primary?.driver
    ? formatCentsValue(primary.driver.cents)
    : primary?.nearest
      ? formatCentsValue(primary.nearest.cents)
      : "";
  let couplingDetail = "none within 50c";
  if (primary?.driver) {
    couplingDetail = `${modeDisplay} ${centsLabel}`.trim();
  } else if (primary?.nearest && primary.nearest.tier !== "none") {
    couplingDetail = `${modeDisplay} ${centsLabel}`.trim();
  }
  const dominance = Boolean(primary?.dominanceTime && !primary?.sharedBand && primary?.slopeIndependent);
  const exchangeOk = Number.isFinite(primary?.exchangeDepthDb) && (primary.exchangeDepthDb as number) >= EXCHANGE_DEPTH_DB_MIN_UI;
  const componentLabel = primary?.partial?.label || "--";
  const confidence = primary?.confidence || "Low";

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
  (window as any).addExtraModeAndRenderBodyModes = addExtraModeAndRenderBodyModes;
  (window as any).renderTapSummary = renderTapSummary;
  (window as any).renderPlayedNote = renderPlayedNote;
  (window as any).renderWolfRisk = renderWolfRisk;
}
