export async function listNotebookSubjectsForResonanceSave(workbookId) {
    const response = await resonanceNotebookRpcCall("listSubjects", { workbookId });
    return Array.isArray(response) ? response : [];
}
export async function saveNotebookResonanceCapture(args) {
    return await resonanceNotebookRpcCall("saveResonanceReaderCapture", {
        workbookId: args.workbookId,
        payload: {
            subject: args.subject,
            event: args.event,
            package: {
                recordingLabel: args.package.recordingLabel,
                stateJson: args.package.stateJson,
                wavBase64: await resonanceBlobBase64Build(args.package.wavBlob),
                plotPngBase64: await resonanceBlobBase64Build(args.package.plotPngBlob),
            },
        },
    });
}
async function resonanceNotebookRpcCall(method, request) {
    const response = await fetch("/notebook-api/rpc.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ method, ...request }),
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(String(payload?.message || "Notebook save failed."));
    }
    return payload;
}
async function resonanceBlobBase64Build(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    bytes.forEach((value) => {
        binary += String.fromCharCode(value);
    });
    return btoa(binary);
}
