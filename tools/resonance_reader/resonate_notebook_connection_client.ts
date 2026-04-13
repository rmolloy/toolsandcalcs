type NotebookConnectionPayload = {
  ok?: boolean;
  workbookId?: string;
  notebookName?: string;
};

export async function readNotebookConnectionForResonanceSave(
  fetchImpl: typeof fetch = fetch,
): Promise<{ workbookId: string; notebookName: string } | null> {
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

function notebookConnectionFromPayload(payload: NotebookConnectionPayload): {
  workbookId: string;
  notebookName: string;
} | null {
  const workbookId = String(payload?.workbookId ?? "").trim();
  if (workbookId === "") {
    return null;
  }

  return {
    workbookId,
    notebookName: String(payload?.notebookName ?? "").trim(),
  };
}
