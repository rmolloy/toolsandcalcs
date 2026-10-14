import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
import type { ModeCard } from "./resonate_types.js";
import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export type ModeMeta = { label: string; aliasHtml: string; aliasText: string; tooltip: string; color: string };

export type ModeCardDeps = {
  state: Record<string, any>;
  modeMeta: Record<string, ModeMeta>;
};

type ModeCardFormatters = {
  formatCents: (c: number | null) => string;
  formatProximity: (c: number | null) => { label: string; tone: string } | null;
  formatQ: (q: number | null) => string;
};

export function modeCardsHtmlBuild(modes: ModeCard[], deps: ModeCardDeps, editingKey: string | null) {
  const formatters = modeCardFormattersBuild();
  const modeCardsHtml = modes.map((m) => modeCardHtmlBuildFromMode(m, deps, editingKey, formatters)).join("");
  return `${modeCardsHtml}${modeCardAddCustomHtmlBuild()}`;
}

function modeCardAddCustomHtmlBuild() {
  return `
    <button class="mode-card mode-custom mode-card-add" type="button" aria-label="${resonanceLocalizedMessages.modeCardsAddCustomAriaLabel}">
      <span class="mode-card-add-plus" aria-hidden="true">+</span>
      <span class="mode-card-add-title">${resonanceLocalizedMessages.modeCardsAddMode}</span>
    </button>
  `;
}

function modeCardFormattersBuild(): ModeCardFormatters {
  const formatCents = (c: number | null) => {
    if (!Number.isFinite(c)) return "—";
    const sign = modeCentsSignPrefixFromValue(c as number);
    return `${sign}${modeCentsRoundedValue(c as number)}¢`;
  };
  const formatProximity = (c: number | null) => {
    if (!Number.isFinite(c)) return null;
    const abs = Math.abs(c as number);
    return modeProximityLabelBuildFromAbsCents(abs);
  };
  const formatQ = (q: number | null) => modeQLabelBuildFromValue(q);
  return { formatCents, formatProximity, formatQ };
}

function modeQLabelBuildFromValue(q: number | null) {
  if (!Number.isFinite(q)) return "Q —";
  return `Q ${Math.round(q as number)}`;
}

function modeCentsSignPrefixFromValue(cents: number) {
  return cents >= 0 ? "+" : "";
}

function modeCentsRoundedValue(cents: number) {
  return Math.round(cents);
}

const MODE_PROXIMITY_TIERS = [
  { limit: 10, label: resonanceLocalizedMessages.modeCardsWolfLikely, tone: "high" },
  { limit: 15, label: resonanceLocalizedMessages.modeCardsWolfPossible, tone: "med" },
  { limit: 25, label: resonanceLocalizedMessages.modeCardsWolfPossible, tone: "low" },
] as const;

function modeProximityLabelBuildFromAbsCents(cents: number) {
  const tier = MODE_PROXIMITY_TIERS.find((entry) => cents <= entry.limit);
  if (!tier) return null;
  return { label: modeProximityLabelTextFromTier(tier.label), tone: tier.tone };
}

function modeProximityLabelTextFromTier(label: string) {
  return resonanceLocalizedMessages.modeCardsWolfTemplate.replace("{likelihood}", label);
}

function modeCardHtmlBuildFromMode(m: ModeCard, deps: ModeCardDeps, editingKey: string | null, formatters: ModeCardFormatters) {
  const { formatCents, formatProximity, formatQ } = formatters;
  const proximity = modeCardProximityFromMode(m, formatProximity);
  return `
    <div class="${modeCardClassBuildFromMode(m, deps.state)}" data-mode="${m.key}">
      ${modeCardHeaderHtmlBuildFromMode(m, deps)}
      ${modeCardBodyHtmlBuildFromMode(m, editingKey, proximity, formatCents, formatQ)}
    </div>
  `;
}

function modeCardProximityFromMode(m: ModeCard, formatProximity: (c: number | null) => { label: string; tone: string } | null) {
  return formatProximity(m.cents);
}

function modeCardClassBuildFromMode(m: ModeCard, state: Record<string, any>) {
  const base = m.kind === "custom" ? "mode-card mode-custom" : `mode-card mode-${m.key}`;
  return state.peakAnalysisSelectedKey === m.key ? `${base} is-analysis-selected` : base;
}

function modeCardHeaderHtmlBuildFromMode(m: ModeCard, deps: ModeCardDeps) {
  return `${modeCardActionHtmlBuildFromMode(m)}${modeTitleHtmlBuildFromMode(m, deps)}`;
}

function modeCardActionHtmlBuildFromMode(m: ModeCard) {
  if (m.kind === "custom") {
    return `<button class="mode-card-delete" type="button" data-mode="${m.key}" title="${resonanceLocalizedMessages.modeCardsDeleteCustomTitle}">X</button>`;
  }
  return `<div class="pencil" title="${resonanceLocalizedMessages.modeCardsReassignPeakTitle}">✎</div>`;
}

function modeCardBodyHtmlBuildFromMode(
  m: ModeCard,
  editingKey: string | null,
  proximity: { label: string; tone: string } | null,
  formatCents: (c: number | null) => string,
  formatQ: (q: number | null) => string,
) {
  return `
    <div class="mode-primary-row">${modePrimaryHtmlBuildFromMode(m, formatCents)}</div>
    <div class="mode-behavior">${modeBehaviorHtmlBuildFromMode(m, proximity, formatQ)}</div>
    <div class="mode-target">${modeTargetHtmlBuildFromMode(m, editingKey)}</div>
  `;
}

function modePrimaryHtmlBuildFromMode(
  m: ModeCard,
  formatCents: (c: number | null) => string,
) {
  const value = Number.isFinite(m.freq) ? (m.freq as number).toFixed(1) : "—";
  const noteLabel = m.note || "—";
  const cents = formatCents(m.cents);
  return `
    <table class="mode-primary-table" role="presentation">
      <tr>
        <td class="mode-primary-value">
          ${value}
        </td>
        <td class="mode-primary-meta">
          <div class="mode-primary-note">
            <span class="mode-note-name">${noteLabel}</span>
            <span class="mode-note-cents ${modeNoteCentsClassFromValue(m.cents)}">${cents}</span>
          </div>
          <div class="mode-primary-unit"><span class="mode-unit">Hz</span></div>
        </td>
      </tr>
    </table>
  `;
}

function modeOverrideResetHtmlBuildFromMode(m: ModeCard) {
  if (!Number.isFinite(m.peakOverrideHz)) return "";
  return ` <a class="mode-override-reset" href="#" data-mode="${m.key}">${resonanceLocalizedMessages.modeCardsReset}</a>`;
}

function escapeHtmlAttr(text: string) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#10;");
}

function modeTitleHtmlBuildFromMode(m: ModeCard, deps: ModeCardDeps) {
  if (m.kind === "custom") return modeTitleHtmlBuildFromCustomMode(m);
  const stockLongLabel = modeCardStockLongLabelBuild(m, deps.state);
  const currentLabel = stockLongLabel || deps.modeMeta[m.key]?.label || m.label;
  const tooltip = escapeHtmlAttr(deps.modeMeta[m.key]?.tooltip || currentLabel);
  const aliasHtml = deps.modeMeta[m.key]?.aliasHtml || "";
  return `
    <h3>
      <span class="mode-title" tabindex="0" data-tooltip="${tooltip}">
        <span class="mode-dot"></span>
        <span>${currentLabel}</span>
        ${stockLongLabel ? "" : `<span class="mode-alias">${aliasHtml}</span>`}
      </span>
    </h3>
  `;
}

function modeCardStockLongLabelBuild(mode: ModeCard, state: Record<string, any>) {
  if (mode.key !== "long" || peakAnalysisSourceMeasureModeResolve(state) !== "brace_stock") return null;
  const confirmedFrequency = state.braceStockConfirmedLongMode?.frequencyHz;
  if (!Number.isFinite(confirmedFrequency) || !Number.isFinite(mode.freq)) {
    return resonanceLocalizedMessages.modeCardsSuggestedLong;
  }
  return Math.abs(confirmedFrequency - Number(mode.freq)) < 0.05
    ? resonanceLocalizedMessages.modeCardsConfirmedLong
    : resonanceLocalizedMessages.modeCardsSuggestedLong;
}

function modeTitleHtmlBuildFromCustomMode(m: ModeCard) {
  return `
    <h3>
      <span class="mode-title mode-title-custom">
        <span class="mode-dot"></span>
        <span>${m.label}</span>
      </span>
    </h3>
  `;
}

function modeNoteCentsClassFromValue(cents: number | null) {
  return (cents ?? 0) >= 0 ? "positive" : "negative";
}

function modeBehaviorHtmlBuildFromMode(
  m: ModeCard,
  proximity: { label: string; tone: string } | null,
  formatQ: (q: number | null) => string,
) {
  if (m.isPeak === false) {
    return `<span class="behavior">${resonanceLocalizedMessages.modeCardsNoPeak}</span>`;
  }
  const wolf = proximity ? ` • ${proximity.label}` : "";
  return `<span class="behavior">${formatQ(m.q)}${wolf}</span>`;
}

function modeTargetHtmlBuildFromMode(m: ModeCard, editingKey: string | null) {
  if (m.kind === "custom") {
    return `<a class="mode-target-link mode-custom-value-link" href="#" data-mode="${m.key}">${resonanceLocalizedMessages.modeCardsSetValue}</a>`;
  }
  if (!modeTargetRenderAllowed()) return modeTargetResetRowHtmlBuildFromMode(m, "");
  const isEditing = Number.isFinite(m.targetHz) || editingKey === m.key;
  const resetHtml = modeOverrideResetHtmlBuildFromMode(m);
  if (!isEditing) {
    return modeTargetResetRowHtmlBuildFromMode(m, `<a class="mode-target-link" href="#" data-mode="${m.key}">${resonanceLocalizedMessages.modeCardsSetTarget}</a>`);
  }
  const value = modeTargetInputValueBuildFromMode(m);
  const targetHtml = `${resonanceLocalizedMessages.modeCardsTargetLabel}: <input class="mode-target-input" data-mode="${m.key}" inputmode="decimal" value="${value}"> <span class="mode-target-unit">Hz</span>`;
  return modeTargetResetRowHtmlBuildFromMode(m, targetHtml);
}

function modeTargetResetRowHtmlBuildFromMode(m: ModeCard, targetHtml: string) {
  const resetHtml = modeOverrideResetHtmlBuildFromMode(m);
  if (!resetHtml) return targetHtml;
  return `<span class="mode-target-row"><span class="mode-target-main">${targetHtml}</span>${resetHtml}</span>`;
}

function modeTargetRenderAllowed() {
  const measureMode = (document.getElementById("measure_mode") as HTMLSelectElement | null)?.value;
  if (measureMode && measureMode !== "guitar" && measureMode !== "played_note") return false;
  const toggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  return overlayToggleShouldRender(toggle);
}

function modeTargetInputValueBuildFromMode(m: ModeCard) {
  if (Number.isFinite(m.targetHz)) return (m.targetHz as number).toFixed(1);
  if (Number.isFinite(m.freq)) return (m.freq as number).toFixed(1);
  return "";
}
