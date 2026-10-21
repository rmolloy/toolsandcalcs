export function createSetupProfileSelection({
  hasUserEntries, confirmReplacement, restoreSelection, selectProfile,
}) {
  function request(profileId) {
    if (replacementCancelled()) return restoreSelection();
    selectProfile(profileId);
  }

  function replacementCancelled() {
    return hasUserEntries() && !confirmReplacement();
  }

  return { request };
}
