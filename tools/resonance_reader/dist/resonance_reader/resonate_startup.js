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
            statusText: "Load or record to view the waveform.",
        };
    }
    return {
        mode,
        runRunner: false,
        renderMock: true,
        statusText: "Load or record to view the waveform.",
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
