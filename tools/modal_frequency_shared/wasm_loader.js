// @ts-nocheck
/*
Loads the Rust WASM stub for modal analysis and returns a factory compatible
with createFftEngine. This is a tracer-only shim: it exercises the WASM module
and tags the returned engine but leaves the heavy lifting to the existing JS
implementation until the real port lands.
*/
"use strict";
const MODAL_WASM_PATH = "../../wasm/modal_analysis/pkg/modal_analysis.js";
function resolveWasmPath() {
    try {
        return new URL(MODAL_WASM_PATH, typeof document !== "undefined" ? document.baseURI : undefined).toString();
    }
    catch {
        return MODAL_WASM_PATH;
    }
}
async function initWasmModule() {
    const specifier = resolveWasmPath();
    const mod = await import(specifier);
    if (typeof mod.default === "function") {
        await mod.default();
    }
    return mod;
}
async function loadModalWasm() {
    if (typeof WebAssembly === "undefined") {
        throw new Error("WebAssembly not supported in this environment");
    }
    const mod = await initWasmModule();
    const tracer = typeof mod.backend_id === "function" ? mod.backend_id() : "modal_analysis_wasm";
    try {
        console.info("[Modal] WASM backend ready:", tracer);
    }
    catch {
        // ignore console errors
    }
    const jsFactory = globalThis.createFftEngine;
    if (typeof jsFactory !== "function") {
        throw new Error("Missing JS FFT engine. Ensure fft_engine.js is loaded first.");
    }
    return (opts) => {
        var _a;
        try {
            // Minimal tracer call into the WASM stub.
            (_a = mod.summarize_buffer) === null || _a === void 0 ? void 0 : _a.call(mod, new Float32Array([0, 0, 0]), 44100);
        }
        catch {
            // ignore tracer errors
        }
        const engine = jsFactory(opts || {});
        if (engine && typeof engine === "object") {
            engine.__backend = tracer;
        }
        return engine;
    };
}
if (typeof globalThis !== "undefined") {
    globalThis.loadModalWasm = loadModalWasm;
}
