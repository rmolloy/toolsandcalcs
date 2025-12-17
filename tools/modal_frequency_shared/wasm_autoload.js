"use strict";
// @ts-nocheck
/*
Auto-wires the modal FFT bridge so callers keep using createFftEngine while the
bridge picks JS or WASM. Defaults to JS; toggle with ?modal=wasm or
localStorage["tonelab:modal-backend"].
*/
(() => {
    if (typeof globalThis === "undefined")
        return;
    const initBridge = globalThis.initModalBridge;
    const loadWasm = globalThis.loadModalWasm;
    const baseFactory = globalThis.createFftEngine;
    if (typeof initBridge !== "function" || typeof baseFactory !== "function")
        return;
    const bridge = initBridge(typeof loadWasm === "function" ? loadWasm : undefined);
    globalThis.ModalWasmBridge = bridge;
    if (bridge && bridge.ready && typeof bridge.ready.catch === "function") {
        bridge.ready.catch(() => { });
    }
    globalThis.createFftEngineJs = baseFactory;
    globalThis.createFftEngine = (opts) => bridge.createFftEngine(opts);
})();
