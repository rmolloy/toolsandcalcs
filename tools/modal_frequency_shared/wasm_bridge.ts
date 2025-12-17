// @ts-nocheck
/*
Bridge for modal-frequency tools (reader/lab/wolf) to flip between JS and WASM
FFT/analysis engines. Defaults to JS; honors ?modal=wasm or the
?modal=wasm query param when a WASM loader is provided.
*/

type BackendMode = "js" | "wasm";
type EngineFactory = (opts?: Record<string, unknown>) => any;

function readQueryMode(): BackendMode | null {
  if (typeof window === "undefined") return null;
  const mode = new URLSearchParams(window.location?.search || "").get("modal");
  if (mode === "wasm" || mode === "js") return mode;
  return null;
}

function resolvePreferredMode(): BackendMode {
  return readQueryMode() || "js";
}

function jsEngineFactory(): EngineFactory {
  const factory = (globalThis as any).createFftEngine;
  if (typeof factory !== "function") {
    throw new Error("Missing JS FFT engine. Ensure tools/modal_frequency_shared/fft_engine.js is loaded first.");
  }
  return factory;
}

type ModalBridge = {
  mode: BackendMode;
  ready: Promise<void>;
  createFftEngine: EngineFactory;
  setPreferredMode: (mode: BackendMode) => void;
};

function initModalBridge(loader?: () => Promise<EngineFactory>): ModalBridge {
  let mode: BackendMode = resolvePreferredMode();
  let createFftEngine: EngineFactory = jsEngineFactory();
  let ready: Promise<void> = Promise.resolve();

  if (mode === "wasm") {
    if (loader) {
      ready = loader()
        .then((factory) => { createFftEngine = factory; })
        .catch(() => {
          mode = "js";
          createFftEngine = jsEngineFactory();
        });
    } else {
      mode = "js";
    }
  }

  const setPreferredMode = (next: BackendMode) => {
    mode = next;
    bridge.mode = next;
  };

  const bridge: ModalBridge = {
    mode,
    ready,
    createFftEngine: (opts) => createFftEngine(opts),
    setPreferredMode
  };

  if (typeof globalThis !== "undefined") {
    (globalThis as any).ModalWasmBridge = bridge;
  }

  return bridge;
}

if (typeof globalThis !== "undefined") {
  (globalThis as any).initModalBridge = initModalBridge;
}
