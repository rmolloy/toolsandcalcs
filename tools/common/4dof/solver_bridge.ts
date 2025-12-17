// @ts-nocheck
/*
Bridge to swap the 4DOF solver between JS and WASM without touching callers.
Defaults to JS; honors ?solver=wasm when the WASM loader is plugged in.
*/

type BackendMode = "js" | "wasm";
type ComputeFn = (params: Record<string, number | boolean | undefined>) => any;

function readQueryMode(): BackendMode | null {
  if (typeof window === "undefined") return null;
  const mode = new URLSearchParams(window.location?.search || "").get("solver");
  if (mode === "wasm" || mode === "js") return mode;
  return null;
}

function resolvePreferredMode(): BackendMode {
  return readQueryMode() || "js";
}

function jsCompute(): ComputeFn {
  const fn = (globalThis as any).computeResponse;
  if (typeof fn !== "function") {
    throw new Error("Missing JS solver. Ensure tools/common/solver_core.js is loaded first.");
  }
  return fn;
}

type SolverBridge = {
  mode: BackendMode;
  ready: Promise<void>;
  computeResponse: ComputeFn;
  setPreferredMode: (mode: BackendMode) => void;
};

/**
 * loader: optional async hook that returns a WASM-backed computeResponse.
 * When absent, "wasm" preference silently falls back to JS.
 */
function initSolverBridge(loader?: () => Promise<ComputeFn>): SolverBridge {
  let mode: BackendMode = resolvePreferredMode();
  let compute: ComputeFn = jsCompute();
  let ready: Promise<void> = Promise.resolve();

  if (mode === "wasm") {
    if (loader) {
      ready = loader()
        .then((fn) => { compute = fn; })
        .catch(() => {
          mode = "js";
          compute = jsCompute();
        });
    } else {
      mode = "js";
    }
  }

  const setPreferredMode = (next: BackendMode) => {
    mode = next;
    bridge.mode = next;
  };

  const bridge: SolverBridge = {
    mode,
    ready,
    computeResponse: (params) => compute(params),
    setPreferredMode
  };

  if (typeof globalThis !== "undefined") {
    (globalThis as any).SolverBridge = bridge;
  }

  return bridge;
}

if (typeof globalThis !== "undefined") {
  (globalThis as any).initSolverBridge = initSolverBridge;
}
