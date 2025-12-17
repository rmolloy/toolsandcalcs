"use strict";
// @ts-nocheck
/*
Auto-wires the 4DOF solver bridge and swaps the global computeResponse to
allow A/B between JS and WASM via query/localStorage. Defaults to JS.
*/
(() => {
    if (typeof globalThis === "undefined")
        return;
    const initBridge = globalThis.initSolverBridge;
    const loadWasm = globalThis.loadSolverWasm;
    const existingCompute = globalThis.computeResponse;
    if (typeof initBridge !== "function" || typeof existingCompute !== "function")
        return;
    const bridge = initBridge(typeof loadWasm === "function" ? loadWasm : undefined);
    globalThis.SolverBridge = bridge;
    if (bridge && bridge.ready && typeof bridge.ready.catch === "function") {
        bridge.ready.catch(() => { });
    }
    // Preserve original for debugging
    globalThis.computeResponseJs = existingCompute;
    globalThis.computeResponse = (params) => bridge.computeResponse(params);
})();
