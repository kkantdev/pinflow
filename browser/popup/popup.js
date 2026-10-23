/**
 * PinFlow — popup controller.
 *
 * Renders the §11 popup states and performs the two user actions:
 * Pin Video (gesture-attributed injection) and Close PiP.
 */
(function () {
  'use strict';

  const L = globalThis.PinFlowLogic;
  const Api = globalThis.PinFlowApi;

  const RESULT_TIMEOUT_MS = 2500;

  const el = {
    title: document.getElementById('status-title'),
    detail: document.getElementById('status-detail'),
    action: document.getElementById('action'),
    shortcut: document.getElementById('shortcut')
  };

  let tab = null;
  let busy = false;
  let resultTimer = 0;

  function render(uiModel) {
    el.title.textContent = uiModel.title;
    el.detail.textContent = uiModel.detail || '';
    el.detail.hidden = !uiModel.detail;
    document.body.dataset.tone = uiModel.tone;

    const action = uiModel.action;
    if (action) {
      el.action.hidden = false;
      el.action.textContent = action.label;
      el.action.dataset.action = action.type;
      el.action.setAttribute('aria-label', action.label.replace(/[^\x20-\x7E]/g, '').trim() || action.label);
      el.action.disabled = busy;
    } else {
      el.action.hidden = true;
      el.action.textContent = '';
      el.action.dataset.action = '';
      el.action.removeAttribute('aria-label');
      el.action.disabled = true;
    }
  }

  function renderState(state) {
    render(L.mapStateToUi(state));
  }

  function setBusy(value) {
    busy = value;
    document.body.dataset.busy = value ? 'true' : 'false';
    el.action.disabled = value || el.action.hidden;
  }

  function clearResultTimer() {
    if (resultTimer) {
      clearTimeout(resultTimer);
      resultTimer = 0;
    }
  }

  /** Safety net in case no PINFLOW_RESULT arrives (page navigated, tab closed). */
  function armResultTimer() {
    clearResultTimer();
    resultTimer = setTimeout(() => {
      resultTimer = 0;
      setBusy(false);
      refresh();
    }, RESULT_TIMEOUT_MS);
  }

  function refresh() {
    return Api.activeTab()
      .then((active) => {
        tab = active;
        const verdict = Api.classifyTab(active);
        if (!verdict.ok) {
          renderState(verdict.state);
          return null;
        }
        return Api.queryState(active.id).then((state) => {
          if (state) renderState(Object.assign({ supported: true }, state));
          else renderState({ supported: true, found: false, usable: false, pipActive: false });
          return state;
        });
      })
      .catch(() => {
        renderState({ supported: false });
      });
  }

  function runAction() {
    const type = el.action.dataset.action;
    if (!type || busy || !tab || typeof tab.id !== 'number') return;

    setBusy(true);

    if (type === 'pin') {
      Api.pinVideo(tab.id).then(
        () => armResultTimer(),
        () => {
          // executeScript() was refused: this tab is out of PinFlow's scope.
          setBusy(false);
          renderState({ supported: false });
        }
      );
      return;
    }

    if (type === 'unpin') {
      Api.unpinVideo(tab.id)
        .then(() => {
          setBusy(false);
          return refresh();
        })
        .catch(() => {
          setBusy(false);
          renderState({ supported: true, error: L.ERRORS.UNKNOWN });
        });
      return;
    }

    setBusy(false);
  }

  chrome.runtime.onMessage.addListener((message) => {
    const type = L.validateMessage(message);
    if (!type) return false;

    if (type === L.MESSAGES.RESULT) {
      clearResultTimer();
      setBusy(false);
      if (message.ok) {
        // requestPictureInPicture() only resolves once the video is floating, so
        // the pinned state is authoritative here even if the page reports a
        // momentarily stale document.pictureInPictureElement.
        renderState(Object.assign({}, message.state || {}, { supported: true, pipActive: true }));
      } else {
        renderState(Object.assign({ supported: true }, message.state || {}, { error: message.error }));
      }
      return false;
    }

    if (type === L.MESSAGES.STATE_CHANGED) {
      refresh();
      return false;
    }

    return false;
  });

  el.action.addEventListener('click', runAction);

  Api.getShortcut()
    .then((shortcut) => {
      el.shortcut.textContent = shortcut || 'Not set';
    })
    .catch(() => {
      el.shortcut.textContent = 'Not set';
    })
    .then(refresh);
})();