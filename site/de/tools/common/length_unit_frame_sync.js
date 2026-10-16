(function defineLengthUnitFrameSync(runtime) {
  const UNIT_PARAMETER = 'tl-length-unit';
  function createLengthUnitFrameSync(navigation, controller) {
    if (!controller) return null;
    return new LengthUnitFrameSync(navigation, controller);
  }

  class LengthUnitFrameSync {
    constructor(navigation, controller) {
      Object.assign(this, { navigation, controller, lastUnit: controller.read(), receiving: false });
    }

    attach() {
      this.refreshRootHistory();
      this.controller.subscribe(({ unit }) => this.localUnitChanged(unit));
    }

    localUnitChanged(unit) {
      if (unit === this.lastUnit) return;
      this.lastUnit = unit;
      this.refreshRootHistory();
      if (this.receiving) return;
      this.publishCurrentUnit();
    }

    publishCurrentUnit() {
      if (this.navigation.parentState) return this.navigation.parentSend(this.currentUnitMessage());
      this.broadcastCurrentUnit();
    }

    broadcastCurrentUnit() {
      for (const entry of this.navigation.frames.values()) this.sendCurrentToFrame(entry);
    }

    sendCurrentToFrame(entry) {
      this.navigation.frameSend(entry, this.currentUnitMessage());
    }

    currentUnitMessage() {
      return { type: 'length-unit', unit: this.controller.read() };
    }

    receiveFromParent(unit) {
      if (!isLengthUnit(unit)) return;
      this.applyReceivedUnit(unit);
    }

    receiveFromFrame(entry, unit) {
      if (!isLengthUnit(unit)) return;
      if (!this.applyReceivedUnit(unit)) return this.sendCurrentToFrame(entry);
      this.broadcastCurrentUnit();
    }

    applyReceivedUnit(unit) {
      if (unit === this.controller.read()) return true;
      this.receiving = true;
      try { return this.controller.select(unit); }
      finally { this.receiving = false; }
    }

    refreshRootHistory() {
      if (this.navigation.parentState || this.navigation.runtime?.location.protocol !== 'file:') return;
      const unit = this.controller.read();
      this.navigation.rootHref = hrefWithUnit(this.navigation.rootHref, unit);
      refreshHistoryUrl(this.navigation.runtime, rootHistoryState(this.navigation), unit);
    }
  }

  function isLengthUnit(unit) {
    return unit === 'mm' || unit === 'in';
  }

  function hrefWithUnit(href, unit) {
    const url = new URL(href);
    url.searchParams.set(UNIT_PARAMETER, unit);
    return url.href;
  }

  function rootHistoryState(navigation) {
    const state = navigation.runtime.history.state;
    const href = state?.toolFullscreenHref || navigation.historyHrefRead();
    if (!href || href === navigation.rootHref) return state;
    if (hrefWithoutUnit(href) !== hrefWithoutUnit(navigation.rootHref)) return state;
    return { ...state, toolFullscreenHref: navigation.rootHref };
  }

  function hrefWithoutUnit(href) {
    try {
      const url = new URL(href);
      url.searchParams.delete(UNIT_PARAMETER);
      return url.href;
    } catch { return null; }
  }

  function refreshHistoryUrl(runtime, state, unit) {
    const href = hrefWithUnit(runtime.location.href, unit);
    try { runtime.history.replaceState(state, '', href); }
    catch { return; }
  }

  const api = Object.freeze({ createLengthUnitFrameSync });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  runtime.ToolLengthUnitFrameSync = api;
})(typeof window !== 'undefined' ? window : globalThis);
