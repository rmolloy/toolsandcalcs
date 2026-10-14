import { resonancePerTabSessionCreate } from "./resonate_per_tab_session.js";
import type { UiBindingsDeps } from "./resonate_ui_bindings_contract.js";

export function perTabSessionPersist(deps: UiBindingsDeps): Promise<void> {
  return perTabSessionResolve(deps)?.persistFromState(deps.state).catch((error) => {
    console.warn("[Resonance Reader] Per-tab restoration save failed", error);
  }) || Promise.resolve();
}

export function perTabSessionResolve(deps: UiBindingsDeps) {
  return deps.perTabSession || resonancePerTabSessionCreate();
}

export function perTabSessionLifecyclePersistenceAttach(deps: UiBindingsDeps) {
  window.addEventListener("pagehide", () => {
    void perTabSessionPersist(deps);
  });
}

export function perTabSessionPersistenceExpose(deps: UiBindingsDeps) {
  const persist = () => perTabSessionPersist(deps);
  (window as any).ResonatePerTabState = {
    persist,
  };
  (window as any).ToolLocaleNavigation = {
    prepare: persist,
  };
}
