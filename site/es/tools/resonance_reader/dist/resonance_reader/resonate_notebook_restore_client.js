import "../common/notebook_rpc_client.js?rev=b5b8fa4adb00";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=b5b8fa4adb00";
export async function readNotebookRestorePayloadForResonance(workbookId, eventId, fetchImpl) {
    return await readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
        fetchImpl: fetchImpl || null,
        fetchUnavailableMessage: resonanceLocalizedMessages.notebookRestoreFetchUnavailable,
    });
}
function readSharedNotebookRpcClient() {
    const shared = globalThis.CommonNotebookRpcClient;
    if (!shared) {
        throw new Error(resonanceLocalizedMessages.notebookCommonRpcUnavailable);
    }
    return shared;
}
