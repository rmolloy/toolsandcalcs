import "../common/notebook_rpc_client.js";

type SharedNotebookRpcClient = {
  listNotebookSubjects: (workbookId: string) => Promise<any[]>;
  callNotebookRpc: (method: string, request?: Record<string, unknown>, options?: { failureMessage?: string }) => Promise<any>;
};

export async function listNotebookSubjectsForResonanceSave(workbookId: string): Promise<any[]> {
  return await readSharedNotebookRpcClient().listNotebookSubjects(workbookId);
}

// The reader's capture carries the recording and the plot as base64 beside the
// state document, so it builds its own package and posts through the shared
// client rather than the state-only save every other tool uses.
export async function saveNotebookResonanceCapture(args: {
  workbookId: string;
  subject: Record<string, any>;
  event: Record<string, any>;
  package: {
    recordingLabel: string;
    stateJson: string;
    wavBlob: Blob;
    plotPngBlob: Blob;
  };
}): Promise<any> {
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
  }, { failureMessage: "Notebook save failed." });
}

function readSharedNotebookRpcClient(): SharedNotebookRpcClient {
  const shared = (globalThis as any).CommonNotebookRpcClient as SharedNotebookRpcClient | undefined;
  if (!shared) {
    throw new Error("Common notebook rpc client is unavailable.");
  }
  return shared;
}

async function resonanceBlobBase64Build(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}
