(function attachToolLocaleSelector(globalScope) {
  function localeSelectorMount({ document, preference, navigate, prepareNavigation }) {
    const config = localeSelectorConfigRead(document);
    if (!config || config.locales.length < 2) return null;
    return localeSelectorBuild({ document, config, preference, navigate, prepareNavigation });
  }

  function localeSelectorConfigRead(document) {
    const configElement = document.getElementById("tool_locale_config");
    if (!configElement) return null;
    return JSON.parse(configElement.textContent || "null");
  }

  function localeSelectorBuild({ document, config, preference, navigate, prepareNavigation }) {
    const select = localeSelectBuild(document, config);
    const label = localeLabelBuild(document, config.label, select);
    localeSelectionBind({ select, preference, navigate, prepareNavigation });
    localePreferenceValidate(preference, config.locales);
    localeSelectorPlace(document, label);
    return select;
  }

  function localeSelectBuild(document, config) {
    const select = document.createElement("select");
    select.id = "tool_locale_selector";
    select.setAttribute("aria-label", config.label);
    config.locales.forEach((locale) => select.appendChild(localeOptionBuild(document, locale)));
    localeCurrentOptionSelect(select, config.currentLocale);
    return select;
  }

  function localeCurrentOptionSelect(select, currentLocale) {
    const currentOption = [...select.options].find((option) => option.dataset.locale === currentLocale);
    if (currentOption) select.value = currentOption.value;
  }

  function localeOptionBuild(document, locale) {
    const option = document.createElement("option");
    option.value = locale.href;
    option.dataset.locale = locale.tag;
    option.textContent = locale.nativeName;
    return option;
  }

  function localeLabelBuild(document, labelText, select) {
    const label = document.createElement("label");
    label.className = "tool-locale-selector";
    label.title = labelText;
    label.appendChild(select);
    return label;
  }

  function localeSelectionBind({ select, preference, navigate, prepareNavigation }) {
    select.addEventListener("change", () => {
      const selectedOption = [...select.options].find((option) => option.value === select.value);
      if (!selectedOption) return;
      preference.write(selectedOption.dataset.locale);
      localeNavigationRun(selectedOption.value, navigate, prepareNavigation);
    });
  }

  function localeNavigationRun(href, navigate, prepareNavigation) {
    const preparation = prepareNavigation?.();
    if (!preparation || typeof preparation.then !== "function") {
      navigate(href);
      return;
    }
    Promise.resolve(preparation).catch(() => undefined).then(() => navigate(href));
  }

  function localePreferenceValidate(preference, locales) {
    preference.read(locales.map(({ tag }) => tag));
  }

  function localeSelectorPlace(document, label) {
    const actions = document.querySelector(".hero-actions, .fit-actions");
    if (!actions) return;
    actions.insertBefore(label, actions.querySelector(".hero-help-link, #btn_fullscreen"));
  }

  function localeSelectorAttach() {
    const preferenceApi = globalScope.ToolLocalePreference;
    if (!preferenceApi) return;
    localeSelectorMount({
      document: globalScope.document,
      preference: preferenceApi.localePreferenceCreate(localeStorageRead()),
      navigate: localeDestinationNavigate,
      prepareNavigation: () => globalScope.ToolLocaleNavigation?.prepare?.(),
    });
  }

  function localeStorageRead() {
    try { return globalScope.localStorage; }
    catch { return null; }
  }

  function localeDestinationNavigate(href) {
    const destination = globalScope.ToolLengthUnitNavigation?.destinationHref(href) || href;
    globalScope.location.assign(destination);
  }

  const api = Object.freeze({ localeSelectorConfigRead, localeSelectorMount });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.ToolLocaleSelector = api;

  if (!globalScope.document) return;
  if (globalScope.document.readyState === "loading") {
    globalScope.document.addEventListener("DOMContentLoaded", localeSelectorAttach);
    return;
  }
  localeSelectorAttach();
})(typeof window !== "undefined" ? window : globalThis);
