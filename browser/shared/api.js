/**
 * PinFlow — extension API wrappers.
 *
 * Shared by the popup and the service worker so both use the exact same
 * injection paths. Requires PinFlowLogic to be loaded first.
 *
 * PIN_FILES below loads Nova (detect.js + pip.js) to perform the Pin Video
 * action; ENSURE_FILES installs the content script on demand.
 */
(function (root) {
  'use strict';

  const L = root.PinFlowLogic;
  if (!L) return;
  if (root.PinFlowApi) return;

  /**
   * Files injected for the Pin Video action. Order matters: logic, then
   * detection, then the payload that performs the PiP request.
   */
  const PIN_FILES = ['shared/logic.js', 'content/detect.js', 'content/pip.js'];

  /** Files that install the persistent content script on demand. */
  const ENSURE_FILES = ['shared/logic.js', 'content/detect.js', 'content/content.js'];

  const SHORTCUT_COMMAND = 'pin-video';

  function activeTab() {
    return chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => (tabs && tabs.length ? tabs[0] : null))
      .catch(() => null);
  }

  function ensureContentScript(tabId) {
    return chrome.scripting.executeScript({ target: { tabId }, files: ENSURE_FILES }).then(
      () => true,
      () => false
    );
  }

  /**
   * Ask the page for its current state. Falls back to injecting the content
   * script when it is not present yet (for example on a freshly loaded page).
   */
  function queryState(tabId) {
    const ask = () => chrome.tabs.sendMessage(tabId, { type: L.MESSAGES.QUERY });

    return ask()
      .then((state) => state || null)
      .catch(() =>
        ensureContentScript(tabId)
          .then((ok) => (ok ? ask() : null))
          .then((state) => state || null)
          .catch(() => null)
      );
  }

  /**
   * Pin Video. The actual PiP request happens inside the injected payload and
   * the outcome arrives later through a PINFLOW_RESULT runtime message.
   */
  function pinVideo(tabId) {
    return chrome.scripting.executeScript({ target: { tabId }, files: PIN_FILES });
  }

  /** Leave Picture-in-Picture via the page. */
  function unpinVideo(tabId) {
    return chrome.tabs.sendMessage(tabId, { type: L.MESSAGES.UNPIN }).catch(() => null);
  }

  /** The shortcut currently bound to Pin Video, or '' when unassigned. */
  function getShortcut() {
    return chrome.commands
      .getAll()
      .then((commands) => {
        const match = (commands || []).find((command) => command.name === SHORTCUT_COMMAND);
        return match && match.shortcut ? match.shortcut : '';
      })
      .catch(() => '');
  }

  /**
   * Decide whether the popup may act on this tab at all.
   * Browser-internal pages and non-supported sites are rejected up front,
   * which is why PinFlow stays within its declared scope (PRD 17, 22).
   */
  function classifyTab(tab) {
    if (!tab || typeof tab.id !== 'number') {
      return { ok: false, reason: 'no-tab', state: { supported: false } };
    }
    if (typeof tab.url === 'string' && !L.isSupportedUrl(tab.url)) {
      return { ok: false, reason: 'unsupported', state: { supported: false } };
    }
    return { ok: true, reason: 'supported', state: { supported: true } };
  }

  root.PinFlowApi = {
    PIN_FILES,
    ENSURE_FILES,
    SHORTCUT_COMMAND,
    activeTab,
    ensureContentScript,
    queryState,
    pinVideo,
    unpinVideo,
    getShortcut,
    classifyTab
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
