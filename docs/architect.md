# PinFlow — Technical Architecture

Based on the **actual codebase** in `application/`, not on intentions.

---

## Tech stack

| Area | Choice | Why |
| --- | --- | --- |
| Platform | Brave / Chromium, **Manifest V3** | PRD §6, §22 |
| Language | Plain ES2020+ JavaScript | No build step, no transpiler |
| UI | Hand-written HTML + CSS custom properties | Instant popup, no framework |
| Runtime deps | **None** | PRD §3, §24 |
| Dev deps | **None** | `node:test`, `node:zlib` are built in |
| Tests | `node:test` + `node:assert/strict` | Zero-install, fast |
| Icons | Generated PNGs via `node:zlib` | No binary assets committed by hand |

## Project structure

Documentation and memory are kept outside application source (`AGENTS.md` rule).

```text
open application/                    project root
├── AGENTS.md                        AI agent entry point
├── package.json                     dev scripts only (no dependencies)
│
├── application/                     ← the loadable extension (this is what
│   │                                  Brave's "Load unpacked" points at)
│   ├── README.md                    install / usage / test checklist
│   ├── manifest.json
│   ├── src/
│   │   ├── background/service-worker.js
│   │   ├── popup/popup.html | popup.css | popup.js
│   │   ├── content/detect.js | content.js | pip.js
│   │   └── shared/logic.js | api.js
│   └── assets/icons/icon-{16,32,48,128}.png
│
├── docs/
│   ├── PRD.md                       original full requirements (source of truth)
│   ├── product.md                   product definition
│   ├── architect.md                 this file
│   └── ui/ux.md                     UI/UX definition
│
├── memory/                          project memory (Obsidian vault)
│   ├── MEMORY_STRUCTURE.md          memory rules (source of truth for memory)
│   ├── INDEX.md                     memory index
│   ├── naming-conventions.md        PinFlow / Nova naming rules
│   └── _inbox/memory.md             temporary memory inbox
│
├── tests/
│   ├── logic.test.mjs               unit tests for shared logic
│   └── inject.test.mjs              VM integration tests for injected code
└── tools/generate-icons.mjs         icon generator
```

## Architecture

Three extension contexts plus the page:

```text
   Popup (popup.js)  ─
                      ├─ user gesture ──► chrome.scripting.executeScript()
   Service worker    ─┘                        │  files: logic.js, detect.js, pip.js
   (service-worker.js)                         ▼
                                          video.requestPictureInPicture()
                                               │
                                               ▼
                                    Native Picture-in-Picture window
                                               │
   chrome.runtime.onMessage  ◄─────────────────┘  PINFLOW_RESULT
   (popup + service worker)
                                               │
   Content script (content.js) ── PINFLOW_STATE_CHANGED, PINFLOW_QUERY, PINFLOW_UNPIN
```

**The central constraint.** `requestPictureInPicture()` requires *transient user
activation*. Chromium grants that to code injected via `executeScript()` from a
user gesture, but **not** to a message delivered to an already-running content
script. So the Pin action always **injects** `pip.js` rather than messaging it,
and `detect.js#requestPip()` calls `requestPictureInPicture()` **synchronously**
so the request stays inside the activation window.

## Modules/components

Paths below are **extension-relative** (i.e. inside `application/`), matching how
`manifest.json` refers to them.

| File | Role | World |
| --- | --- | --- |
| `src/shared/logic.js` | Pure helpers: URL scope, video scoring, popup state mapping, error mapping, message validation. No DOM, no `chrome.*` | All |
| `src/shared/api.js` | `chrome.*` wrappers: tab lookup, injection file lists, `queryState`, `pinVideo`, `unpinVideo`, `getShortcut`, `classifyTab` | Popup + worker |
| `src/background/service-worker.js` | `commands.onCommand` (`Alt+P`), badge/tooltip, message router, `tabs.onUpdated` reset | Worker |
| `src/content/detect.js` | DOM video detection + `requestPip()` / `exitPip()` / `state()` | Page |
| `src/content/content.js` | State queries, PiP lifecycle listeners, YouTube SPA navigation, idempotent install | Page |
| `src/content/pip.js` | The injected Pin Video payload; reports outcome via `sendMessage` | Page |
| `src/popup/popup.{html,css,js}` | The five-state popup UI and the two actions | Popup |
| `tools/generate-icons.mjs` | Draws and encodes the PNG icon set | Node |
| `tests/*.test.mjs` | Unit + VM integration tests | Node |

### Internal engine name — Nova

**Nova** is the internal name of the gesture-attributed Picture-in-Picture engine
(`detect.js` + `pip.js`). It is an implementation name only: **no user-visible
string may say "Nova"**. Nova's globals and the shared message types follow the
product name so identifiers stay greppable:

```text
Globals:        PinFlowLogic   (shared/logic.js)
                PinFlowDetect  (content/detect.js)
                PinFlowApi     (shared/api.js)
Content guard:  globalThis.__pinflowNS   ← prevents duplicate registration

Messages:       PINFLOW_QUERY | PINFLOW_UNPIN
                PINFLOW_STATE_CHANGED | PINFLOW_RESULT
```

These are renamed **atomically**. The worker, popup, injected payload and content
script all compare against the same string literals, so a partial rename would
silently break message passing — `tests/inject.test.mjs` catches that.

**Deliberately not named after the product** (PRD §26 *action* names; renaming
would break the terminology contract or the stored shortcut binding): `Pin Video`,
`Pinned`, `Close PiP`, `Picture-in-Picture`, `Unsupported page`, the command id
`pin-video`, and the function `pinVideo()`.

---

## Data flow

**Pin Video (popup button)**

```text
click → runAction() → Api.pinVideo(tabId)
      → executeScript(files: logic.js, detect.js, pip.js)   ← global gesture
      → pip.js → detect.requestPip() → video.requestPictureInPicture()
      → resolve → sendMessage({ type: PINFLOW_RESULT, ok: true, state })
      → popup renders "pinned"; worker sets badge ON
```

**Pin Video (`Alt+P`)**

```text
onCommand("pin-video") → Api.activeTab() → Api.classifyTab()
      → supported  → Api.pinVideo(tabId)   (same path as above)
      → unsupported → badge "!" + tooltip (surfaced without a notifications permission)
```

**Popup open**

```text
refresh() → activeTab() → classifyTab()      (is this a supported URL?)
          → queryState(tabId) → tabs.sendMessage(PINFLOW_QUERY)
              ↳ on failure: ensureContentScript() then retry
          → mapStateToUi() → render
```

**Lifecycle**

```text
video "enterpictureinpicture" → content.js → PINFLOW_STATE_CHANGED → badge ON / popup refresh
video "leavepictureinpicture" → content.js → PINFLOW_STATE_CHANGED → badge cleared
```

## Database/models

**None.** No database, no persistence layer, no schema. This is deliberate: PRD
§18 (no data collection) and §31 (no backend/database).

The only "models" are in-memory message shapes, validated by
`logic.js#validateMessage()`:

```text
PINFLOW_QUERY          { type }
PINFLOW_UNPIN          { type }
PINFLOW_STATE_CHANGED  { type, reason: string, state: object }
PINFLOW_RESULT         { type, ok: boolean, error?: string, state?: object }

state = { found, usable, pipActive, pipAvailable, reason }
```

## APIs

Only browser APIs, no network APIs:

| API | Permission | Used for |
| --- | --- | --- |
| `chrome.tabs.query` | `activeTab` | Find the active tab |
| `chrome.tabs.sendMessage` | `activeTab` | Query state / leave PiP |
| `chrome.scripting.executeScript` | `scripting` + `activeTab` | Inject Nova and the content script |
| `chrome.commands.getAll` | none | Show the live shortcut in the popup |
| `chrome.commands.onCommand` | none | `Alt+P` entry point |
| `chrome.runtime.onMessage` / `sendMessage` | none | Component messaging |
| `chrome.action.setBadgeText` / `setTitle` / `setBadgeBackgroundColor` | none | Toolbar feedback |
| `chrome.tabs.onUpdated` | `activeTab` | Clear stale badge on navigation |

Web platform APIs: `HTMLVideoElement.requestPictureInPicture()`,
`document.exitPictureInPicture()`, `document.pictureInPictureElement`,
`document.pictureInPictureEnabled`, `MutationObserver`, `getBoundingClientRect`,
`getComputedStyle`.

## Authentication

**None.** No accounts, no login, no tokens, no user identity (PRD §6, §18).

## State management

No store, no framework. State is **derived on demand** from the DOM:

* `document.pictureInPictureElement` is the single source of truth for "pinned".
* `detect.js#inspect()` recomputes `{ found, usable, pipActive, pipAvailable, reason }`.
* The popup holds only two local variables: the active tab and a `busy` flag.
* The worker keeps no state — it reacts to messages and sets the badge.
* A `2.5s` timer in the popup is the only timeout, ending a stuck busy state.

This avoids the classic bug of cached state drifting from reality, and is why
`content.js` installs exactly once via the `__pinflowNS` guard.

## Storage

**None.** No `chrome.storage`, no cookies, no localStorage, no cache. Nothing is
written to disk. Consequence: preferences are not remembered between sessions —
which is acceptable because there is only one setting (the shortcut), and that is
owned by the browser.

## External services

**None.** No backend, no CDN, no remote fonts, no analytics endpoint. The only
network traffic is the video the user is already watching. PinFlow works offline
once the page itself has loaded (PRD §24).

---

## Security

Per PRD §19:

* Manifest V3 only.
* **No `eval`, no `new Function`, no dynamic code execution** anywhere in `application/`.
* **No remote executable code** — every script is a local file declared in the manifest.
* Remote assets are not used at all (no remote fonts or images), so
  `web_accessible_resources` is not needed and is not declared.
* **Least privilege:** exactly two permissions, both justified.
* Messages are validated with `validateMessage()` before acting; unknown or
  malformed types are ignored (asserted by tests).
* The content script runs **only** on `youtube.com` — never on other sites.
* The content script tolerates re-injection: the `__pinflowNS` guard means a
  second injection cannot double-register listeners or duplicate reports.
* No sensitive data is stored, because nothing is stored at all.
* DOM work is wrapped in `try/catch`; hostile or detached pages degrade to a
  friendly error instead of throwing.
* User-facing copy never exposes stack traces, `DOMException` names or internal codes.

### Permission justification (PRD §17)

| Permission | Justification |
| --- | --- |
| `activeTab` | Temporary, gesture-scoped access to **only** the tab the user invoked PinFlow on. Needed to read that tab's URL (supported-page check) and to run the payload there. Revoked on navigation or tab close. Adds **no install warning**. |
| `scripting` | Required by `chrome.scripting.executeScript()` to inject the Pin Video payload. Without it, no PiP request can be made. |

Not requested: `tabs`, `storage`, `cookies`, `history`, `bookmarks`, `downloads`,
`clipboard`, `notifications`, `camera`, `microphone`, `location`, host
permissions, `optional_permissions`. A test asserts this from
`application/manifest.json`, so any future expansion fails the suite.

## Dependencies

**Zero runtime and zero development dependencies.** `npm install` is not required.

| Instead of… | PinFlow uses |
| --- | --- |
| Jest / Mocha | `node:test` + `node:assert/strict` (built in) |
| Canvas / sharp / a PNG encoder | A hand-written PNG encoder over `node:zlib` |
| React / Vue | Hand-written DOM code (the popup is one screen) |
| Bundler | Plain scripts loaded directly by the manifest |

This satisfies PRD §24 (no heavy libraries) and §19 (minimal third-party surface).

## Build/deployment

There is no compile step. `application/` is the loadable, shippable extension.

```bash
npm test        # node --test "tests/**/*.test.mjs"   → 27 tests
npm run icons   # regenerate application/assets/icons/*.png
npm run build   # icons then tests
```

**Install:** `brave://extensions` → Developer mode → **Load unpacked** → select
the **`application/`** folder (the folder containing `manifest.json`).

**Package:** zip the *contents* of `application/` so `manifest.json` sits at the
archive root. Do **not** package the repo root, which would pull in `tests/`,
`tools/`, `docs/` and `memory/`.

---

## Technical decisions

| Decision | Rationale |
| --- | --- |
| **Inject for Pin, message for Query** | `requestPictureInPicture()` needs transient user activation, which only a gesture-attributed injection provides. A message to a live content script does not carry it. This is the load-bearing decision of the entire design. |
| Native PiP, no HTML overlay | The browser handles rendering, moving, resizing, controls and lifecycle. PRD §7 explicitly forbids faking a floating window. |
| Synchronous `requestPip()` | Any `await` before the call risks falling outside the activation window. |
| Two injection file lists (`PIN_FILES`, `ENSURE_FILES`) | Keeps the persistent content script out of the Pin path and keeps the gesture payload minimal. |
| One shared `detect.js` for both paths | The popup and the injected payload can never disagree about which video is "the video". |
| `activeTab` instead of host permissions | Same capability, scoped to user gestures, and produces no install warning. |
| `commands` API for `Alt+P` | User-remappable at `brave://extensions/shortcuts`; no hard-coded global hotkey. |
| SPA handling via events, not polling | `yt-navigate-finish` plus a **childList-only** MutationObserver on the player. Ignoring attributes prevents a callback storm from playback progress (PRD §32). |
| Video scoring as pure functions | Detection rules are unit-testable without a DOM; the DOM layer only produces plain descriptors. |
| Ad containers skipped only for *non-main* videos | On YouTube the ad shares the main player element, so rejecting it wholesale would break normal playback. |
| Badge instead of notifications | Gives failure feedback without requesting the `notifications` permission. |
| `logic.js` as a UMD-style global | One file loads in the worker (`importScripts`), the popup, the content script, the injected payload **and** Node tests — one implementation, five consumers. |
| Split `detect.js` from `content.js` | The injected payload needs detection but must stay tiny and synchronous. |
| Restructure into `application/` | Keeps the shippable extension separate from docs, memory, tests and tooling (AGENTS.md), so packaging cannot include dev files. |
| Hand-written PNG encoder | Avoids a native image dependency purely to produce four icons. |

## Development progress

### Completed tasks

* Repository structure per `AGENTS.md`: `application/` (the extension), plus `docs/`, `memory/`, `tests/`, `tools/` at the root.
* `application/manifest.json` — MV3, two permissions, one command, one content-script scope.
* `src/shared/logic.js` — URL scope, video scoring (`scoreVideo`, `scoreVideoLoose`), `pickBestVideo`, `mapStateToUi`, `errorUi`, `errorMessage`, `classifyError`, `validateMessage`.
* `src/shared/api.js` — tab lookup, injection lists, `queryState`, `pinVideo`, `unpinVideo`, `getShortcut`, `classifyTab`.
* `src/content/detect.js` — visibility/main-player/ad/disabled filtering, `inspect`, `state`, `requestPip`, `exitPip`.
* `src/content/content.js` — QUERY/UNPIN handlers, enter/leave PiP listeners, SPA navigation, idempotent install, `pagehide` teardown.
* `src/content/pip.js` — synchronous PiP request, `PINFLOW_RESULT` reporting, never throws.
* `src/background/service-worker.js` — `Alt+P`, badge/tooltip states, message routing, stale-badge reset.
* `src/popup/*` — every state, one action, live shortcut readout, dark mode, accessibility.
* `application/assets/icons/*` — generated 16/32/48/128 PNGs, validated by decoding them.
* `tests/logic.test.mjs` + `tests/inject.test.mjs` — 27 tests, all passing.
* `tools/generate-icons.mjs` — dependency-free PNG encoder plus artwork.
* `application/README.md`, `docs/PRD.md`, `docs/product.md`, `docs/architect.md`, `docs/ui/ux.md`.
* Product renamed **Pinova → PinFlow**; internals renamed to `PinFlow*` / `PINFLOW_*`.
* Naming conventions and preserved-terminology rules recorded in `memory/`.

### In-progress tasks

**None.** The tree is internally consistent and green (`npm run build`).

### Planned/future technical tasks

* **Manual verification in Brave** (`application/README.md` §10) — the gesture-activation path
  is verified by design and by the VM harness, but has not yet been exercised
  against a real browser, because none is available in the build environment.
* First git commit — the repository has no commits yet.
* Optional: re-brand the icon artwork (currently a text-free pin + play glyph, so
  it remains valid after the rename).
* v1.1+ work per `docs/product.md` → "Future scope".

---

## Known limitations/technical debt

| Item | Impact | Notes |
| --- | --- | --- |
| PiP path not yet exercised in a real Brave instance | Verified by design + VM harness only | Highest-risk item in the project |
| Browser PiP ≠ OS always-on-top | Not guaranteed above every desktop app | PRD §8; documented in `application/README.md` §6, never claimed otherwise |
| YouTube-only support | No other sites in 1.0 | Deliberate scope decision; YouTube embeds elsewhere unsupported |
| One video at a time | No simultaneous PiP windows | PRD §6 |
| Selectors depend on YouTube's DOM | Could break if YouTube redesigns | Mitigated by scoring + visibility rules rather than one rigid selector |
| No persisted preferences | Settings reset between sessions | Nothing to persist yet; would require the `storage` permission |
| `Alt+P` can be claimed by another extension | Shortcut may need remapping | Detected via `commands.getAll()`; the popup shows the live value |
| No TypeScript, no lint config | Type errors surface only at runtime | Intentional to stay dependency-free; tests cover the pure logic |
| Chrome/Edge unverified | Only Brave is confirmed | Same APIs; documented as unverified rather than claimed as working |
| Test path strings are relative to the repo root | Moving `application/` again requires updating `tests/` and `tools/` | Four paths; the suite fails loudly if they drift |

## Current version/status

| Field | Value |
| --- | --- |
| Version | `1.0.0` (`manifest.json` + `package.json`) |
| Manifest | V3 |
| Product name | PinFlow |
| Internal engine | Nova |
| Package name | `pinflow` |
| Permissions | `activeTab`, `scripting` |
| Host permissions | none |
| Runtime dependencies | none |
| Test status | **27/27 passing** |
| Build | `npm run build` green |
| Extension entry point | `application/` |
| Documentation | `docs/PRD.md`, `product.md`, `architect.md`, `ui/ux.md` |
| Git | repository initialised, **no commits yet** |
| Status | MVP feature-complete; pending manual verification in Brave |