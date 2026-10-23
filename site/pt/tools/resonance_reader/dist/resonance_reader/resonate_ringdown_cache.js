export const MAX_CACHED_RINGDOWN_FITS = 128;
const audioCaches = new WeakMap();
export function reuseRingdownFit(audio, context, key, calculate) {
    const results = ringdownResultsForContext(audio, context);
    if (results.has(key))
        return results.get(key);
    return retainRingdownFit(results, key, calculate());
}
function ringdownResultsForContext(audio, context) {
    const cached = audioCaches.get(audio);
    if (cached && ringdownContextMatches(cached.context, context))
        return cached.results;
    return introduceRingdownContext(audio, context);
}
function ringdownContextMatches(previous, current) {
    return previous.length === current.length && previous.every((value, index) => Object.is(value, current[index]));
}
function introduceRingdownContext(audio, context) {
    const results = new Map();
    audioCaches.set(audio, { context: [...context], results });
    return results;
}
function retainRingdownFit(results, key, result) {
    if (results.size >= MAX_CACHED_RINGDOWN_FITS)
        results.delete(results.keys().next().value);
    results.set(key, result);
    return result;
}
