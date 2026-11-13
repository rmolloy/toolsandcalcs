import "../common/notebook_rpc_client.js?rev=d1d4f852375a";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=d1d4f852375a";
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
