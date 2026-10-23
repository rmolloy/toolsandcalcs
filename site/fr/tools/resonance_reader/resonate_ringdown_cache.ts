type RingdownCache = { context: readonly unknown[]; results: Map<string, unknown> };

export const MAX_CACHED_RINGDOWN_FITS = 128;
const audioCaches = new WeakMap<object, RingdownCache>();

export function reuseRingdownFit<Result>(audio: object, context: readonly unknown[], key: string, calculate: () => Result): Result {
  const results = ringdownResultsForContext(audio, context);
  if (results.has(key)) return results.get(key) as Result;
  return retainRingdownFit(results, key, calculate());
}

function ringdownResultsForContext(audio: object, context: readonly unknown[]): Map<string, unknown> {
  const cached = audioCaches.get(audio);
  if (cached && ringdownContextMatches(cached.context, context)) return cached.results;
  return introduceRingdownContext(audio, context);
}

function ringdownContextMatches(previous: readonly unknown[], current: readonly unknown[]): boolean {
  return previous.length === current.length && previous.every((value, index) => Object.is(value, current[index]));
}

function introduceRingdownContext(audio: object, context: readonly unknown[]): Map<string, unknown> {
  const results = new Map<string, unknown>();
  audioCaches.set(audio, { context: [...context], results });
  return results;
}

function retainRingdownFit<Result>(results: Map<string, unknown>, key: string, result: Result): Result {
  if (results.size >= MAX_CACHED_RINGDOWN_FITS) results.delete(results.keys().next().value!);
  results.set(key, result);
  return result;
}
