import { overlayToggleShouldRender } from "./resonate_overlay_gate.js?rev=de0830708801";
import { peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js?rev=de0830708801";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=de0830708801";
export function modeCardsHtmlBuild(modes, deps, editingKey) {
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
function modeCardFormattersBuild() {
    const formatCents = (c) => {
        if (!Number.isFinite(c))
            return "—";
        const sign = modeCentsSignPrefixFromValue(c);
        return `${sign}${modeCentsRoundedValue(c)}¢`;
    };
    const formatProximity = (c) => {
        if (!Number.isFinite(c))
            return null;
        const abs = Math.abs(c);
        return modeProximityLabelBuildFromAbsCents(abs);
    };
    const formatQ = (q) => modeQLabelBuildFromValue(q);
    return { formatCents, formatProximity, formatQ };
}
function modeQLabelBuildFromValue(q) {
    if (!Number.isFinite(q))
        return "Q —";
    return `Q ${Math.round(q)}`;
}
function modeCentsSignPrefixFromValue(cents) {
    return cents >= 0 ? "+" : "";
}
function modeCentsRoundedValue(cents) {
    return Math.round(cents);
}
const MODE_PROXIMITY_TIERS = [
    { limit: 10, label: resonanceLocalizedMessages.modeCardsWolfLikely, tone: "high" },
    { limit: 15, label: resonanceLocalizedMessages.modeCardsWolfPossible, tone: "med" },
    { limit: 25, label: resonanceLocalizedMessages.modeCardsWolfPossible, tone: "low" },
];
function modeProximityLabelBuildFromAbsCents(cents) {
    const tier = MODE_PROXIMITY_TIERS.find((entry) => cents <= entry.limit);
    if (!tier)
        return null;
    return { label: modeProximityLabelTextFromTier(tier.label), tone: tier.tone };
}
function modeProximityLabelTextFromTier(label) {
    return resonanceLocalizedMessages.modeCardsWolfTemplate.replace("{likelihood}", label);
}
function modeCardHtmlBuildFromMode(m, deps, editingKey, formatters) {
    const { formatCents, formatProximity, formatQ } = formatters;
    const proximity = modeCardProximityFromMode(m, formatProximity);
    return `
    <div class="${modeCardClassBuildFromMode(m, deps.state)}" data-mode="${m.key}">
      ${modeCardHeaderHtmlBuildFromMode(m, deps)}
      ${modeCardBodyHtmlBuildFromMode(m, editingKey, proximity, formatCents, formatQ)}
    </div>
  `;
}
function modeCardProximityFromMode(m, formatProximity) {
    return formatProximity(m.cents);
}
function modeCardClassBuildFromMode(m, state) {
    const base = m.kind === "custom" ? "mode-card mode-custom" : `mode-card mode-${m.key}`;
    return state.peakAnalysisSelectedKey === m.key ? `${base} is-analysis-selected` : base;
}
function modeCardHeaderHtmlBuildFromMode(m, deps) {
    return `${modeCardActionHtmlBuildFromMode(m)}${modeTitleHtmlBuildFromMode(m, deps)}`;
}
function modeCardActionHtmlBuildFromMode(m) {
    if (m.kind === "custom") {
        return `<button class="mode-card-delete" type="button" data-mode="${m.key}" title="${resonanceLocalizedMessages.modeCardsDeleteCustomTitle}">X</button>`;
    }
    return `<div class="pencil" title="${resonanceLocalizedMessages.modeCardsReassignPeakTitle}">✎</div>`;
}
function modeCardBodyHtmlBuildFromMode(m, editingKey, proximity, formatCents, formatQ) {
    return `
    <div class="mode-primary-row">${modePrimaryHtmlBuildFromMode(m, formatCents)}</div>
    <div class="mode-behavior">${modeBehaviorHtmlBuildFromMode(m, proximity, formatQ)}</div>
    <div class="mode-target">${modeTargetHtmlBuildFromMode(m, editingKey)}</div>
  `;
}
function modePrimaryHtmlBuildFromMode(m, formatCents) {
    const value = Number.isFinite(m.freq) ? m.freq.toFixed(1) : "—";
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
function modeOverrideResetHtmlBuildFromMode(m) {
    if (!Number.isFinite(m.peakOverrideHz))
        return "";
    return ` <a class="mode-override-reset" href="#" data-mode="${m.key}">${resonanceLocalizedMessages.modeCardsReset}</a>`;
}
function escapeHtmlAttr(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, "&#10;");
}
function modeTitleHtmlBuildFromMode(m, deps) {
    if (m.kind === "custom")
        return modeTitleHtmlBuildFromCustomMode(m);
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
function modeCardStockLongLabelBuild(mode, state) {
    if (mode.key !== "long" || peakAnalysisSourceMeasureModeResolve(state) !== "brace_stock")
        return null;
    const confirmedFrequency = state.braceStockConfirmedLongMode?.frequencyHz;
    if (!Number.isFinite(confirmedFrequency) || !Number.isFinite(mode.freq)) {
        return resonanceLocalizedMessages.modeCardsSuggestedLong;
    }
    return Math.abs(confirmedFrequency - Number(mode.freq)) < 0.05
        ? resonanceLocalizedMessages.modeCardsConfirmedLong
        : resonanceLocalizedMessages.modeCardsSuggestedLong;
}
function modeTitleHtmlBuildFromCustomMode(m) {
    return `
    <h3>
      <span class="mode-title mode-title-custom">
        <span class="mode-dot"></span>
        <span>${m.label}</span>
      </span>
    </h3>
  `;
}
function modeNoteCentsClassFromValue(cents) {
    return (cents ?? 0) >= 0 ? "positive" : "negative";
}
function modeBehaviorHtmlBuildFromMode(m, proximity, formatQ) {
    if (m.isPeak === false) {
        return `<span class="behavior">${resonanceLocalizedMessages.modeCardsNoPeak}</span>`;
    }
    const wolf = proximity ? ` • ${proximity.label}` : "";
    return `<span class="behavior">${formatQ(m.q)}${wolf}</span>`;
}
function modeTargetHtmlBuildFromMode(m, editingKey) {
    if (m.kind === "custom") {
        return `<a class="mode-target-link mode-custom-value-link" href="#" data-mode="${m.key}">${resonanceLocalizedMessages.modeCardsSetValue}</a>`;
    }
    if (!modeTargetRenderAllowed())
        return modeTargetResetRowHtmlBuildFromMode(m, "");
    const isEditing = Number.isFinite(m.targetHz) || editingKey === m.key;
    const resetHtml = modeOverrideResetHtmlBuildFromMode(m);
    if (!isEditing) {
        return modeTargetResetRowHtmlBuildFromMode(m, `<a class="mode-target-link" href="#" data-mode="${m.key}">${resonanceLocalizedMessages.modeCardsSetTarget}</a>`);
    }
    const value = modeTargetInputValueBuildFromMode(m);
    const targetHtml = `${resonanceLocalizedMessages.modeCardsTargetLabel}: <input class="mode-target-input" data-mode="${m.key}" inputmode="decimal" value="${value}"> <span class="mode-target-unit">Hz</span>`;
    return modeTargetResetRowHtmlBuildFromMode(m, targetHtml);
}
function modeTargetResetRowHtmlBuildFromMode(m, targetHtml) {
    const resetHtml = modeOverrideResetHtmlBuildFromMode(m);
    if (!resetHtml)
        return targetHtml;
    return `<span class="mode-target-row"><span class="mode-target-main">${targetHtml}</span>${resetHtml}</span>`;
}
function modeTargetRenderAllowed() {
    const measureMode = document.getElementById("measure_mode")?.value;
    if (measureMode && measureMode !== "guitar" && measureMode !== "played_note")
        return false;
    const toggle = document.getElementById("toggle_overlay");
    return overlayToggleShouldRender(toggle);
}
function modeTargetInputValueBuildFromMode(m) {
    if (Number.isFinite(m.targetHz))
        return m.targetHz.toFixed(1);
    if (Number.isFinite(m.freq))
        return m.freq.toFixed(1);
    return "";
}
