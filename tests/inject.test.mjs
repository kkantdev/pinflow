/**
 * PinFlow — integration tests for the injected payload and content script.
 *
 * These run the real src/content/*.js files inside a Node VM context that
 * mimics the extension isolated world: a fake DOM, a fake chrome.runtime and a
 * fake HTMLVideoElement. They verify the parts that unit tests cannot reach —
 * that pip.js actually requests Picture-in-Picture, that it reports the right
 * outcome, and that content.js answers messages correctly.
 *
 * Run with: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SOURCES = {
  logic: readFileSync(new URL('../application/src/shared/logic.js', import.meta.url), 'utf8'),
  detect: readFileSync(new URL('../application/src/content/detect.js', import.meta.url), 'utf8'),
  pip: readFileSync(new URL('../application/src/content/pip.js', import.meta.url), 'utf8'),
  content: readFileSync(new URL('../application/src/content/content.js', import.meta.url), 'utf8')
};

/** Minimal <video> stand-in with the surface detect.js inspects. */
function fakeVideo(options = {}) {
  const o = Object.assign(
    {
      width: 1280,
      height: 720,
      videoWidth: 1920,
      videoHeight: 1080,
      readyState: 4,
      paused: true,
      ended: false,
      main: true,
      disabled: false,
      display: 'block',
      opacity: '1',
      pipRequest: () => Promise.resolve({})
    },
    options
  );

  const handlers = {};

  return {
    tagName: 'VIDEO',
    isConnected: true,
    disablePictureInPicture: o.disabled,
    readyState: o.readyState,
    paused: o.paused,
    ended: o.ended,
    videoWidth: o.videoWidth,
    videoHeight: o.videoHeight,
    clientWidth: o.width,
    clientHeight: o.height,
    currentSrc: 'blob:https://www.youtube.com/video',
    style: { display: o.display, visibility: 'visible', opacity: o.opacity },
    classList: { contains: (name) => o.main && name === 'html5-main-video' },
    closest: (selector) =>
      o.main && (selector === '#movie_player' || selector === '.html5-video-player') ? { tagName: 'DIV' } : null,
    hasAttribute: (name) => o.disabled && name === 'disablePictureInPicture',
    getBoundingClientRect: () => ({ width: o.width, height: o.height }),
    addEventListener: (name, fn) => {
      handlers[name] = handlers[name] || [];
      handlers[name].push(fn);
    },
    removeEventListener: (name, fn) => {
      handlers[name] = (handlers[name] || []).filter((entry) => entry !== fn);
    },
    /** Fire a DOM event at this element (used to simulate PiP lifecycle). */
    fire: (name) => {
      (handlers[name] || []).slice().forEach((fn) => fn({ type: name }));
    },
    listenerCount: (name) => (handlers[name] || []).length,
    requestPictureInPicture: o.pipRequest
  };
}

/** Build an isolated-world sandbox containing the real PinFlow source files. */
function sandbox(options = {}) {
  const o = Object.assign(
    { videos: [], pipEnabled: true, pipElement: null, breaking: false, files: ['logic', 'detect', 'pip'] },
    options
  );

  const sent = [];
  const listeners = [];

  class FakeObserver {
    observe() {}
    disconnect() {}
  }

  class FakeVideoElement {}
  FakeVideoElement.prototype.requestPictureInPicture = () => Promise.resolve({});

  const context = {
    console,
    setTimeout,
    clearTimeout,
    MutationObserver: FakeObserver,
    HTMLVideoElement: FakeVideoElement,
    URL,
    // A real window offers these; content.js registers a pagehide handler.
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: (el) => ({
      display: (el.style && el.style.display) || 'block',
      visibility: (el.style && el.style.visibility) || 'visible',
      opacity: (el.style && el.style.opacity) || '1'
    }),
    document: {
      body: {},
      pictureInPictureEnabled: o.pipEnabled,
      pictureInPictureElement: o.pipElement,
      querySelectorAll: (selector) => {
        if (o.breaking) throw new Error('detached document');
        return selector === 'video' ? o.videos : [];
      },
      querySelector: (selector) => (o.videos.some((v) => v.classList.contains('html5-main-video')) && selector === '#movie_player' ? { tagName: 'DIV' } : null),
      exitPictureInPicture: () => Promise.resolve(),
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    chrome: {
      runtime: {
        sendMessage: (message) => {
          sent.push(message);
          return Promise.resolve();
        },
        onMessage: {
          addListener: (fn) => listeners.push(fn)
        }
      }
    },
    __sent: sent,
    __listeners: listeners
  };

  createContext(context);

  // Model the browser: a resolved request sets document.pictureInPictureElement.
  for (const video of o.videos) {
    const original = video.requestPictureInPicture;
    video.requestPictureInPicture = () =>
      Promise.resolve(original()).then((result) => {
        context.document.pictureInPictureElement = video;
        video.fire('enterpictureinpicture');
        return result;
      });
  }

  for (const name of o.files) runInContext(SOURCES[name], context, { filename: name + '.js' });

  return context;
}

/** Let queued promise callbacks run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/* ------------------------------------------------------------- pip.js ---- */

test('pip.js requests Picture-in-Picture and reports success (AC-04, AC-05)', async () => {
  let requested = 0;
  const video = fakeVideo({
    pipRequest: () => {
      requested += 1;
      return Promise.resolve({});
    }
  });

  const ctx = sandbox({ videos: [video] });
  await flush();

  assert.equal(requested, 1, 'requestPictureInPicture must be called exactly once');
  assert.equal(ctx.__sent.length, 1);
  assert.equal(ctx.__sent[0].type, 'PINFLOW_RESULT');
  assert.equal(ctx.__sent[0].ok, true);
  assert.equal(ctx.__sent[0].alreadyPinned, false);
  assert.equal(ctx.__sent[0].state.pipActive, true);
});

test('pip.js skips previews and picks the main player (PRD 13)', async () => {
  let pinnedPreview = false;
  const preview = fakeVideo({
    main: false,
    width: 320,
    height: 180,
    pipRequest: () => {
      pinnedPreview = true;
      return Promise.resolve({});
    }
  });
  const player = fakeVideo({ main: true, width: 1280, height: 720 });

  const ctx = sandbox({ videos: [preview, player] });
  await flush();

  assert.equal(pinnedPreview, false, 'a small preview must never be pinned');
  assert.equal(ctx.__sent[0].ok, true);
});

test('pip.js ignores hidden videos (PRD 13)', async () => {
  const hidden = fakeVideo({ main: true, display: 'none' });
  const ctx = sandbox({ videos: [hidden] });
  await flush();

  assert.equal(ctx.__sent[0].ok, false);
  assert.equal(ctx.__sent[0].error, 'no-video');
});

test('pip.js reports no-video / not-ready / pip-unavailable accurately', async () => {
  const none = sandbox({ videos: [] });
  const loading = sandbox({ videos: [fakeVideo({ readyState: 0, videoWidth: 0, videoHeight: 0 })] });
  const blocked = sandbox({ videos: [fakeVideo({ disabled: true })] });
  const disabledBrowser = sandbox({ videos: [fakeVideo()], pipEnabled: false });
  await flush();

  assert.equal(none.__sent[0].error, 'no-video');
  assert.equal(loading.__sent[0].error, 'not-ready');
  assert.equal(blocked.__sent[0].error, 'pip-unavailable');

  // A browser with PiP switched off reports the same friendly state.
  assert.equal(disabledBrowser.__sent[0].error, 'pip-unavailable');
});

test('pip.js maps a browser rejection to a friendly code (PRD 23)', async () => {
  const rejection = new Error('no activation');
  rejection.name = 'NotAllowedError';

  const ctx = sandbox({ videos: [fakeVideo({ pipRequest: () => Promise.reject(rejection) })] });
  await flush();

  assert.equal(ctx.__sent[0].ok, false);
  assert.equal(ctx.__sent[0].error, 'pip-rejected');
  assert.equal(ctx.__sent[0].state.pipAvailable, true);
});

test('pip.js is a no-op when the video is already pinned (PRD 11.3)', async () => {
  let requested = 0;
  const video = fakeVideo({
    pipRequest: () => {
      requested += 1;
      return Promise.resolve({});
    }
  });

  const ctx = sandbox({ videos: [video], pipElement: video });
  await flush();

  assert.equal(requested, 0, 'must not re-request PiP when it is already active');
  assert.equal(ctx.__sent[0].ok, true);
  assert.equal(ctx.__sent[0].alreadyPinned, true);
});

test('pip.js never throws when the page DOM is hostile', async () => {
  const ctx = sandbox({ files: ['logic', 'detect', 'pip'], videos: [], breaking: true });
  await flush();

  assert.equal(ctx.__sent.length, 1, 'it must still report an outcome');
  assert.equal(ctx.__sent[0].ok, false);
  assert.equal(ctx.__sent[0].error, 'no-video');
});

/* --------------------------------------------------------- content.js ---- */

const CONTENT_FILES = ['logic', 'detect', 'content'];

test('content.js answers a state query (AC-03)', () => {
  const ctx = sandbox({ files: CONTENT_FILES, videos: [fakeVideo()] });
  const listener = ctx.__listeners[0];

  let response = null;
  const keepAlive = listener({ type: 'PINFLOW_QUERY' }, {}, (value) => {
    response = value;
  });

  assert.equal(keepAlive, false, 'a synchronous query must not hold the channel open');
  assert.equal(response.found, true);
  assert.equal(response.usable, true);
  assert.equal(response.pipActive, false);
  assert.equal(response.pipAvailable, true);
  assert.equal(response.reason, 'ready');
});

test('content.js ignores unknown or malformed messages (PRD 19)', () => {
  const ctx = sandbox({ files: CONTENT_FILES, videos: [fakeVideo()] });
  const listener = ctx.__listeners[0];

  let answered = false;
  const messages = [null, undefined, {}, { type: 'PINFLOW_HACK' }, { type: 42 }, 'PINFLOW_QUERY'];

  for (const message of messages) {
    const keepAlive = listener(message, {}, () => {
      answered = true;
    });
    assert.equal(keepAlive, false, JSON.stringify(message));
  }
  assert.equal(answered, false);
});

test('content.js reports the PiP lifecycle (AC-08)', () => {
  const video = fakeVideo();
  const ctx = sandbox({ files: CONTENT_FILES, videos: [video] });

  assert.equal(video.listenerCount('enterpictureinpicture'), 1);
  assert.equal(video.listenerCount('leavepictureinpicture'), 1);

  ctx.document.pictureInPictureElement = video;
  video.fire('enterpictureinpicture');

  let last = ctx.__sent[ctx.__sent.length - 1];
  assert.equal(last.type, 'PINFLOW_STATE_CHANGED');
  assert.equal(last.reason, 'pip-enter');
  assert.equal(last.state.pipActive, true);

  ctx.document.pictureInPictureElement = null;
  video.fire('leavepictureinpicture');

  last = ctx.__sent[ctx.__sent.length - 1];
  assert.equal(last.reason, 'pip-leave');
  assert.equal(last.state.pipActive, false);
});

test('content.js handles UNPIN asynchronously', async () => {
  const video = fakeVideo();
  const ctx = sandbox({ files: CONTENT_FILES, videos: [video] });
  ctx.document.pictureInPictureElement = video;

  let response = null;
  const keepAlive = ctx.__listeners[0]({ type: 'PINFLOW_UNPIN' }, {}, (value) => {
    response = value;
  });

  assert.equal(keepAlive, true, 'unpinning needs to keep the channel open');
  await flush();
  assert.equal(response.ok, true);
});

test('content.js installs listeners once, even if injected again', () => {
  const video = fakeVideo();
  const ctx = sandbox({ files: CONTENT_FILES, videos: [video] });

  assert.equal(ctx.__listeners.length, 1);
  const initReports = ctx.__sent.length;

  runInContext(SOURCES.content, ctx, { filename: 'content.js' });

  assert.equal(ctx.__listeners.length, 1, 're-injection must not double-register');
  assert.equal(ctx.__sent.length, initReports, 're-injection must not report twice');
  assert.equal(video.listenerCount('enterpictureinpicture'), 1);
});

test('content.js starts with an initial state report', () => {
  const ctx = sandbox({ files: CONTENT_FILES, videos: [fakeVideo()] });
  const first = ctx.__sent[0];
  assert.equal(first.type, 'PINFLOW_STATE_CHANGED');
  assert.equal(first.reason, 'init');
  assert.equal(first.state.usable, true);
});