// @ts-nocheck
/*
Loads the Rust WASM stub for the 4DOF solver and returns a computeResponse
shim compatible with the existing JS API. Used only when the bridge opts into
the WASM backend; otherwise callers stay on JS.
*/

const SOLVER_WASM_PATH = "../../wasm/solver_core/pkg/solver_core.js";

function resolveWasmPath() {
  try {
    return new URL(SOLVER_WASM_PATH, typeof document !== "undefined" ? document.baseURI : undefined).toString();
  } catch {
    return SOLVER_WASM_PATH;
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

async function loadSolverWasm() {
  if (typeof WebAssembly === "undefined") {
    throw new Error("WebAssembly not supported in this environment");
  }
  const mod: any = await initWasmModule();
  const tracer = typeof mod.backend_id === "function" ? mod.backend_id() : "solver_core_wasm";
  try {
    console.info("[4DOF] WASM backend ready:", tracer);
  } catch {
    // ignore console errors
  }

  return (params: Record<string, number | boolean | undefined>) => {
    try {
      if (typeof mod.compute_response === "function") {
        return mod.compute_response(params);
      }
    } catch (err) {
      console.warn("[4DOF] WASM compute_response failed; falling back to stub/JS.", err);
    }
    if (typeof mod.compute_response_stub === "function") {
      return mod.compute_response_stub();
    }
    throw new Error("WASM solver exports missing compute_response");
  };
}

if (typeof globalThis !== "undefined") {
  (globalThis as any).loadSolverWasm = loadSolverWasm;
}
