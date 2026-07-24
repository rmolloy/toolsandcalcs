const SESSION_TOOL_ID = "resonance_reader";
const SESSION_VERSION = 1;
const DATABASE_NAME = "tonelab.resonance-reader.per-tab";
const STORE_NAME = "snapshots";
const DATABASE_VERSION = 2;
const STATE_KEYS = [
    "currentWave",
    "lastSpectrum",
    "lastSpectrumRaw",
    "lastSpectrumNoteSelection",
    "lastOverlay",
    "lastModesDetected",
    "lastModeCards",
    "lastPolymaxCandidates",
    "lastWaveSlice",
    "lastPeakHoldSpectrum",
    "viewRangeMs",
    "noteSelectionRangeMs",
    "peakAnalysisSelectedTapIndex",
    "peakAnalysisSelectedKey",
    "takeOverlays",
    "recordingLabel",
    "measureMode",
    "customMeasurements",
    "plateMaterialMeasurements",
    "modeOverrides",
];
export function resonancePerTabSessionCreate() {
    const pointerSession = resonancePerTabPointerSessionRead();
    const snapshotId = resonancePerTabSnapshotIdResolve(pointerSession);
    if (!pointerSession || !snapshotId || !resonancePerTabDatabaseAvailable()) {
        return null;
    }
    return {
        async restoreIntoState(state) {
            const snapshot = await resonancePerTabSnapshotRead(snapshotId);
            if (!snapshot)
                return false;
            resonancePerTabSnapshotApplyToState(state, snapshot);
            return true;
        },
        async persistFromState(state) {
            await resonancePerTabSnapshotWrite(snapshotId, resonancePerTabSnapshotBuild(state));
        },
    };
}
function resonancePerTabPointerSessionRead() {
    const api = window.PerTabToolSession;
    if (!api?.perTabToolSessionCreate) {
        return null;
    }
    return api.perTabToolSessionCreate({ toolId: SESSION_TOOL_ID, version: SESSION_VERSION });
}
function resonancePerTabSnapshotIdResolve(pointerSession) {
    const existing = String(pointerSession.read()?.snapshotId || "").trim();
    if (existing)
        return existing;
    const snapshotId = resonancePerTabSnapshotIdBuild();
    return pointerSession.write({ snapshotId }) ? snapshotId : null;
}
function resonancePerTabSnapshotIdBuild() {
    const randomUuid = window.crypto?.randomUUID?.();
    if (randomUuid)
        return randomUuid;
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function resonancePerTabDatabaseAvailable() {
    return typeof window.indexedDB !== "undefined";
}
function resonancePerTabSnapshotBuild(state) {
    return Object.fromEntries(STATE_KEYS.map((key) => [key, state[key]]));
}
function resonancePerTabSnapshotApplyToState(state, snapshot) {
    STATE_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
            state[key] = snapshot[key];
        }
    });
}
async function resonancePerTabSnapshotRead(snapshotId) {
    const database = await resonancePerTabDatabaseOpen();
    const stored = await resonancePerTabRequestRead(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(snapshotId));
    database.close();
    return stored?.version === SESSION_VERSION && stored.state ? stored.state : null;
}
async function resonancePerTabSnapshotWrite(snapshotId, state) {
    const database = await resonancePerTabDatabaseOpen();
    await resonancePerTabRequestRead(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({ version: SESSION_VERSION, state }, snapshotId));
    database.close();
}
function resonancePerTabDatabaseOpen() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Unable to open Resonance Reader per-tab storage."));
    });
}
function resonancePerTabRequestRead(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Unable to read Resonance Reader per-tab storage."));
    });
}
