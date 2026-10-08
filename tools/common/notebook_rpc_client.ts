"use strict";

// The notebook RPC client shared by every tool that talks to the notebook:
// read the default workbook connection, list subjects, save a capture and
// read a restore payload. Each tool keeps a thin adapter that names its own
// capture method; the transport, error handling and preview-server guard live
// here once.
(() => {
  type NotebookConnection = { workbookId: string; notebookName: string };
  type FetchLike = (input: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

  type ReadConnectionOptions = {
    fetchImpl?: FetchLike | null;
  };

  type RpcOptions = {
    fetchImpl?: FetchLike | null;
    failureMessage?: string;
    fetchUnavailableMessage?: string;
  };

  type SaveCaptureArgs = {
    workbookId: string;
    subject: Record<string, unknown>;
    event: Record<string, unknown>;
    package?: { stateJson?: unknown } | null;
  };

  const NOTEBOOK_RPC_URL = "/notebook-api/rpc.php";
  const RAW_STATIC_PREVIEW_PORT = "8090";

  // A notebook connection probe answers null instead of throwing: a tool that
  // cannot reach the notebook falls back to its offline save surface.
  async function readNotebookConnection(options?: ReadConnectionOptions): Promise<NotebookConnection | null> {
    const injected = options?.fetchImpl;
    const fetchApi = fetchImplResolve(injected);
    if (!fetchApi) return null;
    if (!injected && shouldSkipNotebookConnectionProbe()) return null;

    try {
      const response = await fetchApi(NOTEBOOK_RPC_URL, rpcRequestInitBuild({ method: "readDefaultWorkbookConnection" }));
      if (!response.ok) return null;
      return notebookConnectionPayloadRead(await response.json());
    } catch {
      return null;
    }
  }

  // Pages opened from disk or from a raw static server have no PHP behind
  // them, so the probe is skipped rather than sent to a 404.
  function shouldSkipNotebookConnectionProbe(): boolean {
    const location = (globalThis as any).location as { protocol?: string; hostname?: string; port?: string } | undefined;
    if (!location) return false;
    if (location.protocol === "file:") return true;
    const loopback = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    return loopback && location.port === RAW_STATIC_PREVIEW_PORT;
  }

  function notebookConnectionPayloadRead(payload: unknown): NotebookConnection | null {
    const source = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
    const workbookId = String(source.workbookId || "").trim();
    if (!workbookId) return null;
    return { workbookId, notebookName: String(source.notebookName || "").trim() };
  }

  // Listing subjects is the first step of a save, so a failure reads as one.
  async function listNotebookSubjects(workbookId: string, options?: RpcOptions): Promise<unknown[]> {
    const response = await callNotebookRpc("listSubjects", { workbookId }, { failureMessage: "Notebook save failed.", ...options });
    return Array.isArray(response) ? response : [];
  }

  // Saves a state-document capture: the shape every script-tag tool sends.
  async function saveNotebookStateCapture(method: string, args: SaveCaptureArgs, options?: RpcOptions): Promise<unknown> {
    return callNotebookRpc(method, {
      workbookId: args.workbookId,
      payload: {
        subject: args.subject,
        event: args.event,
        package: { stateJson: String((args.package && args.package.stateJson) || "") },
      },
    }, { failureMessage: "Notebook save failed.", ...options });
  }

  async function readNotebookRestorePayload(workbookId: string, eventId: string, options?: RpcOptions): Promise<Record<string, unknown>> {
    const payload = await callNotebookRpc("readToolRestorePayload", { workbookId, payload: { eventId } }, {
      failureMessage: "Notebook restore failed.",
      fetchUnavailableMessage: "Notebook restore fetch is unavailable.",
      ...options,
    });
    return (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  }

  // One POST to the notebook endpoint. A non-2xx answer becomes an Error
  // carrying the server's message, or the caller's failure message.
  async function callNotebookRpc(method: string, request?: Record<string, unknown>, options?: RpcOptions): Promise<unknown> {
    const fetchApi = fetchImplResolve(options?.fetchImpl);
    if (!fetchApi) throw new Error(options?.fetchUnavailableMessage || "Notebook fetch is unavailable.");
    const response = await fetchApi(NOTEBOOK_RPC_URL, rpcRequestInitBuild({ method, ...(request || {}) }));
    const payload = await response.json();
    if (!response.ok) {
      const message = (payload && typeof payload === "object" && (payload as Record<string, unknown>).message) || "";
      throw new Error(String(message || options?.failureMessage || "Notebook request failed."));
    }
    return payload;
  }

  function rpcRequestInitBuild(body: Record<string, unknown>): Record<string, unknown> {
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    };
  }

  // The page's window is preferred over globalThis so a test that stands up a
  // fake window with its own fetch is honoured; in a browser they are the same.
  function fetchImplResolve(fetchImpl?: FetchLike | null): FetchLike | null {
    if (typeof fetchImpl === "function") return fetchImpl;
    const scope = (typeof window !== "undefined" ? window : globalThis) as any;
    const scopedFetch = scope && scope.fetch;
    return typeof scopedFetch === "function" ? scopedFetch.bind(scope) : null;
  }

  const CommonNotebookRpcClient = {
    readNotebookConnection,
    listNotebookSubjects,
    saveNotebookStateCapture,
    readNotebookRestorePayload,
    callNotebookRpc,
  };

  const globalScope = typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : undefined;

  if (globalScope) {
    (globalScope as any).CommonNotebookRpcClient = CommonNotebookRpcClient;
  }

  if (typeof module !== "undefined" && (module as any).exports) {
    (module as any).exports = CommonNotebookRpcClient;
  }
})();
