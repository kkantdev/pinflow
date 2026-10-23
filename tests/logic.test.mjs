/**
 * PinFlow — unit tests for the pure shared logic.
 *
 * Run with: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';

await import('../application/src/shared/logic.js');

const L = globalThis.PinFlowLogic;

/** Build a video descriptor with sensible, usable defaults. */
function descriptor(overrides = {}) {
  return Object.assign(
    {
      index: 0,
      isMainPlayer: false,
      inAdContainer: false,
      disabled: false,
      readyState: 3,
      paused: true,
      ended: false,
      videoWidth: 1280,
      videoHeight: 720,
      width: 640,
      height: 360,
      visible: true,
      hasSrc: true
    },
    overrides
  );
}

test('logic module is exposed', () => {
  assert.equal(typeof L, 'object');
  assert.equal(typeof L.isSupportedUrl, 'function');
});

test('isSupportedUrl accepts YouTube only (PRD 11.4, 12)', () => {
  const supported = [
    'https://www.youtube.com/watch?v=abc',
    'https://youtube.com/watch?v=abc',
    'https://m.youtube.com/watch?v=abc',
    'https://music.youtube.com/watch?v=abc',
    'http://www.youtube.com/'
  ];
  for (const url of supported) {
    assert.equal(L.isSupportedUrl(url), true, url);
  }

  const rejected = [
    'https://www.youtube-nocookie.com/embed/abc',
    'https://notyoutube.com/watch?v=abc',
    'https://youtube.com.evil.example/watch?v=abc',
    'https://evil.example/youtube.com',
    'brave://extensions',
    'chrome://newtab',
    'file:///C:/video.html',
    'about:blank',
    'mailto:someone@example.com',
    '',
    null,
    undefined,
    42
  ];
  for (const url of rejected) {
    assert.equal(L.isSupportedUrl(url), false, String(url));
  }
});

test('scoreVideo rejects videos that can never be pinned (PRD 13)', () => {
  const cases = {
    disabled: descriptor({ disabled: true }),
    adContainer: descriptor({ inAdContainer: true }),
    hidden: descriptor({ visible: false }),
    noTrack: descriptor({ videoWidth: 0, videoHeight: 0 }),
    nothingLoaded: descriptor({ readyState: 0 }),
    tooSmall: descriptor({ width: 16, height: 9 }),
    missing: null,
    undefinedDescriptor: undefined
  };
  for (const [label, value] of Object.entries(cases)) {
    assert.equal(L.scoreVideo(value), -Infinity, label);
  }
});

test('scoreVideo accepts a paused but ready video (PRD 34)', () => {
  const paused = descriptor({ paused: true });
  assert.ok(L.scoreVideo(paused) > 0);
  assert.ok(L.scoreVideo(descriptor({ paused: false })) > L.scoreVideo(paused));
});

test('scoreVideo prefers the main player and the larger element', () => {
  const main = descriptor({ isMainPlayer: true, width: 320, height: 180 });
  const bigOther = descriptor({ width: 1280, height: 720 });
  assert.ok(L.scoreVideo(main) > L.scoreVideo(bigOther));

  const small = descriptor({ width: 160, height: 90 });
  const large = descriptor({ width: 1280, height: 720 });
  assert.ok(L.scoreVideo(large) > L.scoreVideo(small));
});

test('pickBestVideo returns the winning index or null', () => {
  const list = [
    descriptor({ width: 320, height: 180 }),
    descriptor({ isMainPlayer: true, width: 640, height: 360 }),
    descriptor({ width: 200, height: 120 })
  ];
  const best = L.pickBestVideo(list);
  assert.equal(best.index, 1);
  assert.equal(best.descriptor.isMainPlayer, true);

  assert.equal(L.pickBestVideo([descriptor({ visible: false })]), null);
  assert.equal(L.pickBestVideo([]), null);
  assert.equal(L.pickBestVideo(undefined), null);
});

test('scoreVideoLoose explains "not ready" instead of "no video"', () => {
  const loading = descriptor({ readyState: 0, videoWidth: 0, videoHeight: 0 });
  assert.equal(L.scoreVideo(loading), -Infinity);
  assert.ok(L.scoreVideoLoose(loading) > -Infinity);
});

test('mapStateToUi covers every popup state (PRD 11)', () => {
  const unsupported = L.mapStateToUi({ supported: false });
  assert.equal(unsupported.title, "PinFlow doesn't support this page yet.");
  assert.equal(unsupported.detail, 'Currently supported: YouTube');
  assert.equal(unsupported.action, null);

  const noVideo = L.mapStateToUi({ supported: true, found: false });
  assert.equal(noVideo.title, 'No supported video found.');
  assert.equal(noVideo.action, null);

  const notReady = L.mapStateToUi({ supported: true, found: true, usable: false });
  assert.equal(notReady.title, "The video isn't ready yet.");
  assert.equal(notReady.action.type, 'pin');

  const pinned = L.mapStateToUi({ supported: true, found: true, usable: true, pipActive: true });
  assert.equal(pinned.title, 'Video is already pinned.');
  assert.equal(pinned.action.type, 'unpin');
  assert.equal(pinned.action.label, 'Close PiP');

  const ready = L.mapStateToUi({ supported: true, found: true, usable: true, pipAvailable: true });
  assert.equal(ready.title, 'Video detected');
  assert.equal(ready.action.type, 'pin');
  assert.equal(ready.action.label, '\uD83D\uDCCC Pin Video');

  const unavailable = L.mapStateToUi({ supported: true, found: true, usable: true, pipAvailable: false });
  assert.equal(unavailable.title, "Picture-in-Picture isn't available for this video.");
  assert.equal(unavailable.action, null);
});

test('mapStateToUi never leaks internal error codes (PRD 23)', () => {
  const error = L.mapStateToUi({ supported: true, found: true, usable: true, error: L.ERRORS.PIP_REJECTED });
  assert.equal(error.title, "Couldn't pin this video.");
  assert.equal(error.detail, 'Try playing the video first and try again.');
  assert.ok(!error.title.includes('pip-rejected'));
  assert.ok(!error.detail.includes('Error'));

  const unknown = L.mapStateToUi({ error: 'something-else' });
  assert.equal(unknown.title, 'Something went wrong.');

  const junk = L.mapStateToUi(null);
  assert.equal(junk.title, 'No supported video found.');
});

test('errorMessage builds a single-line toolbar hint', () => {
  assert.equal(
    L.errorMessage(L.ERRORS.UNSUPPORTED),
    "This website isn't supported yet. Currently supported: YouTube"
  );
  assert.equal(
    L.errorMessage(L.ERRORS.PIP_REJECTED),
    "Couldn't pin this video. Try playing the video first and try again."
  );

  for (const code of Object.values(L.ERRORS)) {
    const message = L.errorMessage(code);
    assert.equal(message.includes('\n'), false, code);
    assert.equal(message.includes('Error'), false, code);
    assert.ok(message.length > 0, code);
  }
});

test('classifyError maps DOMException names to friendly codes', () => {
  const cases = {
    NotAllowedError: L.ERRORS.PIP_REJECTED,
    AbortError: L.ERRORS.PIP_REJECTED,
    NotSupportedError: L.ERRORS.PIP_UNAVAILABLE,
    SecurityError: L.ERRORS.PIP_UNAVAILABLE,
    InvalidStateError: L.ERRORS.NOT_READY
  };
  for (const [name, code] of Object.entries(cases)) {
    const error = new Error('boom');
    error.name = name;
    assert.equal(L.classifyError(error), code, name);
  }
  assert.equal(L.classifyError(undefined), L.ERRORS.UNKNOWN);
  assert.equal(L.classifyError({}), L.ERRORS.UNKNOWN);
});

test('validateMessage accepts only well-formed messages (PRD 19)', () => {
  assert.equal(L.validateMessage({ type: L.MESSAGES.QUERY }), L.MESSAGES.QUERY);
  assert.equal(L.validateMessage({ type: L.MESSAGES.UNPIN }), L.MESSAGES.UNPIN);

  const state = { found: true, usable: true, pipActive: false, pipAvailable: true, reason: 'ready' };
  assert.equal(L.validateMessage({ type: L.MESSAGES.STATE_CHANGED, reason: 'pip-enter', state }), L.MESSAGES.STATE_CHANGED);
  assert.equal(L.validateMessage({ type: L.MESSAGES.RESULT, ok: true }), L.MESSAGES.RESULT);
  assert.equal(L.validateMessage({ type: L.MESSAGES.RESULT, ok: false, error: L.ERRORS.NO_VIDEO }), L.MESSAGES.RESULT);

  const rejected = [
    null,
    undefined,
    'PINFLOW_QUERY',
    [],
    {},
    { type: 'UNKNOWN_TYPE' },
    { type: 7 },
    { type: L.MESSAGES.STATE_CHANGED, reason: 'pip-enter' },
    { type: L.MESSAGES.STATE_CHANGED, state },
    { type: L.MESSAGES.RESULT, ok: 'yes' },
    { type: L.MESSAGES.RESULT, ok: false },
    { type: L.MESSAGES.RESULT, ok: true, state: 'nope' }
  ];
  for (const message of rejected) {
    assert.equal(L.validateMessage(message), null, JSON.stringify(message));
  }
});

test('user-facing terminology stays consistent (PRD 26, 33)', () => {
  const forbidden = ['Lock', 'Freeze', 'Force Top', 'Window Lock'];
  const copy = JSON.stringify(L.COPY);
  for (const word of forbidden) {
    assert.ok(!copy.includes(word), word);
  }
  assert.ok(L.COPY.PIN_ACTION.includes('Pin Video'));
  assert.ok(L.COPY.PIN_ACTION.length > 'Pin Video'.length, 'the action must carry text as well as an icon');
  assert.equal(L.COPY.UNPIN_ACTION, 'Close PiP');
});

test('permission surface stays minimal (PRD 17, AC-12)', async () => {
  const { readFile } = await import('node:fs/promises');
  const url = new URL('../application/manifest.json', import.meta.url);
  const manifest = JSON.parse(await readFile(url, 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.optional_permissions, undefined);
  assert.equal(manifest.content_scripts.length, 1);
  assert.deepEqual(manifest.content_scripts[0].matches, ['*://*.youtube.com/*', '*://youtube.com/*']);
  assert.equal(manifest.commands['pin-video'].suggested_key.default, 'Alt+P');
  assert.ok(manifest.icons['16'] && manifest.icons['128']);
});