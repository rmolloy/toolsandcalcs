import "../modal_frequency_shared/modal_analysis/ringdown.js?rev=bd81c33a8408";
import { calculateRingdownFromJob } from "./resonate_ringdown_worker_calculation.js?rev=bd81c33a8408";
export function createRingdownWorkerRequestHandler(math, send) {
    let dataset;
    return (request) => {
        if (request.type === "dataset") {
            dataset = request;
            return;
        }
        send(calculateRingdownWorkerResponse(dataset, request, math));
    };
}
function calculateRingdownWorkerResponse(dataset, job, math) {
    const response = { type: "result", datasetId: job.datasetId, id: job.id, key: job.key };
    try {
        if (!dataset || dataset.datasetId !== job.datasetId)
            throw new Error("Ring-down dataset is unavailable");
        return { ...response, result: calculateRingdownFromJob(dataset.wave, dataset.sampleRate, job.input, math) };
    }
    catch (error) {
        return { ...response, result: null, error: error instanceof Error ? error.message : String(error) };
    }
}
function startRingdownWorker(scope) {
    const receive = createRingdownWorkerRequestHandler(scope.ModalRingdown, (response) => scope.postMessage(response));
    scope.addEventListener("message", (event) => receive(event.data));
}
if (typeof globalThis.postMessage === "function" && typeof globalThis.addEventListener === "function" && !("document" in globalThis)) {
    startRingdownWorker(globalThis);
}
