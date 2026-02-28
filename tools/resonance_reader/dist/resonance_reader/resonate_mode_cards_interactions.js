import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
import { emitModeOverrideResetRequested } from "./resonate_override_commands.js";
import { customMeasurementCreateAndAppendFromState, customMeasurementDeleteFromState, customMeasurementFrequencySetFromState, customMeasurementRenameFromState, } from "./resonate_custom_measurements.js";
let modeTargetHandlersBound = false;
let modeTargetRender = null;
export function modeTargetHandlersBindOnce(grid, modes, deps, renderModes) {
    modeTargetRender = renderModes;
    if (modeTargetHandlersBound)
        return;
    modeTargetHandlersBound = true;
    modeTargetHandlersAttach(grid, modes, deps);
}
function clearTargetEditState(state, opts = {}) {
    state.editingTargetKey = null;
    if (!opts.keepSkip)
        state.skipNextTargetCommit = false;
}
function modeTargetHandlersAttach(grid, modes, deps) {
    grid.addEventListener("click", (e) => modeTargetClickHandle(e, grid, modes, deps));
    grid.addEventListener("keydown", (e) => modeTargetKeydownHandle(e, modes, deps));
    grid.addEventListener("focusout", (e) => modeTargetFocusOutHandle(e, modes, deps));
}
function modeTargetClickHandle(e, grid, modes, deps) {
    if (customMeasurementAddHandle(e, modes, deps))
        return;
    if (customMeasurementDeleteHandle(e, modes, deps))
        return;
    if (customMeasurementRenameHandle(e, modes, deps))
        return;
    if (customMeasurementValueSetHandle(e, modes, deps))
        return;
    if (modeOverrideResetHandle(e))
        return;
    const el = modeTargetLinkFromEvent(e);
    if (!el)
        return;
    if (!modeTargetActionsAllowed())
        return;
    modeTargetClickApplyFromLink(e, el, modes, deps);
    modeTargetClickFocusFromEvent(el, grid, modes, deps);
}
function customMeasurementValueSetHandle(e, modes, deps) {
    const customValueLink = e.target?.closest?.(".mode-custom-value-link");
    if (!customValueLink)
        return false;
    e.preventDefault();
    const key = modeTargetKeyFromLink(customValueLink);
    if (!key)
        return true;
    const card = customValueLink.closest(".mode-card");
    const currentRaw = card?.querySelector(".mode-primary-value")?.childNodes?.[0]?.textContent ?? "";
    const current = Number(String(currentRaw).trim());
    const promptValue = Number.isFinite(current) ? current.toFixed(1) : "";
    const nextRaw = window.prompt("Set custom value (Hz)", promptValue);
    if (nextRaw === null)
        return true;
    const next = Number(nextRaw.trim());
    if (!Number.isFinite(next) || next <= 0)
        return true;
    customMeasurementFrequencySetFromState(deps.state, key, next);
    modeTargetRerenderFromDepsWithoutDof(modes, deps);
    return true;
}
function customMeasurementAddHandle(e, modes, deps) {
    const addButton = e.target?.closest?.(".mode-card-add");
    if (!addButton)
        return false;
    e.preventDefault();
    customMeasurementCreateAndAppendFromState(deps.state);
    modeTargetRerenderFromDeps(modes, deps);
    return true;
}
function customMeasurementDeleteHandle(e, modes, deps) {
    const deleteButton = e.target?.closest?.(".mode-card-delete");
    if (!deleteButton)
        return false;
    e.preventDefault();
    const key = modeTargetKeyFromLink(deleteButton);
    if (!key)
        return true;
    customMeasurementDeleteFromState(deps.state, key);
    modeTargetRerenderFromDeps(modes, deps);
    return true;
}
function customMeasurementRenameHandle(e, modes, deps) {
    const customTitle = e.target?.closest?.(".mode-title-custom");
    if (!customTitle)
        return false;
    e.preventDefault();
    const card = customTitle.closest(".mode-card");
    const key = modeTargetKeyFromCustomCard(card);
    if (!key)
        return true;
    const currentLabel = modeTargetLabelFromCustomCard(card);
    const nextLabel = window.prompt("Custom measurement name", currentLabel || "Custom");
    if (nextLabel === null)
        return true;
    customMeasurementRenameFromState(deps.state, key, nextLabel);
    modeTargetRerenderFromDeps(modes, deps);
    return true;
}
function modeTargetKeyFromCustomCard(card) {
    return card?.getAttribute("data-mode");
}
function modeTargetLabelFromCustomCard(card) {
    return card?.querySelector(".mode-title-custom span:last-child")?.textContent ?? "";
}
function modeOverrideResetHandle(e) {
    const resetLink = e.target?.closest?.(".mode-override-reset");
    if (!resetLink)
        return false;
    e.preventDefault();
    const modeKey = modeTargetKeyFromLink(resetLink);
    if (!modeKey)
        return true;
    emitModeOverrideResetRequested(modeKey);
    return true;
}
function modeTargetLinkFromEvent(e) {
    return e.target?.closest?.(".mode-target-link");
}
function modeTargetKeyFromLink(el) {
    return el.getAttribute("data-mode");
}
function modeTargetClickApplyFromLink(e, el, modes, deps) {
    const key = modeTargetKeyFromLink(el);
    if (!key)
        return;
    e.preventDefault();
    modeTargetEditingKeySet(key, deps);
    modeTargetRenderFromLastOrProvided(modes, deps);
}
function modeTargetClickFocusFromEvent(el, grid, modes, deps) {
    const key = modeTargetClickKeyResolveFromLink(el, deps);
    if (!key)
        return;
    modeTargetClickFocusApplyFromKey(key, grid, modes, deps);
}
function modeTargetClickKeyResolveFromLink(el, deps) {
    return modeTargetKeyFromLink(el) ?? deps.state.editingTargetKey;
}
function modeTargetClickFocusApplyFromKey(key, grid, modes, deps) {
    modeTargetRenderFromLastOrProvided(modes, deps);
    modeTargetInputFocusSchedule(grid, key);
}
function modeTargetRenderFromLastOrProvided(modes, deps) {
    modeTargetRenderUsingCallback(modeTargetModesResolveFromDeps(modes, deps), deps);
}
function modeTargetRenderUsingCallback(modes, deps) {
    if (!modeTargetRender)
        return;
    modeTargetRender(modes, deps);
}
function modeTargetModesResolveFromDeps(modes, deps) {
    return deps.state.lastModeCards || modes;
}
function modeTargetEditingKeySet(key, deps) {
    deps.state.editingTargetKey = key;
}
function modeTargetKeydownHandle(e, modes, deps) {
    const input = modeTargetInputFromEvent(e);
    if (!input)
        return;
    modeTargetKeydownApplyFromEvent(e, input, modes, deps);
}
function modeTargetInputFocusSchedule(grid, key) {
    queueMicrotask(() => {
        const input = modeTargetInputFromGridAndKey(grid, key);
        if (input) {
            modeTargetInputFocusAndSelect(input);
        }
    });
}
function modeTargetInputFromGridAndKey(grid, key) {
    return grid.querySelector(`input[data-mode="${key}"]`);
}
function modeTargetInputFocusAndSelect(input) {
    input.focus();
    input.select();
}
function modeTargetFocusOutHandle(e, modes, deps) {
    const context = modeTargetCommitContextFromEvent(e);
    if (!context)
        return;
    modeTargetCommitApplyFromContext(context, modes, deps);
}
function modeTargetInputFromEvent(e) {
    return e.target?.closest?.(".mode-target-input");
}
function modeTargetCommitContextFromEvent(e) {
    const input = modeTargetInputFromEvent(e);
    const key = modeTargetKeyFromInput(input);
    if (!input || !key)
        return null;
    return modeTargetCommitContextBuild(input, key);
}
function modeTargetKeyFromInput(input) {
    return input?.getAttribute("data-mode");
}
function modeTargetCommitContextBuild(input, key) {
    return { input, key };
}
function modeTargetCommitApplyFromContext(context, modes, deps) {
    if (!modeTargetActionsAllowed())
        return;
    if (modeTargetCommitSkipHandle(modes, deps))
        return;
    modeTargetCommitApplyFromInput(context.input, context.key, modes, deps);
}
function modeTargetKeydownApplyFromEvent(e, input, modes, deps) {
    if (!modeTargetActionsAllowed())
        return;
    const action = MODE_TARGET_KEY_ACTIONS[e.key];
    if (!action)
        return;
    action(input, modes, deps);
}
function modeTargetCommitApplyFromInput(input, key, modes, deps) {
    modeTargetTargetsUpdateFromInput(input, key, deps);
    modeTargetCommitFinalize(modes, deps);
}
function modeTargetCommitFinalize(modes, deps) {
    clearTargetEditState(deps.state);
    modeTargetRerenderFromDeps(modes, deps);
}
function modeTargetTargetsUpdateFromInput(input, key, deps) {
    const parsed = modeTargetValueParseFromInput(input);
    const targets = deps.state.modeTargets || (deps.state.modeTargets = {});
    const action = MODE_TARGET_VALUE_ACTIONS[parsed.kind];
    if (!action)
        return;
    action(targets, key, parsed);
}
function modeTargetRerenderFromDeps(modes, deps) {
    const rerender = modeTargetRerenderFunctionFromDeps(deps);
    if (rerender) {
        rerender();
    }
    else {
        modeTargetRenderUsingCallback(modeTargetModesResolveFromDeps(modes, deps), deps);
    }
}
function modeTargetRerenderFromDepsWithoutDof(modes, deps) {
    const rerender = modeTargetRerenderFunctionFromDeps(deps);
    if (rerender) {
        rerender({ skipDof: true });
    }
    else {
        modeTargetRenderUsingCallback(modeTargetModesResolveFromDeps(modes, deps), deps);
    }
}
function modeTargetRerenderFunctionFromDeps(deps) {
    return typeof deps.state.rerenderFromLastSpectrum === "function"
        ? deps.state.rerenderFromLastSpectrum
        : null;
}
function modeTargetCommitSkipHandle(modes, deps) {
    if (!deps.state.skipNextTargetCommit)
        return false;
    modeTargetCommitFinalize(modes, deps);
    return true;
}
function modeTargetValueParseFromInput(input) {
    const raw = input.value.trim();
    const next = raw ? Number(raw) : NaN;
    if (!raw || !Number.isFinite(next) || next <= 0) {
        return raw ? { kind: "invalid" } : { kind: "empty" };
    }
    return { kind: "value", value: next };
}
function modeTargetActionsAllowed() {
    const toggle = document.getElementById("toggle_overlay");
    return overlayToggleShouldRender(toggle);
}
const MODE_TARGET_VALUE_ACTIONS = {
    empty: (targets, key) => {
        delete targets[key];
    },
    value: (targets, key, parsed) => {
        targets[key] = parsed.value;
    },
};
const MODE_TARGET_KEY_ACTIONS = {
    Escape: (_input, modes, deps) => {
        deps.state.skipNextTargetCommit = true;
        clearTargetEditState(deps.state, { keepSkip: true });
        modeTargetRenderFromLastOrProvided(modes, deps);
    },
    Enter: (input) => {
        input.blur();
    },
};
