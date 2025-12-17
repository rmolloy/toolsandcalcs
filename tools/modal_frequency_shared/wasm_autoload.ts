// @ts-nocheck
/*
Auto-wires the modal FFT bridge so callers keep using createFftEngine while the
bridge picks JS or WASM. Defaults to JS; toggle with ?modal=wasm or
localStorage["tonelab:modal-backend"].
*/
(() => {
  if (typeof globalThis === "undefined") return;
  const initBridge = (globalThis as any).initModalBridge;
  const loadWasm = (globalThis as any).loadModalWasm;
  const baseFactory = (globalThis as any).createFftEngine;
  if (typeof initBridge !== "function" || typeof baseFactory !== "function") return;

  const bridge = initBridge(typeof loadWasm === "function" ? loadWasm : undefined);
  (globalThis as any).ModalWasmBridge = bridge;
  if (bridge && bridge.ready && typeof bridge.ready.catch === "function") {
    bridge.ready.catch(() => {});
  }

  (globalThis as any).createFftEngineJs = baseFactory;

  (globalThis as any).createFftEngine = (opts?: Record<string, unknown>) =>
    bridge.createFftEngine(opts);
})();
