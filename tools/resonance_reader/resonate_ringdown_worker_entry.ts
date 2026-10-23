import "../modal_frequency_shared/modal_analysis/ringdown.js";
import { calculateRingdownFromJob, type RingdownWorkerMath } from "./resonate_ringdown_worker_calculation.js";
import type { RingdownWorkerRequest, RingdownWorkerResponse } from "./resonate_ringdown_worker_protocol.js";

type RingdownDataset = Extract<RingdownWorkerRequest, { type: "dataset" }>;
type RingdownJob = Extract<RingdownWorkerRequest, { type: "fit" }>;

export function createRingdownWorkerRequestHandler(math: RingdownWorkerMath, send: (response: RingdownWorkerResponse) => void) {
  let dataset: RingdownDataset | undefined;
  return (request: RingdownWorkerRequest) => {
    if (request.type === "dataset") { dataset = request; return; }
    send(calculateRingdownWorkerResponse(dataset, request, math));
  };
}

function calculateRingdownWorkerResponse(dataset: RingdownDataset | undefined, job: RingdownJob, math: RingdownWorkerMath): RingdownWorkerResponse {
  const response = { type: "result" as const, datasetId: job.datasetId, id: job.id, key: job.key };
  try {
    if (!dataset || dataset.datasetId !== job.datasetId) throw new Error("Ring-down dataset is unavailable");
    return { ...response, result: calculateRingdownFromJob(dataset.wave, dataset.sampleRate, job.input, math) };
  } catch (error) {
    return { ...response, result: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function startRingdownWorker(scope: typeof globalThis & { ModalRingdown?: RingdownWorkerMath }) {
  const receive = createRingdownWorkerRequestHandler(scope.ModalRingdown!, (response) => scope.postMessage(response));
  scope.addEventListener("message", (event: MessageEvent<RingdownWorkerRequest>) => receive(event.data));
}

if (typeof globalThis.postMessage === "function" && typeof globalThis.addEventListener === "function" && !("document" in globalThis)) {
  startRingdownWorker(globalThis);
}
