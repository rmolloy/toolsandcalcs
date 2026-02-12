import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
import { type ModeCardDeps } from "./resonate_mode_cards_render.js";
import { emitModeOverrideResetRequested } from "./resonate_override_commands.js";
import type { ModeCard } from "./resonate_types.js";
import {
  customMeasurementCreateAndAppendFromState,
  customMeasurementDeleteFromState,
  customMeasurementFrequencySetFromState,
  customMeasurementRenameFromState,
} from "./resonate_custom_measurements.js";

let modeTargetHandlersBound = false;
let modeTargetRender: ((modes: ModeCard[], deps: ModeCardDeps) => void) | null = null;

export function modeTargetHandlersBindOnce(
  grid: HTMLElement,
  modes: ModeCard[],
  deps: ModeCardDeps,
  renderModes: (modes: ModeCard[], deps: ModeCardDeps) => void,
) {
  modeTargetRender = renderModes;
  if (modeTargetHandlersBound) return;
  modeTargetHandlersBound = true;
  modeTargetHandlersAttach(grid, modes, deps);
}

function clearTargetEditState(state: Record<string, any>, opts: { keepSkip?: boolean } = {}) {
  state.editingTargetKey = null;
  if (!opts.keepSkip) state.skipNextTargetCommit = false;
}

function modeTargetHandlersAttach(grid: HTMLElement, modes: ModeCard[], deps: ModeCardDeps) {
  grid.addEventListener("click", (e) => modeTargetClickHandle(e, grid, modes, deps));
  grid.addEventListener("keydown", (e) => modeTargetKeydownHandle(e, modes, deps));
  grid.addEventListener("focusout", (e) => modeTargetFocusOutHandle(e, modes, deps));
}

function modeTargetClickHandle(e: Event, grid: HTMLElement, modes: ModeCard[], deps: ModeCardDeps) {
  if (customMeasurementAddHandle(e, modes, deps)) return;
  if (customMeasurementDeleteHandle(e, modes, deps)) return;
  if (customMeasurementRenameHandle(e, modes, deps)) return;
  if (customMeasurementValueSetHandle(e, modes, deps)) return;
  if (modeOverrideResetHandle(e)) return;
  const el = modeTargetLinkFromEvent(e);
  if (!el) return;
  if (!modeTargetActionsAllowed()) return;
  modeTargetClickApplyFromLink(e, el, modes, deps);
  modeTargetClickFocusFromEvent(el, grid, modes, deps);
}

function customMeasurementValueSetHandle(e: Event, modes: ModeCard[], deps: ModeCardDeps) {
  const customValueLink = (e.target as HTMLElement | null)?.closest?.(".mode-custom-value-link") as HTMLElement | null;
  if (!customValueLink) return false;
  e.preventDefault();
  const key = modeTargetKeyFromLink(customValueLink);
  if (!key) return true;
  const card = customValueLink.closest(".mode-card");
  const currentRaw = card?.querySelector(".mode-primary-value")?.childNodes?.[0]?.textContent ?? "";
  const current = Number(String(currentRaw).trim());
  const promptValue = Number.isFinite(current) ? current.toFixed(1) : "";
  const nextRaw = window.prompt("Set custom value (Hz)", promptValue);
  if (nextRaw === null) return true;
  const next = Number(nextRaw.trim());
  if (!Number.isFinite(next) || next <= 0) return true;
  customMeasurementFrequencySetFromState(deps.state, key, next);
  modeTargetRerenderFromDepsWithoutDof(modes, deps);
  return true;
}

function customMeasurementAddHandle(e: Event, modes: ModeCard[], deps: ModeCardDeps) {
  const addButton = (e.target as HTMLElement | null)?.closest?.(".mode-card-add") as HTMLElement | null;
  if (!addButton) return false;
  e.preventDefault();
  customMeasurementCreateAndAppendFromState(deps.state);
  modeTargetRerenderFromDeps(modes, deps);
  return true;
}

function customMeasurementDeleteHandle(e: Event, modes: ModeCard[], deps: ModeCardDeps) {
  const deleteButton = (e.target as HTMLElement | null)?.closest?.(".mode-card-delete") as HTMLElement | null;
  if (!deleteButton) return false;
  e.preventDefault();
  const key = modeTargetKeyFromLink(deleteButton);
  if (!key) return true;
  customMeasurementDeleteFromState(deps.state, key);
  modeTargetRerenderFromDeps(modes, deps);
  return true;
}

function customMeasurementRenameHandle(e: Event, modes: ModeCard[], deps: ModeCardDeps) {
  const customTitle = (e.target as HTMLElement | null)?.closest?.(".mode-title-custom") as HTMLElement | null;
  if (!customTitle) return false;
  e.preventDefault();
  const card = customTitle.closest(".mode-card") as HTMLElement | null;
  const key = modeTargetKeyFromCustomCard(card);
  if (!key) return true;
  const currentLabel = modeTargetLabelFromCustomCard(card);
  const nextLabel = window.prompt("Custom measurement name", currentLabel || "Custom");
  if (nextLabel === null) return true;
  customMeasurementRenameFromState(deps.state, key, nextLabel);
  modeTargetRerenderFromDeps(modes, deps);
  return true;
}

function modeTargetKeyFromCustomCard(card: HTMLElement | null) {
  return card?.getAttribute("data-mode");
}

function modeTargetLabelFromCustomCard(card: HTMLElement | null) {
  return card?.querySelector(".mode-title-custom span:last-child")?.textContent ?? "";
}

function modeOverrideResetHandle(e: Event) {
  const resetLink = (e.target as HTMLElement | null)?.closest?.(".mode-override-reset") as HTMLElement | null;
  if (!resetLink) return false;
  e.preventDefault();
  const modeKey = modeTargetKeyFromLink(resetLink) as "air" | "top" | "back" | null;
  if (!modeKey) return true;
  emitModeOverrideResetRequested(modeKey);
  return true;
}

function modeTargetLinkFromEvent(e: Event) {
  return (e.target as HTMLElement | null)?.closest?.(".mode-target-link") as HTMLElement | null;
}

function modeTargetKeyFromLink(el: HTMLElement) {
  return el.getAttribute("data-mode");
}

function modeTargetClickApplyFromLink(e: Event, el: HTMLElement, modes: ModeCard[], deps: ModeCardDeps) {
  const key = modeTargetKeyFromLink(el);
  if (!key) return;
  e.preventDefault();
  modeTargetEditingKeySet(key, deps);
  modeTargetRenderFromLastOrProvided(modes, deps);
}

function modeTargetClickFocusFromEvent(el: HTMLElement, grid: HTMLElement, modes: ModeCard[], deps: ModeCardDeps) {
  const key = modeTargetClickKeyResolveFromLink(el, deps);
  if (!key) return;
  modeTargetClickFocusApplyFromKey(key, grid, modes, deps);
}

function modeTargetClickKeyResolveFromLink(el: HTMLElement, deps: ModeCardDeps) {
  return modeTargetKeyFromLink(el) ?? deps.state.editingTargetKey;
}

function modeTargetClickFocusApplyFromKey(key: string, grid: HTMLElement, modes: ModeCard[], deps: ModeCardDeps) {
  modeTargetRenderFromLastOrProvided(modes, deps);
  modeTargetInputFocusSchedule(grid, key);
}

function modeTargetRenderFromLastOrProvided(modes: ModeCard[], deps: ModeCardDeps) {
  modeTargetRenderUsingCallback(modeTargetModesResolveFromDeps(modes, deps), deps);
}

function modeTargetRenderUsingCallback(modes: ModeCard[], deps: ModeCardDeps) {
  if (!modeTargetRender) return;
  modeTargetRender(modes, deps);
}

function modeTargetModesResolveFromDeps(modes: ModeCard[], deps: ModeCardDeps) {
  return (deps.state as any).lastModeCards || modes;
}

function modeTargetEditingKeySet(key: string, deps: ModeCardDeps) {
  deps.state.editingTargetKey = key;
}

function modeTargetKeydownHandle(e: KeyboardEvent, modes: ModeCard[], deps: ModeCardDeps) {
  const input = modeTargetInputFromEvent(e);
  if (!input) return;
  modeTargetKeydownApplyFromEvent(e, input, modes, deps);
}

function modeTargetInputFocusSchedule(grid: HTMLElement, key: string) {
  queueMicrotask(() => {
    const input = modeTargetInputFromGridAndKey(grid, key);
    if (input) {
      modeTargetInputFocusAndSelect(input);
    }
  });
}

function modeTargetInputFromGridAndKey(grid: HTMLElement, key: string) {
  return grid.querySelector(`input[data-mode="${key}"]`) as HTMLInputElement | null;
}

function modeTargetInputFocusAndSelect(input: HTMLInputElement) {
  input.focus();
  input.select();
}

function modeTargetFocusOutHandle(e: FocusEvent, modes: ModeCard[], deps: ModeCardDeps) {
  const context = modeTargetCommitContextFromEvent(e);
  if (!context) return;
  modeTargetCommitApplyFromContext(context, modes, deps);
}

function modeTargetInputFromEvent(e: Event) {
  return (e.target as HTMLElement | null)?.closest?.(".mode-target-input") as HTMLInputElement | null;
}

function modeTargetCommitContextFromEvent(e: Event) {
  const input = modeTargetInputFromEvent(e);
  const key = modeTargetKeyFromInput(input);
  if (!input || !key) return null;
  return modeTargetCommitContextBuild(input, key);
}

function modeTargetKeyFromInput(input: HTMLInputElement | null) {
  return input?.getAttribute("data-mode");
}

function modeTargetCommitContextBuild(input: HTMLInputElement, key: string) {
  return { input, key };
}

function modeTargetCommitApplyFromContext(
  context: { input: HTMLInputElement; key: string },
  modes: ModeCard[],
  deps: ModeCardDeps,
) {
  if (!modeTargetActionsAllowed()) return;
  if (modeTargetCommitSkipHandle(modes, deps)) return;
  modeTargetCommitApplyFromInput(context.input, context.key, modes, deps);
}

function modeTargetKeydownApplyFromEvent(
  e: KeyboardEvent,
  input: HTMLInputElement,
  modes: ModeCard[],
  deps: ModeCardDeps,
) {
  if (!modeTargetActionsAllowed()) return;
  const action = MODE_TARGET_KEY_ACTIONS[e.key];
  if (!action) return;
  action(input, modes, deps);
}

function modeTargetCommitApplyFromInput(
  input: HTMLInputElement,
  key: string,
  modes: ModeCard[],
  deps: ModeCardDeps,
) {
  modeTargetTargetsUpdateFromInput(input, key, deps);
  modeTargetCommitFinalize(modes, deps);
}

function modeTargetCommitFinalize(modes: ModeCard[], deps: ModeCardDeps) {
  clearTargetEditState(deps.state);
  modeTargetRerenderFromDeps(modes, deps);
}

function modeTargetTargetsUpdateFromInput(input: HTMLInputElement, key: string, deps: ModeCardDeps) {
  const parsed = modeTargetValueParseFromInput(input);
  const targets = deps.state.modeTargets || (deps.state.modeTargets = {});
  const action = MODE_TARGET_VALUE_ACTIONS[parsed.kind];
  if (!action) return;
  action(targets, key, parsed);
}

function modeTargetRerenderFromDeps(modes: ModeCard[], deps: ModeCardDeps) {
  const rerender = modeTargetRerenderFunctionFromDeps(deps);
  if (rerender) {
    rerender();
  } else {
    modeTargetRenderUsingCallback(modeTargetModesResolveFromDeps(modes, deps), deps);
  }
}

function modeTargetRerenderFromDepsWithoutDof(modes: ModeCard[], deps: ModeCardDeps) {
  const rerender = modeTargetRerenderFunctionFromDeps(deps);
  if (rerender) {
    rerender({ skipDof: true });
  } else {
    modeTargetRenderUsingCallback(modeTargetModesResolveFromDeps(modes, deps), deps);
  }
}

function modeTargetRerenderFunctionFromDeps(deps: ModeCardDeps) {
  return typeof deps.state.rerenderFromLastSpectrum === "function"
    ? (deps.state.rerenderFromLastSpectrum as (options?: { skipDof?: boolean }) => void)
    : null;
}

function modeTargetCommitSkipHandle(modes: ModeCard[], deps: ModeCardDeps) {
  if (!deps.state.skipNextTargetCommit) return false;
  modeTargetCommitFinalize(modes, deps);
  return true;
}

function modeTargetValueParseFromInput(input: HTMLInputElement) {
  const raw = input.value.trim();
  const next = raw ? Number(raw) : NaN;
  if (!raw || !Number.isFinite(next) || next <= 0) {
    return raw ? { kind: "invalid" as const } : { kind: "empty" as const };
  }
  return { kind: "value" as const, value: next };
}

function modeTargetActionsAllowed() {
  const toggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  return overlayToggleShouldRender(toggle);
}

const MODE_TARGET_VALUE_ACTIONS: Record<
  string,
  (targets: Record<string, number>, key: string, parsed: { kind: string; value?: number }) => void
> = {
  empty: (targets, key) => {
    delete targets[key];
  },
  value: (targets, key, parsed) => {
    targets[key] = parsed.value as number;
  },
};

const MODE_TARGET_KEY_ACTIONS: Record<
  string,
  (input: HTMLInputElement, modes: ModeCard[], deps: ModeCardDeps) => void
> = {
  Escape: (_input, modes, deps) => {
    deps.state.skipNextTargetCommit = true;
    clearTargetEditState(deps.state, { keepSkip: true });
    modeTargetRenderFromLastOrProvided(modes, deps);
  },
  Enter: (input) => {
    input.blur();
  },
};
