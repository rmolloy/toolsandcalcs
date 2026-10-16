import { resonancePerTabSessionCreate } from "./resonate_per_tab_session.js?rev=ad8911223a7b";
export function perTabSessionPersist(deps) {
    return perTabSessionResolve(deps)?.persistFromState(deps.state).catch((error) => {
        console.warn("[Resonance Reader] Per-tab restoration save failed", error);
    }) || Promise.resolve();
}
export function perTabSessionResolve(deps) {
    return deps.perTabSession || resonancePerTabSessionCreate();
}
export function perTabSessionLifecyclePersistenceAttach(deps) {
    window.addEventListener("pagehide", () => {
        void perTabSessionPersist(deps);
    });
}
export function perTabSessionPersistenceExpose(deps) {
    const persist = () => perTabSessionPersist(deps);
    window.ResonatePerTabState = {
        persist,
    };
    window.ToolLocaleNavigation = {
        prepare: persist,
    };
}
