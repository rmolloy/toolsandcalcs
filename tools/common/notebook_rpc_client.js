"use strict";
// The notebook RPC client shared by every tool that talks to the notebook:
// read the default workbook connection, list subjects, save a capture and
// read a restore payload. Each tool keeps a thin adapter that names its own
// capture method; the transport, error handling and preview-server guard live
// here once.
(() => {
    const NOTEBOOK_RPC_URL = "/notebook-api/rpc.php";
    const RAW_STATIC_PREVIEW_PORT = "8090";
    // A notebook connection probe answers null instead of throwing: a tool that
    // cannot reach the notebook falls back to its offline save surface.
    async function readNotebookConnection(options) {
        const injected = options === null || options === void 0 ? void 0 : options.fetchImpl;
        const fetchApi = fetchImplResolve(injected);
        if (!fetchApi)
            return null;
        if (!injected && shouldSkipNotebookConnectionProbe())
            return null;
        try {
            const response = await fetchApi(NOTEBOOK_RPC_URL, rpcRequestInitBuild({ method: "readDefaultWorkbookConnection" }));
            if (!response.ok)
                return null;
            return notebookConnectionPayloadRead(await response.json());
        }
        catch {
            return null;
        }
    }
    // Pages opened from disk or from a raw static server have no PHP behind
    // them, so the probe is skipped rather than sent to a 404.
    function shouldSkipNotebookConnectionProbe() {
        const location = globalThis.location;
        if (!location)
            return false;
        if (location.protocol === "file:")
            return true;
        const loopback = location.hostname === "127.0.0.1" || location.hostname === "localhost";
        return loopback && location.port === RAW_STATIC_PREVIEW_PORT;
    }
    function notebookConnectionPayloadRead(payload) {
        const source = (payload && typeof payload === "object" ? payload : {});
        const workbookId = String(source.workbookId || "").trim();
        if (!workbookId)
            return null;
        return { workbookId, notebookName: String(source.notebookName || "").trim() };
    }
    // Listing subjects is the first step of a save, so a failure reads as one.
    async function listNotebookSubjects(workbookId, options) {
        const response = await callNotebookRpc("listSubjects", { workbookId }, { failureMessage: "Notebook save failed.", ...options });
        return Array.isArray(response) ? response : [];
    }
    // Saves a state-document capture: the shape every script-tag tool sends.
    async function saveNotebookStateCapture(method, args, options) {
        return callNotebookRpc(method, {
            workbookId: args.workbookId,
            payload: {
                subject: args.subject,
                event: args.event,
                package: { stateJson: String((args.package && args.package.stateJson) || "") },
            },
        }, { failureMessage: "Notebook save failed.", ...options });
    }
    async function readNotebookRestorePayload(workbookId, eventId, options) {
        const payload = await callNotebookRpc("readToolRestorePayload", { workbookId, payload: { eventId } }, {
            failureMessage: "Notebook restore failed.",
            fetchUnavailableMessage: "Notebook restore fetch is unavailable.",
            ...options,
        });
        return (payload && typeof payload === "object" ? payload : {});
    }
    // One POST to the notebook endpoint. A non-2xx answer becomes an Error
    // carrying the server's message, or the caller's failure message.
    async function callNotebookRpc(method, request, options) {
        const fetchApi = fetchImplResolve(options === null || options === void 0 ? void 0 : options.fetchImpl);
        if (!fetchApi)
            throw new Error((options === null || options === void 0 ? void 0 : options.fetchUnavailableMessage) || "Notebook fetch is unavailable.");
        const response = await fetchApi(NOTEBOOK_RPC_URL, rpcRequestInitBuild({ method, ...(request || {}) }));
        const payload = await response.json();
        if (!response.ok) {
            const message = (payload && typeof payload === "object" && payload.message) || "";
            throw new Error(String(message || (options === null || options === void 0 ? void 0 : options.failureMessage) || "Notebook request failed."));
        }
        return payload;
    }
    function rpcRequestInitBuild(body) {
        return {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body),
        };
    }
    // The page's window is preferred over globalThis so a test that stands up a
    // fake window with its own fetch is honoured; in a browser they are the same.
    function fetchImplResolve(fetchImpl) {
        if (typeof fetchImpl === "function")
            return fetchImpl;
        const scope = (typeof window !== "undefined" ? window : globalThis);
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
        globalScope.CommonNotebookRpcClient = CommonNotebookRpcClient;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = CommonNotebookRpcClient;
    }
})();
