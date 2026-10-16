import "../common/notebook_rpc_client.js?rev=62b34eeddf93";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=62b34eeddf93";
export async function listNotebookSubjectsForResonanceSave(workbookId) {
    return await readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
}
// The reader's capture carries the recording and the plot as base64 beside the
// state document, so it builds its own package and posts through the shared
// client rather than the state-only save every other tool uses.
export async function saveNotebookResonanceCapture(args) {
    return await readSharedNotebookRpcClient().callNotebookRpc("saveResonanceReaderCapture", {
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
    }, { failureMessage: resonanceLocalizedMessages.notebookSaveFailed });
}
function readSharedNotebookRpcClient() {
    const shared = globalThis.CommonNotebookRpcClient;
    if (!shared) {
        throw new Error(resonanceLocalizedMessages.notebookCommonRpcUnavailable);
    }
    return shared;
}
async function resonanceBlobBase64Build(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    bytes.forEach((value) => {
        binary += String.fromCharCode(value);
    });
    return btoa(binary);
}
