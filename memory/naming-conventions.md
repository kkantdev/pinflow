# Naming Conventions

Long-term project memory. Records the product/agent naming so future work does not
reinvent or accidentally break it.

---

## Names

| Role | Name | Where it appears |
| --- | --- | --- |
| Product (user-facing) | **PinFlow** | `application/manifest.json`, popup UI, toolbar tooltips, `application/README.md`, `docs/` |
| Internal engine / agent | **Nova** | `memory/` (here), `application/README.md` §7, module header comments |
| Repository / package | `pinflow` | `package.json` `name` |

### Product — PinFlow

Everything a user can see says **PinFlow** — fixed by PRD §26 (Product
Terminology) and verified project-wide.

### Internal engine — Nova

**Nova** is the internal name of the PinFlow engine: the gesture-attributed
Picture-in-Picture layer that does the real work. It is an internal identifier,
not branding — **no user-visible string may say "Nova"**.

Nova consists of two files:

```text
application/src/content/detect.js   video detection + requestPip() / exitPip()
application/src/content/pip.js      the injected payload that performs the request
```

Nova's defining constraint: `requestPictureInPicture()` requires **transient user
activation**, so it must be reached synchronously from a gesture-attributed
`chrome.scripting.executeScript()` injection — never from a message handed to an
already-running content script.

---

## Globals and message types

These follow the product name so identifiers stay greppable and consistent:

```text
Globals:        PinFlowLogic   (application/src/shared/logic.js)
                PinFlowDetect  (application/src/content/detect.js)
                PinFlowApi     (application/src/shared/api.js)
Content guard:  globalThis.__pinflowNS   (prevents duplicate registration)

Messages:       PINFLOW_QUERY | PINFLOW_UNPIN
                PINFLOW_STATE_CHANGED | PINFLOW_RESULT
```

They are renamed **atomically**. The service worker, popup, injected payload and
content script all compare against the same string literals, so a partial rename
would silently break message passing. A mismatch is caught by
`tests/inject.test.mjs`.

---

## What is deliberately *not* named after the product

These are **action** names from PRD §26, not branding. Do **not** rename them:

* `Pin Video` — the main action
* `Pinned`, `Close PiP`, `Picture-in-Picture`
* `Unsupported page`
* the command id `pin-video` and the `Alt+P` shortcut binding
* the function `pinVideo()`

Renaming any of these would break the PRD terminology contract or the stored
keyboard-shortcut binding.

---

## Change history

| Date | Change |
| --- | --- |
| 2026-09-17 | Product renamed **Pinova → PinFlow**. 134 occurrences across 16 files, done as one atomic pass (branding, identifiers, comments, docs). Internals `Pinova*` → `PinFlow*`, `PINOVA_*` → `PINFLOW_*`, npm `pinova` → `pinflow`. |
| 2026-09-17 | Internal engine named **Nova** and recorded in `application/README.md` §7, `docs/architect.md`, and the four module header comments that reference it. |
| 2026-09-17 | Repository restructured: the loadable extension moved into `application/`; docs/ and memory/ kept outside application source (`AGENTS.md` rule). |

### Verification method for such a rename

Case-preserving replacement of `pinova` → `pinflow` covers `Pinova`, `PINOVA` and
`pinova` in one pass. Afterwards: project-wide search for the old name must return
**zero**, `node --check` all JS, and `npm run build` must stay green. The manifest
needs no edit, because its internal paths are relative to the extension root.