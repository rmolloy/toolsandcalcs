export async function readNotebookConnectionForResonanceSave(fetchImpl = fetch) {
    if (typeof fetchImpl !== "function") {
        return null;
    }
    const response = await fetchImpl("/notebook-api/rpc.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ method: "readDefaultWorkbookConnection" }),
    });
    if (!response.ok) {
        return null;
    }
    return notebookConnectionFromPayload(await response.json());
}
function notebookConnectionFromPayload(payload) {
    const workbookId = String(payload?.workbookId ?? "").trim();
    if (workbookId === "") {
        return null;
    }
    return {
        workbookId,
        notebookName: String(payload?.notebookName ?? "").trim(),
    };
}
