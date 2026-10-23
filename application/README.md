# PinFlow

**Watch. Work. Stay focused.**

PinFlow is a small Brave extension that keeps a tutorial video visible in the
browser's native Picture-in-Picture window while you work in other tabs. Open a
YouTube video, click **Pin Video**, switch tabs, keep watching.

---

## 1. What PinFlow does

```text
Open a YouTube video
        ↓
Start playback
        ↓
Click the PinFlow toolbar icon
        ↓
Click "Pin Video"
        ↓
Video enters Picture-in-Picture
        ↓
Switch tabs and keep working
```

PinFlow uses the browser's own Picture-in-Picture player, so the browser handles
window rendering, moving, resizing, playback controls and window lifetime. No
overlays are injected into pages, and no fake floating windows are created.

## 2. Scope of version 1.0

| Supported | Not supported (by design) |
| --- | --- |
| Brave on Windows, macOS and Linux | Firefox, Safari, mobile browsers |
| `youtube.com` (including `m.` and `music.`) | YouTube embeds hosted on other websites |
| One video at a time | Multiple simultaneous PiP windows |
| Keyboard shortcut `Alt+P` (remappable) | Downloads, recording, conversion, accounts, cloud sync, analytics |

PinFlow is deliberately a single-purpose utility. It does not download videos,
bypass DRM, proxy streams or talk to any server.

## 3. Install in Brave (unpacked)

PinFlow 1.0 is installed as an unpacked extension while it is being validated.

1. Keep this folder somewhere permanent — Brave loads it directly from disk, so
   do not delete or move it afterwards.
2. Open Brave and go to:

   ```text
   brave://extensions
   ```

3. Turn on **Developer mode** (top-right corner of the extensions page).
4. Click **Load unpacked**.
5. Select the **`application/`** folder inside this project — the folder that
   contains `manifest.json` and this `README.md`. Memory and tooling deliberately
   live outside it, so the extension stays separate from dev files.
6. PinFlow appears in the list and its icon appears in the toolbar. If you do not
   see the icon, click the puzzle-piece **Extensions** button and pin **PinFlow**.
7. Confirm the shortcut is registered at:

   ```text
   brave://extensions/shortcuts
   ```

   `Pin Video` should show `Alt+P`. If the field is empty, another extension or
   Brave itself claimed `Alt+P`; click the field and press your preferred
   combination instead.

> After changing any file in this project, return to `brave://extensions` and
> click the **Reload** button on the PinFlow card. Reloading an extension always
> closes any open Picture-in-Picture window.

### Installing in other Chromium browsers

Chrome, Edge and other Chromium browsers use the same steps with
`chrome://extensions` instead of `brave://extensions`. PinFlow is only *verified*
on Brave for version 1.0.

## 4. Using PinFlow

### The popup

Click the PinFlow icon in the toolbar. The popup always shows exactly one of
these states:

| State | What you see |
| --- | --- |
| Video ready | `● Video detected` and a **📌 Pin Video** button |
| Already floating | `Video is already pinned.` and a **Close PiP** button |
| Nothing to pin | `No supported video found.` |
| Still loading | `The video isn't ready yet.` |
| Wrong page | `PinFlow doesn't support this page yet.` |
| Problem | `Couldn't pin this video.` / `Picture-in-Picture isn't available for this video.` |

### Keyboard shortcut

Press `Alt+P` on a YouTube video page to pin the video without opening the
popup. If Brave is not focused on a supported page, the toolbar icon shows a red
`!` badge; hover it to read why.

While a video is floating, the icon shows a green `ON` badge on that tab.

### Unpinning

Either click **Close PiP** in the popup, or close the floating window using its
own close button. PinFlow updates its state either way.

## 5. Permissions and privacy

PinFlow requests the smallest set of permissions that can possibly work:

| Permission | Why it is required |
| --- | --- |
| `activeTab` | Temporary, gesture-scoped access to *the one tab you invoke PinFlow on*. Needed to read that tab's URL (to decide whether the page is supported) and to run the Pin Video payload in it. Access is revoked when you navigate away or close the tab. |
| `scripting` | Required by `chrome.scripting.executeScript()` to run the Pin Video payload. Without it no Picture-in-Picture request can be made. |

That is the entire list. PinFlow does **not** request `tabs`, `storage`,
`cookies`, `history`, `bookmarks`, `downloads`, `clipboard`, `notifications`,
`camera`, `microphone`, `location`, or any host permission. It therefore shows
no permission warning at install time.

**Privacy:** the content script runs only on `youtube.com`. PinFlow stores nothing
and transmits nothing. There is no backend, no account, no analytics and no
remote code — the only network traffic is the video you are already watching.
Everything works offline once the page itself has loaded.

**No user activation is fabricated.** The Picture-in-Picture request is made by
code injected directly in response to your click or keypress, which is exactly
how the browser expects it.

## 6. Known limitations

* A browser Picture-in-Picture window is not an operating-system-level
  "always on top" window. It stays visible above browser tabs and windows; it is
  not guaranteed to stay above every desktop application. PinFlow never claims
  otherwise.
* Only YouTube is supported in 1.0. YouTube players embedded in other websites
  are out of scope.
* A video must have loaded its metadata before it can be pinned. If you see
  *"The video isn't ready yet"*, press play once and try again.
* Reloading the extension closes any floating window.

## 7. How it works

```text
   Popup / Alt+P
        │  (user gesture)
        ▼
   chrome.scripting.executeScript()
   src/shared/logic.js
   src/content/detect.js
   src/content/pip.js   ──────►  video.requestPictureInPicture()
        │                                   │
        │                                   ▼
        │                          Native Picture-in-Picture
        │                                   │
        ▼                                   │
   chrome.runtime.onMessage  ◄──────────────┘
   (PINFLOW_RESULT / PINFLOW_STATE_CHANGED)
        │
        ▼
   Popup rendering, toolbar badge
```

> Paths in the diagram above are inside `application/`.

**Why the injection matters.** `requestPictureInPicture()` refuses to run unless
the page has *transient user activation*. Chromium grants that activation to code
injected with `executeScript()` from a user gesture, but **not** to a message
delivered to an already-running content script. Pin Video therefore always
injects the payload rather than messaging it, and `requestPip()` calls
`requestPictureInPicture()` synchronously so the request stays inside the
activation window.

**Nova — the internal engine.** PinFlow's detection and PiP request layer
(`application/src/content/detect.js` + `application/src/content/pip.js`) is named
**Nova** internally. That is an implementation name only — no user-visible string
says "Nova". See `docs/architect.md` and `memory/naming-conventions.md`.

**A quietly efficient content script.** `application/src/content/content.js` runs only on
YouTube. It answers state queries, watches the PiP lifecycle, and follows
YouTube's single-page navigation using the `yt-navigate-finish` event plus a
MutationObserver scoped to the player element (child-list only). It never polls,
and it removes all listeners on `pagehide`.

## 8. Project structure

```text
AGENTS.md                         AI agent entry point
package.json                      dev scripts (no dependencies)

application/                      ← the loadable extension.
│                                   Brave's "Load unpacked" points here.
├── README.md                     Install / usage / test checklist (this file)
├── manifest.json                 Manifest V3 definition
├── assets/icons/icon-{16,32,48,128}.png   Generated extension icons
└── src/
    ├── shared/logic.js            Pure helpers: URL scope, video scoring,
    │                              popup state mapping, error mapping,
    │                              message validation. No DOM, no chrome.*.
    ├── shared/api.js              chrome.* wrappers shared by popup + worker
    ├── background/service-worker.js   Shortcut, badge, message router
    ├── content/detect.js          YouTube video detection (DOM)   ┐ Nova —
    ├── content/pip.js             Injected Pin Video payload      ┘ the engine
    ├── content/content.js         Content script: state queries, PiP lifecycle
    └── popup/popup.html|css|js    The popup UI

docs/
├── PRD.md                        Full original requirements
├── product.md                    Product definition
├── architect.md                  Technical architecture + status
└── ui/ux.md                      UI/UX definition

memory/                           Project memory (Obsidian vault)
├── MEMORY_STRUCTURE.md           Memory rules
├── INDEX.md                      Memory index
├── naming-conventions.md         PinFlow / Nova naming rules
└── _inbox/memory.md              Temporary memory

tools/generate-icons.mjs          Icon generator (node:zlib, no dependencies)
tests/logic.test.mjs              Unit tests for shared logic
tests/inject.test.mjs             VM integration tests for the injected payload
```

## 9. Development

Requirements: Node.js 20 or newer. There are **no** runtime or build
dependencies — `npm install` is not needed.

```bash
npm test        # run the unit tests
npm run icons   # regenerate application/assets/icons/*.png
npm run build   # icons + tests
```

The tests cover URL scoping, video scoring and rejection rules, popup state
mapping, error classification, message validation, terminology and the permission
surface (the manifest itself is asserted by a test).

### Packaging for distribution

Package the **contents of `application/`**, so the archive has `manifest.json` at
its root. Do not package the project root — that would pull in `tests/`, `tools/`,
`docs/` and `memory/`.

From the project root:

```powershell
Compress-Archive -Path "application\*" -DestinationPath "pinflow-1.0.0.zip" -Force
```

### Documentation

| Question | Read |
| --- | --- |
| What is this product, for whom, and why? | `docs/product.md` (full requirements: `docs/PRD.md`) |
| How is it built, and what is the current status? | `docs/architect.md` |
| What does the UI look like and how does it behave? | `docs/ui/ux.md` |
| Agent/working rules for this repository | `AGENTS.md` |
| Naming rules (PinFlow / Nova) and rename history | `memory/naming-conventions.md` |
| Project memory map | `memory/INDEX.md` |

## 10. Manual test checklist (Brave)

Automated tests cover the pure logic; the following is verified by hand in Brave.

### YouTube
- [ ] Video playing → `Pin Video` → floating window appears
- [ ] Video paused → `Pin Video` → floating window appears
- [ ] Video still loading → popup shows *"The video isn't ready yet."*
- [ ] Video ended → `Pin Video` still works
- [ ] Switch to another tab → video stays visible
- [ ] Switch to a different Brave window → video stays visible
- [ ] Close the floating window → popup returns to `Video detected`
- [ ] Reopen PiP after closing it
- [ ] Navigate between YouTube videos without a page reload → detection still works
- [ ] Refresh the page → popup shows the correct state
- [ ] Close the popup while the video is floating → floating window stays open

### Other pages
- [ ] Normal web page (for example a news site) → *"PinFlow doesn't support this page yet."*
- [ ] `brave://extensions` → same unsupported message
- [ ] YouTube page with no player (home page) → *"No supported video found."*
- [ ] YouTube page with several videos (home/search with previews) → the main
      player is chosen, never a preview

### Extension
- [ ] Load unpacked without errors on `brave://extensions`
- [ ] No permission warning is shown for PinFlow
- [ ] Popup opens instantly and shows the live shortcut
- [ ] `Alt+P` pins the video without opening the popup
- [ ] Green `ON` badge while pinned, red `!` badge on an unsupported page
- [ ] Reload the extension, then use it again
- [ ] Service worker console and page console are free of errors

### Error cases
- [ ] Click **Pin Video** rapidly several times → only one request is made
- [ ] Navigate away while the PiP request is in flight → no crash, state recovers
- [ ] Unsupported page + `Alt+P` → friendly badge tooltip, no exception
- [ ] No raw error text, stack trace or internal error code is ever displayed

## 11. Roadmap

Deliberately out of scope for 1.0: broader site coverage, automatic PiP on tab
switch, remembered preferences, and an optional desktop companion for true
OS-level always-on-top. See `docs/PRD.md` for the full product definition.
