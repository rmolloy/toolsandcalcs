import { RINGDOWN_WORKER_SOURCE } from "./resonate_ringdown_worker_source.mjs";
import type { RingdownFitInput, RingdownReadResult, RingdownWorkerRequest, RingdownWorkerResponse } from "./resonate_ringdown_worker_protocol.js";

export const MAX_CACHED_WORKER_FITS = 128;
export type RingdownWorkerPort = {
  postMessage: (request: RingdownWorkerRequest) => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
  terminate: () => void;
};
type CompletedFit = Exclude<RingdownReadResult, { status: "pending" }>;
type WorkerJob = { id: number; key: string; cacheKey: string; context: string; input: RingdownFitInput };
type WorkerDataset = { id: number; audio: ArrayLike<number> & object; sampleRate: number; results: Map<string, CompletedFit> };
type WorkerClientOptions = { onResult: (key: string) => void; createWorker?: () => RingdownWorkerPort; timeoutMs?: number };

export function createRingdownWorkerClient(options: WorkerClientOptions) {
  const client = new RingdownWorkerClient(options);
  return {
    readOrQueue: client.readOrQueue.bind(client),
    setContext: client.setContext.bind(client),
    dispose: client.dispose.bind(client),
  };
}

class RingdownWorkerClient {
  private readonly caches = new WeakMap<object, Map<string, CompletedFit>>();
  private readonly activeResults = new Map<string, CompletedFit>();
  private readonly queue = new Map<string, WorkerJob>();
  private dataset?: WorkerDataset;
  private worker?: RingdownWorkerPort;
  private inFlight?: WorkerJob;
  private timeout?: ReturnType<typeof setTimeout>;
  private failure?: string;
  private context = "";
  private nextId = 1;
  private disposed = false;

  constructor(private readonly options: WorkerClientOptions) {}

  readOrQueue(audio: ArrayLike<number> & object, sampleRate: number, key: string, input: RingdownFitInput): RingdownReadResult {
    if (this.disposed) return { status: "failed", error: "Ring-down worker is closed" };
    this.selectDataset(audio, sampleRate);
    const cacheKey = JSON.stringify([sampleRate, key, input]);
    const cached = this.readCompletedFit(cacheKey);
    if (cached) return cached;
    if (this.failure) return { status: "failed", error: this.failure };
    this.enqueueCurrentJob(key, cacheKey, input);
    this.sendNextJob();
    return this.failure ? { status: "failed", error: this.failure } : { status: "pending" };
  }

  setContext(context: string): void {
    if (this.context === context) return;
    this.context = context;
    this.activeResults.clear();
    this.queue.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.stopWorker();
    this.activeResults.clear();
    this.dataset = undefined;
  }

  private selectDataset(audio: ArrayLike<number> & object, sampleRate: number): void {
    if (this.dataset?.audio === audio && this.dataset.sampleRate === sampleRate) return;
    this.stopWorker();
    this.activeResults.clear();
    const results = this.caches.get(audio) || new Map<string, CompletedFit>();
    this.caches.set(audio, results);
    this.dataset = { id: this.nextId++, audio, sampleRate, results };
    this.failure = undefined;
  }

  private readCompletedFit(cacheKey: string): CompletedFit | undefined {
    const cached = this.activeResults.get(cacheKey) || this.dataset!.results.get(cacheKey);
    if (cached) this.retainCompletedFit(cacheKey, cached, true);
    return cached;
  }

  private enqueueCurrentJob(key: string, cacheKey: string, input: RingdownFitInput): void {
    if (this.inFlight?.cacheKey === cacheKey) { this.inFlight.context = this.context; return; }
    if (this.queue.has(cacheKey)) return;
    this.queue.set(cacheKey, { id: this.nextId++, key, cacheKey, input: structuredClone(input), context: this.context });
  }

  private sendNextJob(): void {
    if (this.inFlight || !this.queue.size || this.failure || this.disposed) return;
    try { this.sendFirstQueuedJob(this.ensureWorker()); }
    catch (error) { this.failWorker(error instanceof Error ? error.message : String(error)); }
  }

  private sendFirstQueuedJob(worker: RingdownWorkerPort): void {
    const job = this.queue.values().next().value!;
    this.queue.delete(job.cacheKey);
    this.inFlight = job;
    this.timeout = setTimeout(() => this.failWorker("Ring-down worker timed out"), this.options.timeoutMs ?? 60_000);
    worker.postMessage({ type: "fit", datasetId: this.dataset!.id, id: job.id, key: job.key, input: job.input });
  }

  private ensureWorker(): RingdownWorkerPort {
    if (this.worker) return this.worker;
    const worker = (this.options.createWorker || createBlobRingdownWorker)();
    this.worker = worker;
    worker.addEventListener("message", (event: MessageEvent<RingdownWorkerResponse>) => this.receiveResult(worker, event.data));
    worker.addEventListener("error", (event: ErrorEvent) => this.receiveFailure(worker, event.message));
    worker.addEventListener("messageerror", () => this.receiveFailure(worker, "Ring-down worker response could not be read"));
    worker.postMessage({ type: "dataset", datasetId: this.dataset!.id, wave: this.dataset!.audio, sampleRate: this.dataset!.sampleRate });
    return worker;
  }

  private receiveResult(worker: RingdownWorkerPort, response: RingdownWorkerResponse): void {
    if (worker !== this.worker || response.datasetId !== this.dataset?.id || response.id !== this.inFlight?.id || response.type !== "result") return;
    const job = this.inFlight!;
    clearTimeout(this.timeout);
    this.inFlight = undefined;
    this.retainCompletedFit(job.cacheKey, response.error ? { status: "failed", error: response.error } : { status: "ready", result: response.result }, job.context === this.context);
    if (job.context === this.context) this.options.onResult(job.key);
    this.sendNextJob();
  }

  private retainCompletedFit(cacheKey: string, result: CompletedFit, active: boolean): void {
    if (active) this.activeResults.set(cacheKey, result);
    const results = this.dataset!.results;
    results.delete(cacheKey);
    if (results.size >= MAX_CACHED_WORKER_FITS) results.delete(results.keys().next().value!);
    results.set(cacheKey, result);
  }

  private receiveFailure(worker: RingdownWorkerPort, message: string): void {
    if (worker === this.worker) this.failWorker(message || "Ring-down worker failed");
  }

  private failWorker(message: string): void {
    const key = this.inFlight?.key || this.queue.values().next().value?.key || "";
    const datasetId = this.dataset?.id;
    this.failure = message;
    this.stopWorker();
    queueMicrotask(() => { if (!this.disposed && this.dataset?.id === datasetId) this.options.onResult(key); });
  }

  private stopWorker(): void {
    clearTimeout(this.timeout);
    this.worker?.terminate();
    this.worker = undefined;
    this.inFlight = undefined;
    this.queue.clear();
  }
}

function createBlobRingdownWorker(): RingdownWorkerPort {
  const url = URL.createObjectURL(new Blob([RINGDOWN_WORKER_SOURCE], { type: "application/javascript" }));
  try { return retainBlobWorkerUntilTermination(new Worker(url), url); }
  catch (error) { URL.revokeObjectURL(url); throw error; }
}

function retainBlobWorkerUntilTermination(worker: Worker, url: string): RingdownWorkerPort {
  return {
    postMessage: (request) => worker.postMessage(request),
    addEventListener: (type, listener) => worker.addEventListener(type, listener),
    terminate: () => { worker.terminate(); URL.revokeObjectURL(url); },
  };
}
