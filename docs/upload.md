# Prepare PinFlow Production Browser Extension Package

Prepare the project for **public distribution as a browser extension**.

The goal is that the final `browser/` directory can be packaged into a ZIP and submitted to browser extension stores such as:

* Chrome Web Store
* Microsoft Edge Add-ons
* Other compatible Chromium-based browser extension stores

PinFlow is a Manifest V3 Chromium browser extension.

## 1. Create a dedicated production folder

Create:

```text
browser/
```

This folder must contain the complete, self-contained, production-ready extension.

The `browser/` folder must NOT depend on files outside itself at runtime.

## 2. Required root file

The following file MUST exist directly inside `browser/`:

```text
browser/manifest.json
```

Do NOT put `manifest.json` inside another nested directory.

The final package should look like:

```text
PinFlow-extension.zip
└── manifest.json
```

with the other required folders/files beside it.

## 3. Manifest

Create a valid:

```text
manifest.json
```

using:

```json
"manifest_version": 3
```

The manifest must contain all information actually required by PinFlow, including:

* Extension name: PinFlow
* Version
* Description
* Action/popup configuration
* Icons
* Required scripts
* Required permissions
* Required host permissions
* Background service worker if actually needed

Use the **minimum permissions necessary**.

Do NOT request permissions simply because they might be useful in the future.

## 4. Production folder structure

Use a clean structure similar to:

```text
browser/
├── manifest.json
│
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
│
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── content/
│   └── content.js
│
├── background/
│   └── background.js
│
└── assets/
```

However, do NOT create files that are unnecessary.

If PinFlow does not need a background service worker, do not create one.

If a content script is not required, do not create one.

The final structure must reflect the actual implementation.

## 5. Runtime independence

Everything required for PinFlow to run must exist inside `browser/`.

Do NOT reference:

```text
../src/
../packages/
../node_modules/
../../
```

or any other development-only location.

The production extension must work when the `browser/` folder is copied to another computer.

## 6. No development files

Do NOT include these in the production browser package unless a store specifically requires them:

```text
PRD.md
TRD.md
UI-UX.md
AGENTS.md
agent.md
.git/
.github/
node_modules/
tests/
development scripts
local configuration
.env
.env.*
private keys
API keys
credentials
```

Keep development documentation outside the `browser/` release folder.

## 7. Icons

Create valid extension icons:

```text
icons/
├── icon16.png
├── icon32.png
├── icon48.png
└── icon128.png
```

Every icon referenced by `manifest.json` must actually exist.

Do not reference nonexistent files.

Use the final PinFlow branding.

## 8. Popup

The popup must be production-ready.

It should provide the main PinFlow action:

```text
Pin Video
```

It should correctly handle:

* Supported YouTube video detected
* No video detected
* Unsupported page
* Video already in Picture-in-Picture
* Picture-in-Picture failure
* Other expected browser errors

Do not leave placeholder buttons or unfinished UI.

## 9. YouTube functionality

The production extension must include everything required for PinFlow's current MVP:

1. Detect the relevant YouTube video.
2. Identify the correct video element.
3. Request native Picture-in-Picture.
4. Handle PiP success.
5. Handle PiP failure.
6. Handle YouTube's dynamic navigation.
7. Handle video changes.
8. Handle unsupported pages.
9. Avoid unnecessary DOM polling.
10. Avoid interfering with unrelated YouTube functionality.

Do NOT add:

* YouTube downloading
* Video extraction
* Audio downloading
* Video conversion
* DRM bypassing
* Streaming proxy functionality

## 10. Keyboard shortcut

If PinFlow implements a keyboard shortcut, ensure it is correctly declared in the Manifest V3 configuration and actually works.

Do not create a fake shortcut that is not connected to the extension functionality.

## 11. Permissions

Audit every permission in `manifest.json`.

For each permission, ask:

> Is this permission required for PinFlow's current functionality?

If not, remove it.

Do not request:

* Browsing history
* Bookmarks
* Cookies
* Downloads
* Location
* Camera
* Microphone
* Tabs
* Broad host permissions

unless the actual implementation demonstrably requires them.

## 12. Security

Before release:

* Remove development secrets.
* Do not include API keys.
* Do not include passwords.
* Do not include `.env` files.
* Do not use `eval`.
* Do not load remote executable JavaScript.
* Avoid unnecessary external dependencies.
* Validate extension messaging.
* Follow Manifest V3 security requirements.

## 13. Privacy

PinFlow should remain local-first.

The production package must not contain functionality that secretly collects:

* Browsing history
* YouTube watch history
* Personal information
* Credentials
* Cookies
* Video contents

Do not add analytics or tracking unless explicitly requested.

## 14. Store-ready metadata

Ensure the manifest contains accurate production information:

```text
name
version
description
icons
action
permissions
host_permissions
```

The description must accurately describe PinFlow.

Do not make unsupported claims such as:

> "Works above every Windows application"

if the implementation only provides browser Picture-in-Picture.

Describe the current capability accurately.

## 15. Build/package requirement

If the project uses TypeScript, React, Vite, Webpack, or another build system:

1. Build the extension.
2. Place the final runtime files into `browser/`.
3. Ensure the files inside `browser/` are the actual production files.
4. Do not require the store or browser to run a build command.

The browser/store package must contain already-built runtime files.

## 16. Final validation

Before declaring the package complete, perform all of these checks:

### Manifest

* `manifest.json` exists.
* Valid JSON.
* Manifest V3.
* Correct name: PinFlow.
* Correct version.
* Correct description.
* Correct popup paths.
* Correct script paths.
* Correct icon paths.
* Correct permissions.

### Files

For every file referenced by `manifest.json`:

```text
VERIFY FILE EXISTS
```

For every icon:

```text
VERIFY ICON EXISTS
```

For every script:

```text
VERIFY SCRIPT EXISTS
```

For every HTML page:

```text
VERIFY PAGE EXISTS
```

### Runtime

Verify:

* PinFlow loads successfully.
* Popup opens.
* YouTube video is detected.
* Pin Video works.
* Picture-in-Picture opens.
* Switching tabs works.
* Closing PiP works.
* Unsupported pages are handled.
* Errors are handled.
* Keyboard shortcut works if implemented.

## 17. Test the release folder independently

Do not test only from the development environment.

Test the actual:

```text
browser/
```

folder.

Load it as an unpacked extension in a Chromium browser.

The browser must be able to load it without requiring files from the parent project.

## 18. Create a release ZIP

After validation, create:

```text
dist/
└── PinFlow-v1.0.0.zip
```

The ZIP must contain the contents of `browser/` directly.

Correct:

```text
PinFlow-v1.0.0.zip
├── manifest.json
├── icons/
├── popup/
├── content/
└── background/
```

Avoid creating an unnecessary extra nesting level such as:

```text
PinFlow-v1.0.0.zip
└── browser/
    ├── manifest.json
```

unless the target store specifically requires that structure.

## 19. Important separation

Keep:

```text
Project documentation
Development source
Tests
Agent files
```

outside the production browser package.

Use:

```text
browser/
```

for the final runtime extension.

Use:

```text
dist/
```

for release ZIP files.

Example:

```text
PinFlow/
│
├── PRD.md
├── TRD.md
├── README.md
├── src/
├── tests/
│
├── browser/
│   ├── manifest.json
│   ├── popup/
│   ├── content/
│   ├── background/
│   ├── icons/
│   └── assets/
│
└── dist/
    └── PinFlow-v1.0.0.zip
```

## 20. Final instruction

Do not stop after creating the folders.

Actually inspect the implementation, determine which files are required, build the production extension, validate the manifest and all referenced files, test the actual `browser/` folder, and create the final ZIP.

The final result must be a **self-contained, production-ready PinFlow Chromium extension package suitable for submission to public browser extension stores**.

Do not modify unrelated application functionality.
