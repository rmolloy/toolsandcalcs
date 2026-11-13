import { createSetupSessionSnapshot, readSetupSessionSnapshot } from './setup_session_snapshot.mjs?rev=d1d4f852375a';

export function createSetupSessionPersistence(runtime, capture) {
  const session = runtime.PerTabToolSession?.perTabToolSessionCreate({ toolId: 'guitar_setup_calculator', version: 1 });
  const persist = () => session?.write(createSetupSessionSnapshot(capture()));
  return {
    read: () => readSetupSessionSnapshot(session?.read()),
    attach() {
      if (!session) return;
      runtime.ToolLocaleNavigation = { prepare: persist };
      runtime.addEventListener('pagehide', persist);
      ['input', 'change', 'click', 'toggle'].forEach((type) => {
        runtime.document.addEventListener(type, () => queueMicrotask(persist), true);
      });
    },
  };
}
