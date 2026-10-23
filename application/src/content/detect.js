/**
 * PinFlow — DOM video detection (YouTube).
 *
 * Part of **Nova**, PinFlow's internal Picture-in-Picture engine.
 *
 * Runs only on supported pages. Kept in its own file so both the persistent
 * content script and the gesture-attributed PiP payload use one detection
 * implementation and always agree on which video is "the" video.
 */
(function (root) {
  'use strict';

  const L = root.PinFlowLogic;
  if (!L) return;
  if (root.PinFlowDetect) return;

  /** YouTube main player detection; PRD 13 asks to prioritise the real player. */
  const PLAYER_CONTAINER_SELECTORS = ['#movie_player', '.html5-video-player'];
  const AD_CONTAINER_SELECTORS = ['.ytp-ad-player-overlay', '.ytp-ad-module', '.video-ads', '#player-ads'];

  function matchesAny(el, selectors) {
    for (let i = 0; i < selectors.length; i += 1) {
      try {
        if (el.closest(selectors[i])) return true;
      } catch (_) {
        /* invalid selector in this environment: ignore */
      }
    }
    return false;
  }

  /** Visible means: connected, not display:none / visibility:hidden / opacity:0. */
  function isVisible(el) {
    if (!el) return false;
    if (el.isConnected === false) return false;
    let style = null;
    try {
      style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    } catch (_) {
      style = null;
    }
    if (style) {
      if (style.display === 'none') return false;
      if (style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      if (Number(style.opacity) === 0) return false;
    }
    return true;
  }

  function sizeOf(el) {
    let rect = null;
    try {
      rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
    } catch (_) {
      rect = null;
    }
    const width = Math.round((rect && rect.width) || el.clientWidth || 0);
    const height = Math.round((rect && rect.height) || el.clientHeight || 0);
    return { width, height };
  }

  function isMainPlayer(el) {
    if (el.classList && el.classList.contains('html5-main-video')) return true;
    return matchesAny(el, PLAYER_CONTAINER_SELECTORS);
  }

  function inAdContainer(el) {
    return matchesAny(el, AD_CONTAINER_SELECTORS);
  }

  function isDisabled(el) {
    return el.disablePictureInPicture === true || el.hasAttribute('disablePictureInPicture');
  }

  /** Build the plain descriptor object that the pure scorer consumes. */
  function describe(el, index) {
    const size = sizeOf(el);
    const visible = isVisible(el) && size.width >= L.MIN_SIDE && size.height >= L.MIN_SIDE;
    const mainPlayer = isMainPlayer(el);
    // Only ever skip *separate* ad media. On YouTube the ad shares the main
    // player element, so rejecting the main player would break normal playback.
    const adContainer = !mainPlayer && inAdContainer(el);
    return {
      index,
      isMainPlayer: mainPlayer,
      inAdContainer: adContainer,
      disabled: isDisabled(el),
      readyState: typeof el.readyState === 'number' ? el.readyState : 0,
      paused: el.paused === true,
      ended: el.ended === true,
      videoWidth: el.videoWidth || 0,
      videoHeight: el.videoHeight || 0,
      width: size.width,
      height: size.height,
      visible,
      hasSrc: !!(el.currentSrc || el.src)
    };
  }

  /** All <video> elements on the page with their descriptors. */
  function candidates() {
    let nodes = [];
    try {
      nodes = Array.prototype.slice.call(document.querySelectorAll('video'));
    } catch (_) {
      nodes = [];
    }
    return nodes.map((el, index) => ({ el, descriptor: describe(el, index) }));
  }

  function pipSupported() {
    if (document.pictureInPictureEnabled !== true) return false;
    return typeof HTMLVideoElement !== 'undefined' && 'requestPictureInPicture' in HTMLVideoElement.prototype;
  }

  function pipActiveElement() {
    const el = document.pictureInPictureElement;
    return el && el.tagName === 'VIDEO' ? el : null;
  }

  function pickElement(list, scorer) {
    const best = L.pickBestVideo(list.map((entry) => entry.descriptor), scorer);
    return best ? list[best.index].el : null;
  }

  /** The element PinFlow should act on: best usable video, else best visible one. */
  function findTarget() {
    const list = candidates();
    return pickElement(list, L.scoreVideo) || pickElement(list, L.scoreVideoLoose);
  }

  /** Full inspection result, including non-serialisable element references. */
  function inspect() {
    const list = candidates();
    const usable = L.pickBestVideo(list.map((entry) => entry.descriptor));
    const loose = L.pickBestVideo(list.map((entry) => entry.descriptor), L.scoreVideoLoose);
    const pipEl = pipActiveElement();
    const bestVisible = loose ? list[loose.index].descriptor : null;

    let reason = 'no-video';
    if (pipEl) reason = 'pinned';
    else if (usable) reason = 'ready';
    else if (bestVisible && bestVisible.disabled) reason = 'disabled';
    else if (bestVisible) reason = 'not-ready';

    return {
      // "found" means a plausible, visible video candidate exists. A page whose
      // only <video> elements are hidden must read as "no video" (PRD 13).
      found: !!bestVisible || !!usable,
      usable: !!usable,
      element: usable ? list[usable.index].el : null,
      descriptor: usable ? usable.descriptor : null,
      pipActive: !!pipEl,
      pipElement: pipEl,
      pipAvailable: pipSupported(),
      reason
    };
  }

  /** Serializable subset used in messages (PRD 19: keep messages small). */
  function state() {
    const info = inspect();
    return {
      found: info.found,
      usable: info.usable,
      pipActive: info.pipActive,
      pipAvailable: info.pipAvailable,
      reason: info.reason
    };
  }

  /**
   * Request Picture-in-Picture.
   *
   * IMPORTANT: requestPictureInPicture() is called synchronously from here so
   * that it runs inside the transient user-activation window created by the
   * gesture-attributed executeScript() call that loaded this payload.
   */
  function requestPip() {
    const info = inspect();

    if (info.pipActive) return { ok: true, alreadyPinned: true, state: state() };
    if (!info.pipAvailable) return { ok: false, error: L.ERRORS.PIP_UNAVAILABLE, state: state() };
    if (!info.found) return { ok: false, error: L.ERRORS.NO_VIDEO, state: state() };
    if (!info.usable || !info.element) {
      const error = info.reason === 'disabled' ? L.ERRORS.PIP_UNAVAILABLE : L.ERRORS.NOT_READY;
      return { ok: false, error, state: state() };
    }

    return { pending: info.element.requestPictureInPicture(), state: state() };
  }

  /** Leave Picture-in-Picture. No user activation required. */
  function exitPip() {
    if (!pipActiveElement()) return Promise.resolve(false);
    return document.exitPictureInPicture().then(() => true);
  }

  root.PinFlowDetect = {
    describe,
    candidates,
    inspect,
    state,
    findTarget,
    requestPip,
    exitPip,
    pipSupported,
    isVisible
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);