// @ts-nocheck
/*
Auto-wires the 4DOF solver bridge and swaps the global computeResponse to
allow A/B between JS and WASM via query/localStorage. Defaults to JS.
*/
(() => {
  if (typeof globalThis === "undefined") return;
  const initBridge = (globalThis as any).initSolverBridge;
  const loadWasm = (globalThis as any).loadSolverWasm;
  const existingCompute = (globalThis as any).computeResponse;
  if (typeof initBridge !== "function" || typeof existingCompute !== "function") return;

  const bridge = initBridge(typeof loadWasm === "function" ? loadWasm : undefined);
  (globalThis as any).SolverBridge = bridge;
  if (bridge && bridge.ready && typeof bridge.ready.catch === "function") {
    bridge.ready.catch(() => {});
  }

  // Preserve original for debugging
  (globalThis as any).computeResponseJs = existingCompute;

  (globalThis as any).computeResponse = (params: Record<string, number | boolean | undefined>) =>
    bridge.computeResponse(params);
})();
