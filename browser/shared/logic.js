/**
 * PinFlow — shared logic.
 *
 * Pure, dependency-free helpers shared by the service worker, the popup and the
 * content scripts. Loaded as a classic script (no import/export) so it can be
 * used via importScripts(), <script src>, the manifest content_scripts list and
 * plain Node tests alike.
 *
 * This file must never touch the DOM or the chrome.* APIs.
 */
(function (root) {
  'use strict';

  /** Message types exchanged between extension components. */
  const MESSAGES = {
    QUERY: 'PINFLOW_QUERY',
    UNPIN: 'PINFLOW_UNPIN',
    STATE_CHANGED: 'PINFLOW_STATE_CHANGED',
    RESULT: 'PINFLOW_RESULT'
  };

  /** Internal error codes. Users never see these (PRD 19, 23). */
  const ERRORS = {
    NO_VIDEO: 'no-video',
    NOT_READY: 'not-ready',
    PIP_UNAVAILABLE: 'pip-unavailable',
    PIP_REJECTED: 'pip-rejected',
    UNSUPPORTED: 'unsupported',
    UNKNOWN: 'unknown'
  };

  /** User-facing copy. Terminology is fixed by PRD 26. */
  const COPY = {
    TAGLINE: 'Keep it visible.',
    PIN_ACTION: '\uD83D\uDCCC Pin Video',
    UNPIN_ACTION: 'Close PiP',
    READY_TITLE: 'Video detected',
    READY_DETAIL: 'Pin it to keep it visible while you work.',
    NO_VIDEO_TITLE: 'No supported video found.',
    NO_VIDEO_DETAIL: 'Open a supported video and try again.',
    NOT_READY_TITLE: "The video isn't ready yet.",
    NOT_READY_DETAIL: 'Try playing it first, then pin it.',
    PINNED_TITLE: 'Video is already pinned.',
    PINNED_DETAIL: 'It stays visible while you work in other tabs.',
    UNSUPPORTED_TITLE: "PinFlow doesn't support this page yet.",
    UNSUPPORTED_DETAIL: 'Currently supported: YouTube',
    UNSUPPORTED_SITE_TITLE: "This website isn't supported yet.",
    PIP_UNAVAILABLE_TITLE: "Picture-in-Picture isn't available for this video.",
    PIP_UNAVAILABLE_DETAIL: 'Your browser blocked the floating player for this video.',
    PIP_REJECTED_TITLE: "Couldn't pin this video.",
    PIP_REJECTED_DETAIL: 'Try playing the video first and try again.',
    UNKNOWN_TITLE: 'Something went wrong.',
    UNKNOWN_DETAIL: 'Please try again.',
    CHECKING: 'Checking for a video\u2026'
  };

  /** Smallest edge length (CSS px) a video must have to be considered visible. */
  const MIN_SIDE = 32;
  /** Hosts PinFlow supports in 1.0 (PRD 11.4, 12). */
  const SUPPORTED_HOSTS = ['youtube.com'];

  const VALID_TYPES = [MESSAGES.QUERY, MESSAGES.UNPIN, MESSAGES.STATE_CHANGED, MESSAGES.RESULT];

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /** True when the URL belongs to a page PinFlow supports. */
  function isSupportedUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || rawUrl.length === 0) return false;
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (_) {
      return false;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return SUPPORTED_HOSTS.some((entry) => host === entry || host.endsWith('.' + entry));
  }

  /**
   * Score a video descriptor for the Pin Video action.
   * Returns -Infinity when the element must never be used (PRD 13, 14).
   */
  function scoreVideo(descriptor) {
    const d = descriptor;
    if (!d) return -Infinity;
    if (d.disabled) return -Infinity;
    if (d.inAdContainer) return -Infinity;
    if (d.visible !== true) return -Infinity;
    if (!(d.readyState >= 1)) return -Infinity;
    if (!(d.videoWidth > 0) || !(d.videoHeight > 0)) return -Infinity;
    const width = d.width || 0;
    const height = d.height || 0;
    if (width < MIN_SIDE || height < MIN_SIDE) return -Infinity;

    let score = 0;
    if (d.isMainPlayer) score += 1000;
    score += Math.min(600, (width * height) / 1000);
    if (!d.paused) score += 200;
    if (!d.ended) score += 40;
    if (d.hasSrc) score += 40;
    return score;
  }

  /**
   * Looser score used only to explain *why* nothing is usable.
   * A visible element that is not ready yet should read as "not ready",
   * not as "no video found".
   */
  function scoreVideoLoose(descriptor) {
    const d = descriptor;
    if (!d) return -Infinity;
    if (d.inAdContainer) return -Infinity;
    if (d.visible !== true) return -Infinity;
    const width = d.width || 0;
    const height = d.height || 0;
    if (width < MIN_SIDE || height < MIN_SIDE) return -Infinity;

    let score = 0;
    if (d.isMainPlayer) score += 1000;
    score += Math.min(600, (width * height) / 1000);
    if (!d.disabled) score += 10;
    return score;
  }

  /** Pick the highest scoring descriptor. Returns null when none qualifies. */
  function pickBestVideo(descriptors, scorer) {
    const score = typeof scorer === 'function' ? scorer : scoreVideo;
    const list = Array.isArray(descriptors) ? descriptors : [];
    let best = null;
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let index = 0; index < list.length; index += 1) {
      const value = score(list[index]);
      if (value > bestScore) {
        bestScore = value;
        best = list[index];
        bestIndex = index;
      }
    }

    if (!best) return null;
    return { descriptor: best, index: bestIndex, score: bestScore };
  }

  function ui(tone, title, detail, action) {
    return { tone, title, detail: detail || '', action: action || null };
  }

  /** Map an internal error code to the popup UI model. */
  function errorUi(code) {
    switch (code) {
      case ERRORS.NO_VIDEO:
        return ui('empty', COPY.NO_VIDEO_TITLE, COPY.NO_VIDEO_DETAIL, null);
      case ERRORS.NOT_READY:
        return ui('warn', COPY.NOT_READY_TITLE, COPY.NOT_READY_DETAIL, { type: 'pin', label: COPY.PIN_ACTION });
      case ERRORS.PIP_UNAVAILABLE:
        return ui('error', COPY.PIP_UNAVAILABLE_TITLE, COPY.PIP_UNAVAILABLE_DETAIL, null);
      case ERRORS.PIP_REJECTED:
        return ui('error', COPY.PIP_REJECTED_TITLE, COPY.PIP_REJECTED_DETAIL, { type: 'pin', label: COPY.PIN_ACTION });
      case ERRORS.UNSUPPORTED:
        return ui('empty', COPY.UNSUPPORTED_SITE_TITLE, COPY.UNSUPPORTED_DETAIL, null);
      default:
        return ui('error', COPY.UNKNOWN_TITLE, COPY.UNKNOWN_DETAIL, { type: 'pin', label: COPY.PIN_ACTION });
    }
  }

  /**
   * Map an internal page state to the popup UI model (PRD 11).
   * State shape: { supported, found, usable, pipActive, pipAvailable, error }
   */
  function mapStateToUi(state) {
    const s = isPlainObject(state) ? state : {};
    if (s.error) return errorUi(s.error);
    if (s.supported === false) return ui('empty', COPY.UNSUPPORTED_TITLE, COPY.UNSUPPORTED_DETAIL, null);
    if (s.pipActive) return ui('pinned', COPY.PINNED_TITLE, COPY.PINNED_DETAIL, { type: 'unpin', label: COPY.UNPIN_ACTION });
    if (!s.found) return ui('empty', COPY.NO_VIDEO_TITLE, COPY.NO_VIDEO_DETAIL, null);
    if (!s.usable) {
      if (s.reason === 'disabled') {
        return ui('error', COPY.PIP_UNAVAILABLE_TITLE, COPY.PIP_UNAVAILABLE_DETAIL, null);
      }
      return ui('warn', COPY.NOT_READY_TITLE, COPY.NOT_READY_DETAIL, { type: 'pin', label: COPY.PIN_ACTION });
    }
    if (s.pipAvailable === false) {
      return ui('error', COPY.PIP_UNAVAILABLE_TITLE, COPY.PIP_UNAVAILABLE_DETAIL, null);
    }
    return ui('ready', COPY.READY_TITLE, COPY.READY_DETAIL, { type: 'pin', label: COPY.PIN_ACTION });
  }

  /** Single-line friendly message, used for the toolbar tooltip. */
  function errorMessage(code) {
    const model = errorUi(code);
    return model.detail ? model.title + ' ' + model.detail : model.title;
  }

  /** Map a thrown DOMException to an internal error code. */
  function classifyError(err) {
    const name = err && typeof err.name === 'string' ? err.name : '';
    switch (name) {
      case 'NotAllowedError':
        return ERRORS.PIP_REJECTED;
      case 'AbortError':
        return ERRORS.PIP_REJECTED;
      case 'NotSupportedError':
        return ERRORS.PIP_UNAVAILABLE;
      case 'SecurityError':
        return ERRORS.PIP_UNAVAILABLE;
      case 'InvalidStateError':
        return ERRORS.NOT_READY;
      default:
        return ERRORS.UNKNOWN;
    }
  }

  /**
   * Validate an inbound message before acting on it (PRD 19).
   * Returns the message type when valid, otherwise null.
   */
  function validateMessage(message) {
    if (!isPlainObject(message)) return null;
    const type = message.type;
    if (typeof type !== 'string' || VALID_TYPES.indexOf(type) === -1) return null;

    if (type === MESSAGES.STATE_CHANGED) {
      if (typeof message.reason !== 'string') return null;
      if (!isPlainObject(message.state)) return null;
    }

    if (type === MESSAGES.RESULT) {
      if (typeof message.ok !== 'boolean') return null;
      if (message.ok === false && typeof message.error !== 'string') return null;
      if (message.state !== undefined && message.state !== null && !isPlainObject(message.state)) return null;
    }

    return type;
  }

  const PinFlowLogic = {
    MESSAGES,
    ERRORS,
    COPY,
    MIN_SIDE,
    SUPPORTED_HOSTS,
    isSupportedUrl,
    scoreVideo,
    scoreVideoLoose,
    pickBestVideo,
    mapStateToUi,
    errorUi,
    errorMessage,
    classifyError,
    validateMessage
  };

  root.PinFlowLogic = PinFlowLogic;
  if (typeof module !== 'undefined' && module.exports) module.exports = PinFlowLogic;
})(typeof globalThis !== 'undefined' ? globalThis : this);