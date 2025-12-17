"use strict";
// @ts-nocheck
/*
Bridge for modal-frequency tools (reader/lab/wolf) to flip between JS and WASM
FFT/analysis engines. Defaults to JS; honors ?modal=wasm or the
?modal=wasm query param when a WASM loader is provided.
*/
function readQueryMode() {
    var _a;
    if (typeof window === "undefined")
        return null;
    const mode = new URLSearchParams(((_a = window.location) === null || _a === void 0 ? void 0 : _a.search) || "").get("modal");
    if (mode === "wasm" || mode === "js")
        return mode;
    return null;
}
function resolvePreferredMode() {
    return readQueryMode() || "js";
}
function jsEngineFactory() {
    const factory = globalThis.createFftEngine;
    if (typeof factory !== "function") {
        throw new Error("Missing JS FFT engine. Ensure tools/modal_frequency_shared/fft_engine.js is loaded first.");
    }
    return factory;
}
function initModalBridge(loader) {
    let mode = resolvePreferredMode();
    let createFftEngine = jsEngineFactory();
    let ready = Promise.resolve();
    if (mode === "wasm") {
        if (loader) {
            ready = loader()
                .then((factory) => { createFftEngine = factory; })
                .catch(() => {
                mode = "js";
                createFftEngine = jsEngineFactory();
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
        createFftEngine: (opts) => createFftEngine(opts),
        setPreferredMode
    };
    if (typeof globalThis !== "undefined") {
        globalThis.ModalWasmBridge = bridge;
    }
    return bridge;
}
if (typeof globalThis !== "undefined") {
    globalThis.initModalBridge = initModalBridge;
}
