export type DofTraceName = "Current" | "Target" | "Top" | "Air" | "Back" | "Sides";

export type DofTraceVisibilityState = Partial<Record<DofTraceName, boolean>>;

export type DofVisibilityTrace = {
  name?: unknown;
  visible?: unknown;
};

export type DofVisibilityPlot = {
  data?: unknown;
};

export const DOF_TRACE_DEFAULT_VISIBLE: Record<DofTraceName, boolean> = {
  Current: true,
  Target: true,
  Top: false,
  Air: false,
  Back: false,
  Sides: false,
};

export function isDofTraceName(value: unknown): value is DofTraceName {
  return typeof value === "string" && value in DOF_TRACE_DEFAULT_VISIBLE;
}

export function readDofTraceVisibleValue(
  name: DofTraceName,
  state: DofTraceVisibilityState,
): true | "legendonly" {
  const visible = state[name];
  const fallback = DOF_TRACE_DEFAULT_VISIBLE[name];
  return (visible ?? fallback) ? true : "legendonly";
}

export function applyDofTraceVisibility(
  trace: DofVisibilityTrace | null,
  name: DofTraceName,
  state: DofTraceVisibilityState,
) {
  if (!trace) return;
  trace.visible = readDofTraceVisibleValue(name, state);
}

export function syncDofTraceVisibilityStateFromPlot(
  plot: DofVisibilityPlot,
  state: DofTraceVisibilityState,
) {
  const traces = plot.data;
  if (!Array.isArray(traces)) return;

  const nextState: DofTraceVisibilityState = {};
  traces.forEach((trace: DofVisibilityTrace) => {
    const name = trace?.name;
    if (!isDofTraceName(name)) return;
    const isVisible = trace.visible === undefined || trace.visible === true;
    nextState[name] = (nextState[name] ?? false) || isVisible;
  });

  Object.keys(nextState).forEach((name) => {
    if (!isDofTraceName(name)) return;
    state[name] = Boolean(nextState[name]);
  });
}
