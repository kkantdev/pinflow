# PinFlow (browser extension)

**Watch. Work. Stay focused.**

PinFlow is a lightweight Chromium extension that keeps a tutorial video visible in
the browser's native Picture-in-Picture window while you work in other tabs. Open a
YouTube video, click **Pin Video**, switch tabs — the video keeps playing in a
floating window.

This folder is the complete, loadable extension.

---

## What PinFlow is

PinFlow uses the browser's own Picture-in-Picture player. It does **not** create
fake floating windows, inject overlays into pages, or proxy video streams. It is a
single-purpose utility: keep a video visible above browser tabs while you work.

### Scope of version 1.0

| Supported | Not supported (by design) |
|---|---|
| Brave, Chrome, Edge, or any Chromium-based browser | Firefox, Safari, mobile browsers |
| `youtube.com` (including `m.` and `music.`) | YouTube embeds on other websites |
| One video at a time | Multiple simultaneous PiP windows |
| Keyboard shortcut `Alt+P` (remappable) | Downloads, recording, conversion, accounts, cloud sync, analytics |

PinFlow requests only two permissions (`activeTab`, `scripting`), stores nothing,
and transmits nothing.

---

## How to install (unpacked)

PinFlow is loaded directly from this folder — no build step required.

1. Keep this folder somewhere permanent.
2. Open your Chromium-based browser and go to:
   ```text
   chrome://extensions
   ```
   (Brave uses `brave://extensions`.)
3. Turn on **Developer mode** (top-right corner).
4. Click **Load unpacked**.
5. Select **this `browser/` folder**.
6. PinFlow appears in the extension list. If the icon is not in the toolbar, click
   the puzzle-piece **Extensions** button and pin **PinFlow**.
7. Confirm the shortcut at `chrome://extensions/shortcuts` (or
   `brave://extensions/shortcuts`). `Pin Video` should show `Alt+P`.

> After changing any file, return to the extensions page and click **Reload** on the
> PinFlow card. Reloading closes any open PiP window.

---

## How to use

1. Open a YouTube video and start playback.
2. Click the PinFlow toolbar icon **or** press `Alt+P`.
3. Click **Pin Video** in the popup.
4. The video enters Picture-in-Picture and stays visible while you switch tabs.
5. Click **Close PiP** in the popup, or close the floating window directly.

### Popup states

| State | What you see |
|---|---|
| Video ready | ● Video detected — **Pin Video** button |
| Already floating | Video is already pinned — **Close PiP** button |
| Nothing to pin | No supported video found. |
| Still loading | The video isn't ready yet. |
| Wrong page | PinFlow doesn't support this page yet. |
| Problem | Couldn't pin this video. |

### Toolbar badge

- Green `ON` — video is floating.
- Red `!` — something went wrong; hover the icon to read why.

---

## Limitations

- A browser PiP window is **not** an OS-level always-on-top window. It stays
  above browser tabs and windows; it is not guaranteed above every desktop
  application. PinFlow never claims otherwise.
- Only YouTube is supported in 1.0.
- One video at a time.
- A video must have loaded its metadata before it can be pinned.
- Reloading the extension closes any open PiP window.
- The content script runs only on YouTube — no other site is affected.

---

## What PinFlow does **not** do

No downloads, no recording, no conversion, no accounts, no backend, no analytics,
no cloud sync, no remote code. Everything works locally once the page has loaded.
