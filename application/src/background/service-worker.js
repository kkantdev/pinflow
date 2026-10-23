/**
 * PinFlow — service worker.
 *
 * Handles the keyboard shortcut, keeps the toolbar badge in sync with the PiP
 * lifecycle and validates every message it receives (PRD 16, 19).
 */
importScripts('/src/shared/logic.js', '/src/shared/api.js');

const L = globalThis.PinFlowLogic;
const Api = globalThis.PinFlowApi;

const DEFAULT_TITLE = 'PinFlow \u2014 Pin Video';
const PINNED_TITLE = 'PinFlow \u2014 video is pinned';
const BADGE_PINNED_TEXT = 'ON';
const BADGE_PINNED_COLOR = '#2E7D32';
const BADGE_ERROR_TEXT = '!';
const BADGE_ERROR_COLOR = '#C62828';

function safe(promise) {
  if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  return promise;
}

function resetAction(tabId) {
  if (typeof tabId !== 'number') return;
  safe(chrome.action.setBadgeText({ tabId, text: '' }));
  safe(chrome.action.setTitle({ tabId, title: DEFAULT_TITLE }));
}

function markPinned(tabId) {
  if (typeof tabId !== 'number') return;
  safe(chrome.action.setBadgeText({ tabId, text: BADGE_PINNED_TEXT }));
  safe(chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_PINNED_COLOR }));
  safe(chrome.action.setTitle({ tabId, title: PINNED_TITLE }));
}

function markError(tabId, message) {
  if (typeof tabId !== 'number') return;
  safe(chrome.action.setBadgeText({ tabId, text: BADGE_ERROR_TEXT }));
  safe(chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_ERROR_COLOR }));
  safe(chrome.action.setTitle({ tabId, title: 'PinFlow \u2014 ' + message }));
}

function tabIdOf(sender) {
  return sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
}

chrome.runtime.onMessage.addListener((message, sender) => {
  const type = L.validateMessage(message);
  if (!type) return false;

  const tabId = tabIdOf(sender);
  if (tabId === null) return false;

  if (type === L.MESSAGES.STATE_CHANGED) {
    if (message.state && message.state.pipActive) markPinned(tabId);
    else resetAction(tabId);
    return false;
  }

  if (type === L.MESSAGES.RESULT) {
    if (message.ok) markPinned(tabId);
    else markError(tabId, L.errorMessage(message.error));
    return false;
  }

  return false;
});

/** Keyboard shortcut: Pin Video without opening the popup (PRD 16). */
chrome.commands.onCommand.addListener((command) => {
  if (command !== Api.SHORTCUT_COMMAND) return;

  Api.activeTab().then((tab) => {
    if (!tab || typeof tab.id !== 'number') return;
    const verdict = Api.classifyTab(tab);
    if (!verdict.ok) {
      markError(tab.id, L.errorMessage(L.ERRORS.UNSUPPORTED));
      return;
    }
    safe(Api.pinVideo(tab.id).catch(() => markError(tab.id, L.errorMessage(L.ERRORS.UNSUPPORTED))));
  });
});

/** A new document means any previously pinned state on that tab is stale. */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo && changeInfo.status === 'loading') resetAction(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  safe(chrome.action.setBadgeText({ text: '' }));
  safe(chrome.action.setTitle({ title: DEFAULT_TITLE }));
});