import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=2c871654a0c5";
export const RESONATE_STARTUP_RUNNER_FLAG = {
    name: "resonate_startup_runner",
    owner: "resonate",
    defaultValue: true,
    rolloutMode: "on",
    removalCondition: "after parity is proven",
    removalTask: "remove startup runner flag once runner path is default",
};
export function startupModeSelectFromFlag(enabled) {
    return enabled ? "runner" : "legacy";
}
export function startupPlanBuildFromMode(mode) {
    if (mode === "runner") {
        return {
            mode,
            runRunner: true,
            renderMock: false,
            statusText: resonanceLocalizedMessages.saveIdleStatus,
        };
    }
    return {
        mode,
        runRunner: false,
        renderMock: true,
        statusText: resonanceLocalizedMessages.saveIdleStatus,
    };
}
export function startupExecuteFromPlan(plan, deps) {
    if (plan.renderMock) {
        deps.renderMock();
    }
    if (plan.runRunner) {
        deps.runRunner();
    }
    deps.setStatus(plan.statusText);
}
if (typeof window !== "undefined") {
    window.ResonateStartup = {
        RESONATE_STARTUP_RUNNER_FLAG,
        startupModeSelectFromFlag,
        startupPlanBuildFromMode,
        startupExecuteFromPlan,
    };
}
