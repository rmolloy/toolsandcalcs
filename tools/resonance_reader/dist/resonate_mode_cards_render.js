import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
export function modeCardsHtmlBuild(modes, deps, editingKey) {
    const formatters = modeCardFormattersBuild();
    const modeCardsHtml = modes.map((m) => modeCardHtmlBuildFromMode(m, deps, editingKey, formatters)).join("");
    return `${modeCardsHtml}${modeCardAddCustomHtmlBuild()}`;
}
function modeCardAddCustomHtmlBuild() {
    return `
    <button class="mode-card mode-custom mode-card-add" type="button" aria-label="Add custom measurement">
      <span class="mode-card-add-plus" aria-hidden="true">+</span>
      <span class="mode-card-add-title">Add Mode</span>
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
    { limit: 10, label: "likely", tone: "high" },
    { limit: 15, label: "possible", tone: "med" },
    { limit: 25, label: "possible", tone: "low" },
];
function modeProximityLabelBuildFromAbsCents(cents) {
    const tier = MODE_PROXIMITY_TIERS.find((entry) => cents <= entry.limit);
    if (!tier)
        return null;
    return { label: modeProximityLabelTextFromTier(tier.label), tone: tier.tone };
}
function modeProximityLabelTextFromTier(label) {
    return `Wolf ${label}`;
}
function modeCardHtmlBuildFromMode(m, deps, editingKey, formatters) {
    const { formatCents, formatProximity, formatQ } = formatters;
    const proximity = modeCardProximityFromMode(m, formatProximity);
    return `
    <div class="${modeCardClassBuildFromMode(m)}" data-mode="${m.key}">
      ${modeCardHeaderHtmlBuildFromMode(m, deps)}
      ${modeCardBodyHtmlBuildFromMode(m, editingKey, proximity, formatCents, formatQ)}
    </div>
  `;
}
function modeCardProximityFromMode(m, formatProximity) {
    return formatProximity(m.cents);
}
function modeCardClassBuildFromMode(m) {
    if (m.kind === "custom")
        return "mode-card mode-custom";
    return `mode-card mode-${m.key}`;
}
function modeCardHeaderHtmlBuildFromMode(m, deps) {
    return `${modeCardActionHtmlBuildFromMode(m)}${modeTitleHtmlBuildFromMode(m, deps)}`;
}
function modeCardActionHtmlBuildFromMode(m) {
    if (m.kind === "custom") {
        return `<button class="mode-card-delete" type="button" data-mode="${m.key}" title="Delete custom measurement">X</button>`;
    }
    return `<div class="pencil" title="Reassign peak">✎</div>`;
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
    return ` <a class="mode-override-reset" href="#" data-mode="${m.key}">reset</a>`;
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
    const tooltip = escapeHtmlAttr(deps.modeMeta[m.key]?.tooltip || m.label);
    const aliasHtml = deps.modeMeta[m.key]?.aliasHtml || "";
    return `
    <h3>
      <span class="mode-title" tabindex="0" data-tooltip="${tooltip}">
        <span class="mode-dot"></span>
        <span>${m.label}</span>
        <span class="mode-alias">${aliasHtml}</span>
      </span>
    </h3>
  `;
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
    const wolf = proximity ? ` • ${proximity.label}` : "";
    return `<span class="behavior">${formatQ(m.q)}${wolf}</span>`;
}
function modeTargetHtmlBuildFromMode(m, editingKey) {
    if (m.kind === "custom") {
        return `<a class="mode-target-link mode-custom-value-link" href="#" data-mode="${m.key}">Set value</a>`;
    }
    if (!modeTargetRenderAllowed())
        return modeTargetResetRowHtmlBuildFromMode(m, "");
    const isEditing = Number.isFinite(m.targetHz) || editingKey === m.key;
    const resetHtml = modeOverrideResetHtmlBuildFromMode(m);
    if (!isEditing) {
        return modeTargetResetRowHtmlBuildFromMode(m, `<a class="mode-target-link" href="#" data-mode="${m.key}">Set target</a>`);
    }
    const value = modeTargetInputValueBuildFromMode(m);
    const targetHtml = `Target: <input class="mode-target-input" data-mode="${m.key}" inputmode="decimal" value="${value}"> <span class="mode-target-unit">Hz</span>`;
    return modeTargetResetRowHtmlBuildFromMode(m, targetHtml);
}
function modeTargetResetRowHtmlBuildFromMode(m, targetHtml) {
    const resetHtml = modeOverrideResetHtmlBuildFromMode(m);
    if (!resetHtml)
        return targetHtml;
    return `<span class="mode-target-row"><span class="mode-target-main">${targetHtml}</span>${resetHtml}</span>`;
}
function modeTargetRenderAllowed() {
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
