import "../common/notebook_rpc_client.js?rev=62152aa99b89";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=62152aa99b89";
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
