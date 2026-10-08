import "../common/notebook_rpc_client.js";

type ResonanceNotebookRestorePayload = {
  ok?: boolean;
  toolId?: string;
  eventId?: string;
  stateDocument?: Record<string, any> | null;
};

type SharedNotebookRpcClient = {
  readNotebookRestorePayload: (
    workbookId: string,
    eventId: string,
    options?: { fetchImpl?: typeof fetch | null; fetchUnavailableMessage?: string },
  ) => Promise<Record<string, unknown>>;
};

export async function readNotebookRestorePayloadForResonance(
  workbookId: string,
  eventId: string,
  fetchImpl?: typeof fetch,
): Promise<ResonanceNotebookRestorePayload> {
  return await readSharedNotebookRpcClient().readNotebookRestorePayload(workbookId, eventId, {
    fetchImpl: fetchImpl || null,
    fetchUnavailableMessage: "Resonance notebook restore fetch is unavailable.",
  });
}

function readSharedNotebookRpcClient(): SharedNotebookRpcClient {
  const shared = (globalThis as any).CommonNotebookRpcClient as SharedNotebookRpcClient | undefined;
  if (!shared) {
    throw new Error("Common notebook rpc client is unavailable.");
  }
  return shared;
}
