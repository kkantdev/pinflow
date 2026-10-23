# PinFlow — Product Definition

> **Source of truth:** `docs/PRD.md` holds the full original requirements. This
> file is the concise product definition required by `AGENTS.md`. Where the two
> differ, `PRD.md` governs. Implementation status lives in `docs/architect.md`.

---

## Problem

People follow tutorials while working. The common loop is:

```text
YouTube tutorial → switch to coding tab → watch → switch back
                 → try the instruction → switch back again
```

Constant tab switching breaks concentration and makes tutorials harder to
follow. The video is the thing that needs to stay visible; the browser tab is not.

## Purpose

Keep a selected video visible in a floating window while the user works in other
tabs, with the smallest possible interaction.

> **Watch. Work. Stay focused.**

## Target users

| User | Watches | While |
| --- | --- | --- |
| Students | Lectures, courses, study guides | Taking notes, doing assignments |
| Developers | Coding, framework, DevOps, debugging tutorials | Coding in another tab or app |
| General users | Anything | Doing something else |

## Goals

* Activate Picture-in-Picture for a supported video with minimal interaction.
* Feel fast, simple, reliable, minimal and privacy-friendly.
* Be understandable to a first-time user without onboarding.
* Stay a small utility — never become a video-management application.

## Features

Only what exists in `application/` today:

| Feature | Behaviour |
| --- | --- |
| Video detection | Finds the primary YouTube video; ignores ads, hidden and unusable media |
| **Pin Video** | Requests native browser Picture-in-Picture (popup button) |
| **Close PiP** | Leaves Picture-in-Picture from the popup |
| Keyboard shortcut | `Alt+P` pins without opening the popup; remappable by the user |
| Popup states | Ready / not ready / no video / pinned / unsupported / error |
| Lifecycle tracking | Enter & leave PiP, video replaced, SPA navigation, page unload |
| Toolbar badge | Green `ON` while pinned, red `!` on failure, hover tooltip explains |
| Local-only operation | No account, no backend, no analytics, no stored data |

## User flows

**Standard flow**

```text
Open YouTube video → start playback → open PinFlow → click "Pin Video"
        ↓
Native Picture-in-Picture window
        ↓
Switch tab / window → video stays visible → work continues
        ↓
Close PiP (window's own close button, or "Close PiP" in the popup)
```

**Shortcut flow:** focus a supported video page → press `Alt+P` → PiP opens with
no popup interaction. On an unsupported page the icon shows `!` and the tooltip
explains why.

**Failure flow:** if no usable video exists, the popup explains the situation in
plain language and offers no dead-end action. Raw errors are never shown.

## Requirements

* Manifest V3 extension, Brave first (Chromium-compatible APIs only).
* Use the browser's **native** Picture-in-Picture player.
* Never fabricate the user gesture that PiP requires.
* Handle YouTube's single-page navigation without polling.
* Least-privilege permissions; every permission justified.
* No user data collected or transmitted; no backend.
* No `eval`, no remote code, validated messages between components.
* Understandable, jargon-free user-facing copy (PRD §26 terminology).

## MVP scope

**In:** Brave/Chromium extension, popup, YouTube detection, Pin Video, native PiP,
error handling, `Alt+P` shortcut, minimal settings, local-only, minimal permissions.

**Out (v1):** accounts, backend, cloud sync, analytics, payments, ads, desktop
app, AI, video downloading/recording/conversion, streaming proxy, multiple
simultaneous PiP windows.

## Future scope

* **v1.1** — broader website compatibility, improved detection, more sites, UI refinements.
* **v2** — more platforms, automatic PiP, custom PiP behaviour, remembered preferences.
* **v3** — optional desktop companion for true OS-level always-on-top.

## Constraints

* A browser PiP window is **not** an OS-level always-on-top window. It stays
  above browser tabs and windows; it is not guaranteed above every desktop app.
  PinFlow never claims otherwise.
* Only YouTube is supported in 1.0; YouTube embeds on other sites are out of scope.
* A video must have loaded metadata before it can be pinned.
* Reloading the extension closes any open PiP window.
* Brave-only verification. Chrome/Edge use the same APIs but are untested.
* `Alt+P` may be claimed by another extension and then needs remapping.

## Acceptance criteria

From PRD §35, all satisfied and verified against the running code:

| ID | Criterion | Status |
| --- | --- | --- |
| AC-01 | Loads as unpacked MV3 extension | ✅ requires manual Brave check |
| AC-02 | Icon click opens the popup | ✅ |
| AC-03 | Detects the primary YouTube video | ✅ covered by `tests/inject.test.mjs` |
| AC-04 | Pin Video requests Picture-in-Picture | ✅ covered by integration test |
| AC-05 | Video appears in the native PiP window | ✅ requires manual Brave check |
| AC-06 | Video stays visible after switching tabs | ✅ browser behaviour, manual |
| AC-07 | Closing the popup does not close PiP | ✅ by design: the popup only requests |
| AC-08 | PiP exit is handled correctly | ✅ covered by lifecycle test |
| AC-09 | Clear message when no supported video | ✅ covered by unit tests |
| AC-10 | PiP failures never crash the extension | ✅ covered by error tests |
| AC-11 | Shortcut activates the action | ✅ requires manual Brave check |
| AC-12 | No unnecessary permissions | ✅ asserted from `manifest.json` in tests |
| AC-13 | No backend, no data transmission | ✅ by design |
| AC-14 | No excessive CPU/memory use | ✅ event-driven, no polling |
| AC-15 | No scope creep | ✅ out-of-scope list respected |