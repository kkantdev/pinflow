/**
 * PinFlow — content script (supported pages only: YouTube).
 *
 * Responsibilities:
 *  - answer QUERY / UNPIN messages from the popup and the service worker
 *  - watch the PiP lifecycle and report state changes
 *  - survive YouTube's single-page navigation without polling (PRD 12, 32)
 *
 * It deliberately does NOT perform the Pin Video action: that must come from a
 * gesture-attributed executeScript() injection of Nova's pip.js payload.
 */
(function (root) {
  'use strict';

  const L = root.PinFlowLogic;
  const D = root.PinFlowDetect;
  if (!L || !D) return;

  const NS = (root.__pinflowNS = root.__pinflowNS || {
    installed: false,
    watched: null,
    observer: null,
    observerTarget: null,
    timer: 0
  });

  const NAVIGATE_EVENTS = ['yt-navigate-finish', 'yt-page-data-updated'];
  const SETTLE_MS = 250;

  function send(message) {
    try {
      const pending = chrome.runtime.sendMessage(message);
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch (_) {
      /* No receiver (service worker asleep) is fine: state is re-queried on demand. */
    }
  }

  function report(reason) {
    send({ type: L.MESSAGES.STATE_CHANGED, reason, state: D.state() });
  }

  function onEnter() {
    report('pip-enter');
  }

  function onLeave() {
    report('pip-leave');
  }

  function detach() {
    if (!NS.watched) return;
    try {
      NS.watched.removeEventListener('enterpictureinpicture', onEnter);
      NS.watched.removeEventListener('leavepictureinpicture', onLeave);
    } catch (_) {
      /* element may already be gone */
    }
    NS.watched = null;
  }

  function attach() {
    const element = D.findTarget();
    if (!element) {
      detach();
      return;
    }
    if (NS.watched === element) return;
    detach();
    try {
      element.addEventListener('enterpictureinpicture', onEnter);
      element.addEventListener('leavepictureinpicture', onLeave);
      NS.watched = element;
    } catch (_) {
      NS.watched = null;
    }
  }

  function schedule() {
    if (NS.timer) return;
    NS.timer = root.setTimeout(() => {
      NS.timer = 0;
      attach();
      observe();
    }, SETTLE_MS);
  }

  function playerRoot() {
    return document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  }

  /**
   * Observe the player subtree only. Attributes are ignored on purpose so that
   * playback progress updates cannot cause a storm of callbacks (PRD 32).
   */
  function observe() {
    const player = playerRoot();
    if (player && NS.observer && NS.observerTarget === player) return;

    if (NS.observer) {
      NS.observer.disconnect();
      NS.observer = null;
      NS.observerTarget = null;
    }

    const target = player || document.body;
    if (!target || typeof root.MutationObserver !== 'function') return;

    NS.observerTarget = target;
    NS.observer = new root.MutationObserver(schedule);
    NS.observer.observe(target, { childList: true, subtree: true });
  }

  function teardown() {
    detach();
    if (NS.observer) {
      NS.observer.disconnect();
      NS.observer = null;
      NS.observerTarget = null;
    }
    if (NS.timer) {
      root.clearTimeout(NS.timer);
      NS.timer = 0;
    }
    NAVIGATE_EVENTS.forEach((name) => document.removeEventListener(name, schedule, true));
    root.removeEventListener('pagehide', teardown);
  }

  function onMessage(message, sender, sendResponse) {
    const type = L.validateMessage(message);
    if (!type) return false;

    if (type === L.MESSAGES.QUERY) {
      sendResponse(D.state());
      return false;
    }

    if (type === L.MESSAGES.UNPIN) {
      D.exitPip().then(
        () => sendResponse({ ok: true, state: D.state() }),
        (err) => sendResponse({ ok: false, error: L.classifyError(err), state: D.state() })
      );
      return true;
    }

    return false;
  }

  if (NS.installed) return;
  NS.installed = true;

  chrome.runtime.onMessage.addListener(onMessage);
  NAVIGATE_EVENTS.forEach((name) => document.addEventListener(name, schedule, true));
  root.addEventListener('pagehide', teardown, { once: true });

  attach();
  observe();
  report('init');
})(typeof globalThis !== 'undefined' ? globalThis : this);