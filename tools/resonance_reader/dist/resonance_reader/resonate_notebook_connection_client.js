export async function readNotebookConnectionForResonanceSave(fetchImpl = fetch) {
    if (typeof fetchImpl !== "function") {
        return { accessState: "unknown" };
    }
    const response = await fetchImpl("/notebook-api/rpc.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ method: "readDefaultWorkbookConnection" }),
    });
    if (!response.ok) {
        return { accessState: "unknown" };
    }
    return notebookConnectionFromPayload(await response.json());
}
function notebookConnectionFromPayload(payload) {
    const workbookId = String(payload?.workbookId ?? "").trim();
    if (workbookId === "") {
        return {
            accessState: notebookConnectionAccessStateFromPayload(payload),
        };
    }
    return {
        accessState: "lab-connected",
        workbookId,
        notebookName: String(payload?.notebookName ?? "").trim(),
    };
}
function notebookConnectionAccessStateFromPayload(payload) {
    const accessState = String(payload?.accessState ?? "").trim();
    if (accessState === "anonymous" || accessState === "signed_in_not_enabled" || accessState === "signed_in_no_workbook") {
        return accessState;
    }
    return "unknown";
}
