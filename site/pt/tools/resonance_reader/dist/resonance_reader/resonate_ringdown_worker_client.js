import { RINGDOWN_WORKER_SOURCE } from "./resonate_ringdown_worker_source.mjs?rev=093b6a20873d";
export const MAX_CACHED_WORKER_FITS = 128;
export function createRingdownWorkerClient(options) {
    const client = new RingdownWorkerClient(options);
    return {
        readOrQueue: client.readOrQueue.bind(client),
        setContext: client.setContext.bind(client),
        dispose: client.dispose.bind(client),
    };
}
class RingdownWorkerClient {
    constructor(options) {
        this.options = options;
        this.caches = new WeakMap();
        this.activeResults = new Map();
        this.queue = new Map();
        this.context = "";
        this.nextId = 1;
        this.disposed = false;
    }
    readOrQueue(audio, sampleRate, key, input) {
        if (this.disposed)
            return { status: "failed", error: "Ring-down worker is closed" };
        this.selectDataset(audio, sampleRate);
        const cacheKey = JSON.stringify([sampleRate, key, input]);
        const cached = this.readCompletedFit(cacheKey);
        if (cached)
            return cached;
        if (this.failure)
            return { status: "failed", error: this.failure };
        this.enqueueCurrentJob(key, cacheKey, input);
        this.sendNextJob();
        return this.failure ? { status: "failed", error: this.failure } : { status: "pending" };
    }
    setContext(context) {
        if (this.context === context)
            return;
        this.context = context;
        this.activeResults.clear();
        this.queue.clear();
    }
    dispose() {
        this.disposed = true;
        this.stopWorker();
        this.activeResults.clear();
        this.dataset = undefined;
    }
    selectDataset(audio, sampleRate) {
        if (this.dataset?.audio === audio && this.dataset.sampleRate === sampleRate)
            return;
        this.stopWorker();
        this.activeResults.clear();
        const results = this.caches.get(audio) || new Map();
        this.caches.set(audio, results);
        this.dataset = { id: this.nextId++, audio, sampleRate, results };
        this.failure = undefined;
    }
    readCompletedFit(cacheKey) {
        const cached = this.activeResults.get(cacheKey) || this.dataset.results.get(cacheKey);
        if (cached)
            this.retainCompletedFit(cacheKey, cached, true);
        return cached;
    }
    enqueueCurrentJob(key, cacheKey, input) {
        if (this.inFlight?.cacheKey === cacheKey) {
            this.inFlight.context = this.context;
            return;
        }
        if (this.queue.has(cacheKey))
            return;
        this.queue.set(cacheKey, { id: this.nextId++, key, cacheKey, input: structuredClone(input), context: this.context });
    }
    sendNextJob() {
        if (this.inFlight || !this.queue.size || this.failure || this.disposed)
            return;
        try {
            this.sendFirstQueuedJob(this.ensureWorker());
        }
        catch (error) {
            this.failWorker(error instanceof Error ? error.message : String(error));
        }
    }
    sendFirstQueuedJob(worker) {
        const job = this.queue.values().next().value;
        this.queue.delete(job.cacheKey);
        this.inFlight = job;
        this.timeout = setTimeout(() => this.failWorker("Ring-down worker timed out"), this.options.timeoutMs ?? 60000);
        worker.postMessage({ type: "fit", datasetId: this.dataset.id, id: job.id, key: job.key, input: job.input });
    }
    ensureWorker() {
        if (this.worker)
            return this.worker;
        const worker = (this.options.createWorker || createBlobRingdownWorker)();
        this.worker = worker;
        worker.addEventListener("message", (event) => this.receiveResult(worker, event.data));
        worker.addEventListener("error", (event) => this.receiveFailure(worker, event.message));
        worker.addEventListener("messageerror", () => this.receiveFailure(worker, "Ring-down worker response could not be read"));
        worker.postMessage({ type: "dataset", datasetId: this.dataset.id, wave: this.dataset.audio, sampleRate: this.dataset.sampleRate });
        return worker;
    }
    receiveResult(worker, response) {
        if (worker !== this.worker || response.datasetId !== this.dataset?.id || response.id !== this.inFlight?.id || response.type !== "result")
            return;
        const job = this.inFlight;
        clearTimeout(this.timeout);
        this.inFlight = undefined;
        this.retainCompletedFit(job.cacheKey, response.error ? { status: "failed", error: response.error } : { status: "ready", result: response.result }, job.context === this.context);
        if (job.context === this.context)
            this.options.onResult(job.key);
        this.sendNextJob();
    }
    retainCompletedFit(cacheKey, result, active) {
        if (active)
            this.activeResults.set(cacheKey, result);
        const results = this.dataset.results;
        results.delete(cacheKey);
        if (results.size >= MAX_CACHED_WORKER_FITS)
            results.delete(results.keys().next().value);
        results.set(cacheKey, result);
    }
    receiveFailure(worker, message) {
        if (worker === this.worker)
            this.failWorker(message || "Ring-down worker failed");
    }
    failWorker(message) {
        const key = this.inFlight?.key || this.queue.values().next().value?.key || "";
        const datasetId = this.dataset?.id;
        this.failure = message;
        this.stopWorker();
        queueMicrotask(() => { if (!this.disposed && this.dataset?.id === datasetId)
            this.options.onResult(key); });
    }
    stopWorker() {
        clearTimeout(this.timeout);
        this.worker?.terminate();
        this.worker = undefined;
        this.inFlight = undefined;
        this.queue.clear();
    }
}
function createBlobRingdownWorker() {
    const url = URL.createObjectURL(new Blob([RINGDOWN_WORKER_SOURCE], { type: "application/javascript" }));
    try {
        return retainBlobWorkerUntilTermination(new Worker(url), url);
    }
    catch (error) {
        URL.revokeObjectURL(url);
        throw error;
    }
}
function retainBlobWorkerUntilTermination(worker, url) {
    return {
        postMessage: (request) => worker.postMessage(request),
        addEventListener: (type, listener) => worker.addEventListener(type, listener),
        terminate: () => { worker.terminate(); URL.revokeObjectURL(url); },
    };
}
