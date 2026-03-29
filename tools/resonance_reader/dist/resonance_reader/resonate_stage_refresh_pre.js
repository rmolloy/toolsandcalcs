import { resonanceFftWindowResolve, resonanceTapAveragingEnabled } from "./resonate_debug_flags.js";
export async function stageRefreshPreRun(args) {
    const engine = args.fftFactory({});
    const taps = args.signal.detectTaps(args.wave, args.sampleRate);
    const directSpectrum = await engine.magnitude(args.wave, args.sampleRate, { maxFreq: args.fftMaxHz, window: resonanceFftWindowResolve() });
    let spectrum = directSpectrum;
    if (tapAveragingAllowedForRefresh(args.allowTapAveraging) && taps.length && resonanceTapAveragingEnabled()) {
        const averaged = await args.signal.averageTapSpectra(args.wave, args.sampleRate, taps, engine);
        if (averaged?.freqs?.length) {
            spectrum = { freqs: averaged.freqs, mags: averaged.mags, dbs: averaged.dbs };
        }
    }
    return { directSpectrum, spectrum, taps };
}
function tapAveragingAllowedForRefresh(allowTapAveraging) {
    return allowTapAveraging !== false;
}
