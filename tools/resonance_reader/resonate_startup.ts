type StartupMode = "legacy" | "runner";

type StartupPlan = {
  mode: StartupMode;
  runRunner: boolean;
  renderMock: boolean;
  statusText: string;
};

type StartupFlag = {
  name: string;
  owner: string;
  defaultValue: boolean;
  rolloutMode: "off" | "on" | "percentage" | "cohort" | "input-class";
  removalCondition: string;
  removalTask: string;
};

export const RESONATE_STARTUP_RUNNER_FLAG: StartupFlag = {
  name: "resonate_startup_runner",
  owner: "resonate",
  defaultValue: true,
  rolloutMode: "on",
  removalCondition: "after parity is proven",
  removalTask: "remove startup runner flag once runner path is default",
};

export function startupModeSelectFromFlag(enabled: boolean): StartupMode {
  return enabled ? "runner" : "legacy";
}

export function startupPlanBuildFromMode(mode: StartupMode): StartupPlan {
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

export function startupExecuteFromPlan(
  plan: StartupPlan,
  deps: { runRunner: () => Promise<void>; renderMock: () => void; setStatus: (text: string) => void },
) {
  if (plan.renderMock) {
    deps.renderMock();
  }
  if (plan.runRunner) {
    deps.runRunner();
  }
  deps.setStatus(plan.statusText);
}

if (typeof window !== "undefined") {
  (window as any).ResonateStartup = {
    RESONATE_STARTUP_RUNNER_FLAG,
    startupModeSelectFromFlag,
    startupPlanBuildFromMode,
    startupExecuteFromPlan,
  };
}
