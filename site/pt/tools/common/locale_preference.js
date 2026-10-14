(function attachToolLocalePreference(globalScope) {
  const LOCALE_PREFERENCE_KEY = "tonelab.locale.v1";
  const LEGACY_LOCALE_PREFERENCE_KEY = "tonelab.locale";

  function localePreferenceCreate(storage) {
    return Object.freeze({
      read: (availableLocaleTags) => localePreferenceRead(storage, availableLocaleTags),
      write: (localeTag) => localePreferenceWrite(storage, localeTag),
    });
  }

  function localePreferenceRead(storage, availableLocaleTags) {
    const storedLocale = storageValueRead(storage, LOCALE_PREFERENCE_KEY);
    if (storedLocale) {
      return localePreferenceValueValidate(
        storage,
        LOCALE_PREFERENCE_KEY,
        storedLocale,
        availableLocaleTags,
      );
    }
    return legacyLocalePreferenceMigrate(storage, availableLocaleTags);
  }

  function localePreferenceWrite(storage, localeTag) {
    const written = storageValueWrite(storage, LOCALE_PREFERENCE_KEY, localeTag);
    if (written) storageValueRemove(storage, LEGACY_LOCALE_PREFERENCE_KEY);
    return written;
  }

  function legacyLocalePreferenceMigrate(storage, availableLocaleTags) {
    const legacyLocale = storageValueRead(storage, LEGACY_LOCALE_PREFERENCE_KEY);
    if (!legacyLocale) return null;
    const validLocale = localePreferenceValueValidate(
      storage,
      LEGACY_LOCALE_PREFERENCE_KEY,
      legacyLocale,
      availableLocaleTags,
    );
    if (validLocale) localePreferenceWrite(storage, validLocale);
    return validLocale;
  }

  function localePreferenceValueValidate(storage, storageKey, localeTag, availableLocaleTags) {
    if (availableLocaleTags.includes(localeTag)) return localeTag;
    storageValueRemove(storage, storageKey);
    return null;
  }

  function storageValueWrite(storage, storageKey, value) {
    try {
      storage?.setItem(storageKey, value);
      return true;
    } catch {
      return false;
    }
  }

  function storageValueRead(storage, storageKey) {
    try {
      return storage?.getItem(storageKey) || null;
    } catch {
      return null;
    }
  }

  function storageValueRemove(storage, storageKey) {
    try {
      storage?.removeItem(storageKey);
    } catch {
      return;
    }
  }

  const api = Object.freeze({ localePreferenceCreate });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.ToolLocalePreference = api;
})(typeof window !== "undefined" ? window : globalThis);
