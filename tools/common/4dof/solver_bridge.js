"use strict";
// @ts-nocheck
/*
Bridge to swap the 4DOF solver between JS and WASM without touching callers.
Defaults to JS; honors ?solver=wasm when the WASM loader is plugged in.
*/
function readQueryMode() {
    var _a;
    if (typeof window === "undefined")
        return null;
    const mode = new URLSearchParams(((_a = window.location) === null || _a === void 0 ? void 0 : _a.search) || "").get("solver");
    if (mode === "wasm" || mode === "js")
        return mode;
    return null;
}
function resolvePreferredMode() {
    return readQueryMode() || "js";
}
function jsCompute() {
    const fn = globalThis.computeResponse;
    if (typeof fn !== "function") {
        throw new Error("Missing JS solver. Ensure tools/common/solver_core.js is loaded first.");
    }
    return fn;
}
/**
 * loader: optional async hook that returns a WASM-backed computeResponse.
 * When absent, "wasm" preference silently falls back to JS.
 */
function initSolverBridge(loader) {
    let mode = resolvePreferredMode();
    let compute = jsCompute();
    let ready = Promise.resolve();
    if (mode === "wasm") {
        if (loader) {
            ready = loader()
                .then((fn) => { compute = fn; })
                .catch(() => {
                mode = "js";
                compute = jsCompute();
            });
        }
        else {
            mode = "js";
        }
    }
    const setPreferredMode = (next) => {
        mode = next;
        bridge.mode = next;
    };
    const bridge = {
        mode,
        ready,
        computeResponse: (params) => compute(params),
        setPreferredMode
    };
    if (typeof globalThis !== "undefined") {
        globalThis.SolverBridge = bridge;
    }
    return bridge;
}
if (typeof globalThis !== "undefined") {
    globalThis.initSolverBridge = initSolverBridge;
}
