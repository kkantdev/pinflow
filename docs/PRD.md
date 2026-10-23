# PinFlow — Product Requirements Document

**Product Name:** PinFlow
**Product Type:** Chromium Browser Extension
**Version:** 1.0 MVP
**Platform:** Chrome and Chromium-based browsers
**Primary Use Case:** Keep a selected video visible while the user works in other browser tabs.

---

# 1. Product Overview

## 1.1 What is PinFlow?

PinFlow is a lightweight browser extension that allows users to keep a video visible while switching between browser tabs.

The main use case is watching a tutorial while simultaneously performing the work demonstrated in that tutorial.

For example:

1. The user opens a YouTube coding tutorial.
2. The user starts the video.
3. The user activates PinFlow.
4. The video enters a floating Picture-in-Picture window.
5. The user switches to another tab.
6. The video remains visible while the user works.

PinFlow is designed around the idea:

> **Watch. Work. Stay focused.**

---

# 2. Problem Statement

Users frequently follow online tutorials while working.

A common workflow is:

```text
YouTube tutorial
       ↓
Switch to coding tab
       ↓
Watch tutorial
       ↓
Switch back
       ↓
Try the instruction
       ↓
Switch back again
```

This constant tab switching interrupts concentration and makes tutorials harder to follow.

PinFlow reduces this friction by allowing the user to keep the tutorial video in a floating Picture-in-Picture window.

---

# 3. Product Goal

The primary goal of PinFlow 1.0 is:

> Allow a user to activate Picture-in-Picture for a supported video with minimal interaction.

The experience should be:

* Fast
* Simple
* Reliable
* Minimal
* Privacy-friendly
* Easy for first-time users

The extension should not become a complicated video-management application.

---

# 4. Target Users

## 4.1 Students

Students watching:

* Programming tutorials
* Lecture videos
* Educational videos
* Course content
* Study guides

while taking notes or completing assignments.

## 4.2 Developers

Developers watching:

* Coding tutorials
* Documentation videos
* Debugging tutorials
* Framework tutorials
* DevOps tutorials

while coding in another browser tab or application.

## 4.3 General Users

Anyone who wants to watch a video while doing something else.

---

# 5. Primary User Story

### User Story

> As a user watching a tutorial, I want to pin the video into a floating window so that I can continue working without repeatedly switching tabs.

### Success Scenario

```text
Open video
    ↓
Play video
    ↓
Open PinFlow
    ↓
Click "Pin Video"
    ↓
Video enters Picture-in-Picture
    ↓
Switch tab
    ↓
Video remains visible
```

---

# 6. MVP Scope

The MVP should focus primarily on video Picture-in-Picture.

## Included

* Chrome/Chromium extension
* Manifest V3
* Extension popup
* Detect supported video
* YouTube support
* Pin Video action
* Browser Picture-in-Picture
* Basic error handling
* Keyboard shortcut
* Minimal settings
* Local-only operation
* No account
* No backend
* No cloud database
* Minimal permissions

## Not Included

Do NOT implement the following in version 1 unless explicitly requested:

* User accounts
* Authentication
* Backend
* Cloud synchronization
* Analytics
* Social features
* Payments
* Subscriptions
* Ads
* Desktop application
* Cross-device synchronization
* AI features
* Downloading videos
* Video recording
* Video conversion
* Video streaming proxy
* YouTube downloading
* Multiple simultaneous PiP windows

---

# 7. Important Technical Concept

PinFlow's MVP should use the browser's native Picture-in-Picture capabilities.

The extension should NOT attempt to create a fake floating browser window using unnecessary HTML overlays.

The preferred architecture is:

```text
Browser Extension
       ↓
Detect video
       ↓
Select video element
       ↓
Request Picture-in-Picture
       ↓
Browser manages floating player
```

This keeps the implementation lightweight and lets the browser handle:

* Floating window rendering
* Window movement
* Window resizing
* Playback controls
* Window lifecycle

---

# 8. Important Platform Limitation

A browser extension's Picture-in-Picture window is not equivalent to a native operating-system "Always on Top" window in every environment.

PinFlow MVP should therefore define "Always on Top" as:

> Keep the selected video visible above browser tabs/windows through browser Picture-in-Picture.

The extension should NOT claim that it can guarantee that the video remains above every desktop application.

For example:

```text
Chrome tab → PiP
Chrome tab → PiP
Google Docs → PiP
Web application → PiP
```

Future desktop functionality may provide:

```text
VS Code
Android Studio
Terminal
Chrome
        ↓
PinFlow Desktop Player
        ↓
OS-level Always on Top
```

That functionality belongs to a future version.

---

# 9. Core User Flow

## 9.1 Standard Flow

### Step 1 — User opens YouTube

User navigates to a YouTube video.

### Step 2 — User starts playback

The video should be playing or available for playback.

### Step 3 — User opens PinFlow

User clicks the PinFlow toolbar icon.

### Step 4 — PinFlow checks for a supported video

The extension checks whether the current page contains a usable video element.

### Step 5 — Pin Video

The popup displays:

```text
PinFlow

Video detected

[ 📌 Pin Video ]
```

### Step 6 — Picture-in-Picture

PinFlow requests Picture-in-Picture.

### Step 7 — User changes tab

The user can now navigate to:

* VS Code Web
* GitHub
* Google Docs
* Stack Overflow
* Documentation
* Another website

while the video remains in the floating player.

---

# 10. Extension Popup

The popup should be intentionally small and simple.

## 10.1 Default Layout

```text
┌──────────────────────────┐
│                          │
│         PINFLOW          │
│                          │
│   Keep it visible.       │
│                          │
│   ● Video detected       │
│                          │
│   ┌──────────────────┐   │
│   │   📌 Pin Video   │   │
│   └──────────────────┘   │
│                          │
│   Shortcut: Alt + P      │
│                          │
└──────────────────────────┘
```

The exact visual design can be refined during UI implementation.

---

# 11. Popup States

The popup must handle multiple states.

## 11.1 Video Detected

Display:

```text
Video detected

[ Pin Video ]
```

## 11.2 No Video Detected

Display:

```text
No supported video found.

Open a supported video and try again.
```

The button may be disabled.

## 11.3 Already in Picture-in-Picture

Display:

```text
Video is already pinned.

[ Close PiP ]
```

If browser behavior makes direct closing unavailable from the extension context, the UI should clearly communicate the state instead of pretending the action succeeded.

## 11.4 Unsupported Page

Example:

```text
PinFlow doesn't support this page yet.

Currently supported:
YouTube
```

## 11.5 Error

Example:

```text
Couldn't pin this video.

Try playing the video first and try again.
```

Avoid exposing raw technical errors to normal users.

---

# 12. YouTube Support

YouTube is the primary MVP target.

The implementation should account for YouTube's dynamic page behavior.

YouTube uses a single-page application architecture, so navigation between videos may happen without a complete page reload.

PinFlow should therefore avoid assuming that the initial page load is the only time a video can be detected.

The extension should safely handle:

* Video page navigation
* Video replacement
* Dynamic DOM changes
* Video playback state changes

Do not use aggressive polling if event-based detection or targeted observation is sufficient.

---

# 13. Video Detection

The extension should determine whether a usable HTML video element exists on the active page.

The implementation should:

1. Detect available video elements.
2. Determine whether a video is usable.
3. Prefer the relevant visible/active video.
4. Avoid selecting hidden videos.
5. Avoid creating duplicate video elements.
6. Handle pages with multiple videos gracefully.

For YouTube, prioritize the main player rather than advertisements or hidden media elements.

---

# 14. Picture-in-Picture Behavior

PinFlow should use the browser's native Picture-in-Picture API where supported.

Expected behavior:

```text
User clicks Pin Video
        ↓
Check PiP availability
        ↓
Check video element
        ↓
Request PiP
        ↓
Floating player appears
```

If the browser rejects the request, show an appropriate user-facing error.

---

# 15. PiP Lifecycle

The extension should correctly handle:

### Entering PiP

Update internal state to indicate that the video is pinned.

### Exiting PiP

Update the state when the user closes the floating player.

### Video Ends

Handle the end of the video gracefully.

### Tab Navigation

Do not leave broken state behind if the user navigates away.

### Extension Popup Closing

Closing the popup must NOT close the PiP window.

---

# 16. Keyboard Shortcut

PinFlow should support a keyboard shortcut.

Suggested default:

```text
Alt + P
```

The shortcut should:

* Activate PinFlow when possible.
* Detect the current video.
* Request Picture-in-Picture.

The implementation should allow users to modify the shortcut through the browser's extension shortcut settings where supported.

Do not hard-code a system-wide keyboard shortcut.

---

# 17. Permissions

PinFlow should follow the principle of least privilege.

Only request permissions that are technically necessary.

Avoid unnecessary permissions such as:

* Browsing history
* Tabs access when not required
* Bookmarks
* Downloads
* Cookies
* Storage if not needed
* Clipboard
* Location
* Camera
* Microphone

The agent must justify every requested permission.

---

# 18. Privacy Requirements

PinFlow should be local-first.

The MVP should not collect or transmit user data.

Do not collect:

* Browsing history
* URLs for unrelated pages
* YouTube watch history
* Account information
* Login credentials
* Cookies
* Personal information
* Video contents
* User behavior analytics

No external server should be required for the MVP.

---

# 19. Security Requirements

The extension must follow secure browser-extension practices.

Requirements:

* Use Manifest V3.
* Avoid unsafe dynamic code execution.
* Do not use `eval`.
* Do not load remote executable JavaScript.
* Avoid unnecessary third-party dependencies.
* Validate messages between extension components.
* Restrict content-script functionality to what is required.
* Do not inject scripts into unrelated pages unnecessarily.
* Do not store sensitive information.
* Do not request broad permissions without justification.

---

# 20. Architecture Direction

The agent should choose the simplest architecture that satisfies the requirements.

A possible architecture:

```text
                ┌─────────────────────┐
                │    Browser Popup    │
                │                     │
                │   Pin Video         │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Extension Logic     │
                │                     │
                │ Detect active tab   │
                │ Request PiP         │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Content Script      │
                │                     │
                │ Find video element  │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ HTMLVideoElement    │
                │                     │
                │ requestPicture...() │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Native PiP Window   │
                └─────────────────────┘
```

This is only an architectural direction.

The coding agent must inspect the current browser-extension APIs and choose the correct implementation.

---

# 21. Project Structure

The agent should create a clean structure appropriate for a Manifest V3 extension.

A possible structure:

```text
pinflow/
│
├── PRD.md
├── README.md               ← moved into application/ during restructure
│
├── src/
│   ├── popup/
│   ├── content/
│   ├── background/
│   └── shared/
│
├── assets/
│   └── icons/
│
└── tests/
```

This is not a mandatory structure.

The agent should choose the appropriate structure based on the selected implementation approach.

Do not create unnecessary directories.

---

# 22. Browser Compatibility

Primary target:

* Google Chrome
* Chromium-based browsers

Potential future support:

* Microsoft Edge
* Brave
* Opera
* Other Chromium browsers

Firefox compatibility is not an MVP requirement.

Do not add browser-specific complexity unless necessary.

---

# 23. Error Handling

The extension should handle failures gracefully.

Possible failures:

### No video

```text
No supported video found.
```

### Video not ready

```text
The video isn't ready yet.
Try playing it first.
```

### PiP unavailable

```text
Picture-in-Picture isn't available for this video.
```

### Browser rejection

```text
PinFlow couldn't open the floating player.
Please try again.
```

### Unsupported website

```text
This website isn't supported yet.
```

Never expose stack traces or raw JavaScript errors in the user interface.

---

# 24. Loading Behavior

The popup should open quickly.

Avoid:

* Large frameworks when unnecessary
* Heavy libraries
* Remote assets
* Unnecessary network requests
* Complex initialization

The extension should work without an internet connection once the user is already on a supported page, subject to the page/video itself being available.

---

# 25. UI/UX Principles

PinFlow should feel like a small utility rather than a large application.

## Design principles

### Minimal

Only show controls the user needs.

### Clear

The user should immediately understand:

> "Pin Video" means make the video float.

### Fast

The main action should require one click after opening the popup.

### Non-intrusive

Do not inject unnecessary UI into websites.

### Consistent

Use the same terminology throughout the extension.

---

# 26. Product Terminology

Use these terms consistently:

| Concept               | Preferred term     |
| --------------------- | ------------------ |
| Main action           | Pin Video          |
| Floating state        | Pinned             |
| Floating player       | Picture-in-Picture |
| Remove floating state | Unpin / Close PiP  |
| Unsupported site      | Unsupported page   |
| Main extension        | PinFlow             |

Avoid confusing terms such as:

* Lock
* Freeze
* Force Top
* Window Lock

unless needed for a future desktop version.

---

# 27. Extension Icon

The extension icon should communicate the concept of:

* Pinning
* Floating
* Staying visible
* Video

The icon should remain recognizable at small sizes.

Required sizes should follow Chrome Web Store/browser extension requirements.

The agent should prepare appropriate extension icon assets rather than using placeholder icons in the final MVP.

---

# 28. Onboarding

MVP does not require a multi-screen onboarding flow.

If onboarding is necessary, keep it extremely short.

Example:

```text
PinFlow

Keep tutorials visible while you work.

Open a video → Click PinFlow → Pin Video

[ Got it ]
```

Do not create a complex onboarding system.

---

# 29. Settings

MVP settings should be minimal.

Possible settings:

* Keyboard shortcut information
* Supported websites
* About
* Privacy information

Do not create settings for functionality that does not exist.

---

# 30. Future Roadmap

These features are intentionally excluded from MVP.

## V1.1

Potential:

* Better website compatibility
* Improved video detection
* Additional supported websites
* UI refinements

## V2

Potential:

* More video platforms
* Automatic PiP
* Custom PiP behavior
* Remember preferences

## V3

Potential desktop companion:

```text
Browser Extension
       ↕
Local Desktop App
       ↓
Native Floating Player
       ↓
OS-level Always on Top
```

This could allow:

```text
YouTube
   ↓
PinFlow
   ↓
VS Code
Android Studio
Terminal
Browser
```

with the video staying above desktop applications.

This is future scope only.

---

# 31. Explicitly Out of Scope

The agent MUST NOT implement these features unless the user explicitly requests them:

* YouTube video downloading
* Audio downloading
* Video conversion
* Video extraction
* DRM bypassing
* Streaming proxy
* YouTube API integration unless required
* User accounts
* Cloud backend
* Database
* Analytics
* Advertising
* Subscription system
* AI
* Chat
* Social sharing
* Comments
* Watch history
* Video recommendations
* Content scraping unrelated to video detection

PinFlow is a utility extension, not a video platform.

---

# 32. Performance Requirements

The extension should have minimal resource usage.

Requirements:

* Do not continuously scan the entire DOM unnecessarily.
* Avoid high-frequency polling.
* Avoid memory leaks.
* Clean up event listeners when no longer required.
* Avoid background processes that remain active unnecessarily.
* Do not run content scripts on websites where they are not required.

---

# 33. Accessibility

The popup should support basic accessibility.

Requirements:

* Buttons must have accessible labels.
* Text must have sufficient readability.
* Keyboard navigation should work.
* Focus should be visible.
* Do not rely solely on icons to communicate actions.
* Error messages should be understandable.

Example:

A pin icon alone is insufficient.

Prefer:

```text
📌 Pin Video
```

rather than:

```text
📌
```

---

# 34. Testing Requirements

Before considering the MVP complete, test at minimum:

## YouTube

* Video playing
* Video paused
* Video loading
* Video ended
* Switching tabs
* Closing PiP
* Reopening PiP
* Navigating between YouTube videos
* Refreshing the page

## Unsupported pages

* Normal webpage
* Page without video
* Page with multiple videos

## Extension

* Install unpacked extension
* Open popup
* Pin video
* Close popup
* Reload extension
* Test keyboard shortcut

## Error cases

* PiP unavailable
* Video unavailable
* No video detected
* User rapidly clicks Pin Video
* Page navigation during PiP request

---

# 35. Acceptance Criteria

The MVP is considered complete only when all of the following are satisfied.

### AC-01 — Extension Installation

The extension can be loaded successfully as an unpacked Manifest V3 extension in Chrome/Chromium.

### AC-02 — Popup

Clicking the extension icon opens the PinFlow popup.

### AC-03 — Video Detection

On a supported YouTube video page, PinFlow can detect the primary video.

### AC-04 — Pin Action

Clicking:

```text
Pin Video
```

requests Picture-in-Picture.

### AC-05 — Floating Video

The video appears in the browser's native Picture-in-Picture window.

### AC-06 — Tab Switching

The user can switch to another browser tab while the video remains visible.

### AC-07 — Popup Independence

Closing the extension popup does not close the Picture-in-Picture window.

### AC-08 — Exit Handling

When Picture-in-Picture is closed, PinFlow correctly handles the state.

### AC-09 — Unsupported Page

The extension provides a clear message when no supported video is available.

### AC-10 — Error Handling

PiP failures do not crash the extension.

### AC-11 — Shortcut

The configured keyboard shortcut can activate the PinFlow action where browser restrictions allow it.

### AC-12 — Permissions

The extension does not request unnecessary permissions.

### AC-13 — Privacy

The MVP does not require a backend or transmit user browsing/video data to a remote server.

### AC-14 — Performance

The extension does not noticeably consume excessive CPU or memory during normal use.

### AC-15 — No Scope Creep

Features outside the MVP are not implemented without explicit approval.

---

# 36. Agent Development Instructions

The coding agent must follow these rules.

## Before coding

1. Read this `PRD.md` completely.
2. Inspect the existing project.
3. Identify the existing technology and structure.
4. Check the current Chrome Manifest V3 APIs relevant to the implementation.
5. Determine the minimum required permissions.
6. Do not assume an API exists without verifying it.
7. Do not create duplicate files or duplicate functionality.

## During coding

1. Implement the smallest architecture that satisfies the PRD.
2. Keep the code modular.
3. Avoid unnecessary dependencies.
4. Do not add backend infrastructure.
5. Do not add authentication.
6. Do not add analytics.
7. Do not add features outside the MVP.
8. Handle browser API failures.
9. Keep user-facing errors understandable.
10. Follow secure browser-extension practices.

## After coding

1. Build/package the extension.
2. Verify `manifest.json`.
3. Verify permissions.
4. Test the extension in Chrome/Chromium.
5. Test YouTube video detection.
6. Test Picture-in-Picture.
7. Test tab switching.
8. Test unsupported pages.
9. Test keyboard shortcut.
10. Check browser console for errors.
11. Fix discovered issues.
12. Update `application/README.md` with installation and usage instructions.

---

# 37. Definition of Done

PinFlow 1.0 MVP is complete when a new user can perform this workflow successfully:

```text
1. Install PinFlow
        ↓
2. Open YouTube
        ↓
3. Start a tutorial
        ↓
4. Click PinFlow
        ↓
5. Click "Pin Video"
        ↓
6. Video enters Picture-in-Picture
        ↓
7. User switches to another tab
        ↓
8. Video remains visible
        ↓
9. User continues working
        ↓
10. User closes PiP when finished
```

The experience should feel immediate and uncomplicated.

---

# 38. Product Principle

PinFlow should follow one core principle:

> **Don't make the user manage the tool. Make the tool stay out of the way.**

The extension exists to remove the friction of switching between a tutorial and the user's work.

Keep the MVP focused on that single problem.
