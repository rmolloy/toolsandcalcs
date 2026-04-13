type ResonanceNotebookRestorePayload = {
  ok?: boolean;
  toolId?: string;
  eventId?: string;
  stateDocument?: Record<string, any> | null;
};

export async function readNotebookRestorePayloadForResonance(
  workbookId: string,
  eventId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResonanceNotebookRestorePayload> {
  const response = await fetchImpl("/notebook-api/rpc.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      method: "readToolRestorePayload",
      workbookId,
      payload: { eventId },
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(String(payload?.message || "Notebook restore failed."));
  }

  return payload || {};
}
