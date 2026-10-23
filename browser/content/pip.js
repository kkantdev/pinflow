/**
 * PinFlow — Pin Video payload.
 *
 * Part of **Nova**, PinFlow's internal Picture-in-Picture engine. This is the
 * half of Nova that performs the request; detect.js is the other half.
 *
 * This file is injected via chrome.scripting.executeScript() directly from a
 * user gesture (popup button click or the keyboard shortcut). Chromium activates
 * the injected world, which is what lets requestPictureInPicture() succeed:
 * a message sent to an already-running content script would NOT carry that
 * activation and would fail with NotAllowedError (PRD 14, 16).
 *
 * It must stay completely synchronous up to the requestPictureInPicture() call,
 * which is why detect.js does the DOM work and calls it in one go.
 */
(function (root) {
  'use strict';

  const L = root.PinFlowLogic;
  const D = root.PinFlowDetect;

  const RESULT_TYPE = (L && L.MESSAGES && L.MESSAGES.RESULT) || 'PINFLOW_RESULT';
  const FALLBACK_ERROR = (L && L.ERRORS && L.ERRORS.UNKNOWN) || 'unknown';

  function classify(err) {
    return L && typeof L.classifyError === 'function' ? L.classifyError(err) : FALLBACK_ERROR;
  }

  function safeState() {
    try {
      return D && typeof D.state === 'function' ? D.state() : undefined;
    } catch (_) {
      return undefined;
    }
  }

  function reply(payload) {
    const message = { type: RESULT_TYPE, ok: false, error: FALLBACK_ERROR };
    Object.assign(message, payload);
    try {
      const pending = chrome.runtime.sendMessage(message);
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    } catch (_) {
      /* Extension context went away (reload / uninstall): nothing to report to. */
    }
  }

  if (!D) {
    reply({ ok: false, error: FALLBACK_ERROR });
    return;
  }

  let outcome;
  try {
    outcome = D.requestPip();
  } catch (err) {
    reply({ ok: false, error: classify(err), state: safeState() });
    return;
  }

  if (!outcome || typeof outcome.pending === 'undefined') {
    // Synchronous decision: already pinned, unsupported, no video or not ready.
    reply(outcome || { ok: false, error: FALLBACK_ERROR });
    return;
  }

  Promise.resolve(outcome.pending).then(
    () => reply({ ok: true, alreadyPinned: false, state: safeState() }),
    (err) => reply({ ok: false, error: classify(err), state: safeState() })
  );
})(typeof globalThis !== 'undefined' ? globalThis : this);