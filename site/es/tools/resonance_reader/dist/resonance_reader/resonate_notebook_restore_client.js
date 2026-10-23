import "../common/notebook_rpc_client.js?rev=bd81c33a8408";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=bd81c33a8408";
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
