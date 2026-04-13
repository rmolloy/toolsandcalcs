import { renderPayloadBuildFromState } from "./resonate_render_events.js";

const RESONANCE_NOTEBOOK_CONNECT_DRAFT_KEY = "resonanceNotebookConnectDraft";

type ResonanceNotebookConnectDraft = {
  version: 1;
  returnTo: string;
  recordingLabel: string;
  measureMode: string;
  renderPayload: ReturnType<typeof renderPayloadBuildFromState>;
  plateMaterialMeasurements: unknown;
  customMeasurements: unknown;
  selection: {
    viewRangeMs: [number, number] | null;
    noteSelectionRangeMs: [number, number] | null;
  };
  currentWave: {
    sampleRate: number;
    samplesBase64: string;
  } | null;
};

export function persistResonanceNotebookConnectDraft(
  runtime: Pick<Window, "location" | "sessionStorage">,
  state: Record<string, any>,
  recordingLabel: string,
): boolean {
  const storage = readResonanceNotebookConnectDraftStorage(runtime);

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      RESONANCE_NOTEBOOK_CONNECT_DRAFT_KEY,
      JSON.stringify(buildResonanceNotebookConnectDraft(runtime, state, recordingLabel)),
    );
    return true;
  } catch (_error) {
    return false;
  }
}

export function consumeResonanceNotebookConnectDraft(
  runtime: Pick<Window, "location" | "sessionStorage">,
): ResonanceNotebookConnectDraft | null {
  const storage = readResonanceNotebookConnectDraftStorage(runtime);

  if (!storage) {
    return null;
  }

  const draft = parseResonanceNotebookConnectDraft(storage.getItem(RESONANCE_NOTEBOOK_CONNECT_DRAFT_KEY));

  if (!draft || !doesResonanceNotebookConnectDraftMatchCurrentPath(runtime, draft)) {
    return null;
  }

  storage.removeItem(RESONANCE_NOTEBOOK_CONNECT_DRAFT_KEY);
  return draft;
}

export function restoreResonanceNotebookConnectDraftState(
  state: Record<string, any>,
  draft: ResonanceNotebookConnectDraft | null,
): boolean {
  if (!draft) {
    return false;
  }

  state.measureMode = draft.measureMode;
  state.recordingLabel = draft.recordingLabel;
  state.plateMaterialMeasurements = cloneResonanceNotebookConnectDraftValue(draft.plateMaterialMeasurements);
  state.customMeasurements = cloneResonanceNotebookConnectDraftValue(draft.customMeasurements) || [];
  state.viewRangeMs = cloneResonanceNotebookConnectDraftRange(draft.selection.viewRangeMs);
  state.noteSelectionRangeMs = cloneResonanceNotebookConnectDraftRange(draft.selection.noteSelectionRangeMs);
  state.currentWave = buildResonanceNotebookConnectDraftWaveFromStored(draft.currentWave);
  restoreResonanceNotebookConnectDraftRenderState(state, draft.renderPayload);
  return true;
}

export function restoreResonanceSavedStateDocument(
  state: Record<string, any>,
  savedDocument: Record<string, any> | null | undefined,
): boolean {
  if (!isResonanceSavedStateDocument(savedDocument)) {
    return false;
  }

  return restoreResonanceNotebookConnectDraftState(
    state,
    buildResonanceNotebookConnectDraftFromSavedDocument(savedDocument),
  );
}

function buildResonanceNotebookConnectDraft(
  runtime: Pick<Window, "location">,
  state: Record<string, any>,
  recordingLabel: string,
): ResonanceNotebookConnectDraft {
  return {
    version: 1,
    returnTo: readResonanceNotebookConnectDraftReturnTo(runtime),
    recordingLabel: String(recordingLabel || "").trim(),
    measureMode: String(state.measureMode || "").trim(),
    renderPayload: cloneResonanceNotebookConnectDraftValue(renderPayloadBuildFromState(state)),
    plateMaterialMeasurements: cloneResonanceNotebookConnectDraftValue(state.plateMaterialMeasurements ?? null),
    customMeasurements: cloneResonanceNotebookConnectDraftValue(state.customMeasurements ?? []),
    selection: {
      viewRangeMs: cloneResonanceNotebookConnectDraftRange(state.viewRangeMs),
      noteSelectionRangeMs: cloneResonanceNotebookConnectDraftRange(state.noteSelectionRangeMs),
    },
    currentWave: buildResonanceNotebookConnectDraftWave(state.currentWave),
  };
}

function buildResonanceNotebookConnectDraftFromSavedDocument(
  savedDocument: Record<string, any>,
): ResonanceNotebookConnectDraft {
  return {
    version: 1,
    returnTo: "",
    recordingLabel: String(savedDocument.recordingLabel || "").trim(),
    measureMode: String(savedDocument.measureMode || "").trim(),
    renderPayload: cloneResonanceNotebookConnectDraftValue(savedDocument.renderPayload),
    plateMaterialMeasurements: cloneResonanceNotebookConnectDraftValue(savedDocument.plateMaterialMeasurements ?? null),
    customMeasurements: cloneResonanceNotebookConnectDraftValue(savedDocument.customMeasurements ?? []),
    selection: {
      viewRangeMs: cloneResonanceNotebookConnectDraftRange(savedDocument.selection?.viewRangeMs),
      noteSelectionRangeMs: cloneResonanceNotebookConnectDraftRange(savedDocument.selection?.noteSelectionRangeMs),
    },
    currentWave: readResonanceSavedDocumentCurrentWave(savedDocument),
  };
}

function readResonanceSavedDocumentCurrentWave(savedDocument: Record<string, any>) {
  const currentWave = savedDocument.currentWave;

  if (!currentWave || typeof currentWave !== "object") {
    return null;
  }

  const sampleRate = Number((currentWave as Record<string, any>).sampleRate);
  const samplesBase64 = String((currentWave as Record<string, any>).samplesBase64 || "").trim();

  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samplesBase64 === "") {
    return null;
  }

  return {
    sampleRate,
    samplesBase64,
  };
}

function isResonanceSavedStateDocument(savedDocument: Record<string, any> | null | undefined): savedDocument is Record<string, any> {
  return String(savedDocument?.toolDocumentType || "").trim() === "RESONANCE_READER_SAVE";
}

function readResonanceNotebookConnectDraftReturnTo(runtime: Pick<Window, "location">): string {
  const pathname = String(runtime?.location?.pathname || "").trim();
  const search = String(runtime?.location?.search || "").trim();
  return `${pathname}${search}`;
}

function buildResonanceNotebookConnectDraftWave(currentWave: Record<string, any> | null | undefined) {
  const samples = readResonanceNotebookConnectDraftSamples(currentWave?.wave);
  const sampleRate = Number(currentWave?.sampleRate);

  if (!samples || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    return null;
  }

  return {
    sampleRate,
    samplesBase64: encodeResonanceNotebookConnectDraftSamples(samples),
  };
}

function readResonanceNotebookConnectDraftSamples(value: unknown): ArrayLike<number> | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (ArrayBuffer.isView(value) && "length" in value) {
    return value as unknown as ArrayLike<number>;
  }

  return null;
}

function encodeResonanceNotebookConnectDraftSamples(samples: ArrayLike<number>): string {
  const floatSamples = new Float32Array(samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    floatSamples[index] = Number(samples[index] || 0);
  }

  return encodeResonanceNotebookConnectDraftBytes(floatSamples.buffer);
}

function encodeResonanceNotebookConnectDraftBytes(buffer: ArrayBuffer): string {
  const nodeBuffer = readResonanceNotebookConnectDraftNodeBuffer();

  if (nodeBuffer) {
    return nodeBuffer.from(buffer).toString("base64");
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function parseResonanceNotebookConnectDraft(value: string | null): ResonanceNotebookConnectDraft | null {
  if (!value) {
    return null;
  }

  try {
    const draft = JSON.parse(value) as ResonanceNotebookConnectDraft;
    return draft && draft.version === 1 ? draft : null;
  } catch (_error) {
    return null;
  }
}

function doesResonanceNotebookConnectDraftMatchCurrentPath(
  runtime: Pick<Window, "location">,
  draft: ResonanceNotebookConnectDraft,
): boolean {
  return readResonanceNotebookConnectDraftReturnTo(runtime) === String(draft.returnTo || "").trim();
}

function readResonanceNotebookConnectDraftStorage(
  runtime: Pick<Window, "sessionStorage">,
): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  return runtime?.sessionStorage || null;
}

function cloneResonanceNotebookConnectDraftValue<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function cloneResonanceNotebookConnectDraftRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  return [Number(value[0]), Number(value[1])];
}

function buildResonanceNotebookConnectDraftWaveFromStored(
  currentWave: ResonanceNotebookConnectDraft["currentWave"],
) {
  if (!currentWave) {
    return null;
  }

  return {
    sampleRate: Number(currentWave.sampleRate),
    wave: decodeResonanceNotebookConnectDraftSamples(currentWave.samplesBase64),
  };
}

function decodeResonanceNotebookConnectDraftSamples(base64: string): Float32Array {
  const bytes = decodeResonanceNotebookConnectDraftBytes(base64);
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function decodeResonanceNotebookConnectDraftBytes(base64: string): Uint8Array {
  const nodeBuffer = readResonanceNotebookConnectDraftNodeBuffer();

  if (nodeBuffer) {
    return new Uint8Array(nodeBuffer.from(base64, "base64"));
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function readResonanceNotebookConnectDraftNodeBuffer():
  | { from(value: ArrayBuffer | string, encoding?: string): { toString(encoding?: string): string } & Uint8Array }
  | null {
  const candidate = (globalThis as {
    Buffer?: {
      from(value: ArrayBuffer | string, encoding?: string): { toString(encoding?: string): string } & Uint8Array;
    };
  }).Buffer;
  return candidate || null;
}

function restoreResonanceNotebookConnectDraftRenderState(
  state: Record<string, any>,
  renderPayload: ReturnType<typeof renderPayloadBuildFromState>,
) {
  if (!renderPayload) {
    state.lastSpectrum = null;
    state.lastModesDetected = [];
    state.lastModeCards = [];
    state.lastOverlay = null;
    return;
  }

  state.lastSpectrum = {
    freqs: cloneResonanceNotebookConnectDraftValue(renderPayload.freqs),
    mags: cloneResonanceNotebookConnectDraftValue(renderPayload.mags),
    dbs: cloneResonanceNotebookConnectDraftValue(renderPayload.mags),
  };
  state.lastModesDetected = cloneResonanceNotebookConnectDraftValue(renderPayload.modes) || [];
  state.lastModeCards = cloneResonanceNotebookConnectDraftValue(renderPayload.cards) || [];
  state.lastOverlay = cloneResonanceNotebookConnectDraftValue(renderPayload.overlay);
}
