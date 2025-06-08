# CanDoYouTube Extension

This repository contains a simple Chrome extension that lets you control video playback speed with keyboard shortcuts.

## Usage

Load the `CanDoYouTube` folder as an unpacked extension in Chrome and navigate to a supported site such as YouTube. Use the following keys:

- `a` – decrease speed by 0.25×
- `s` – increase speed by 0.25×
- `q` – reset speed to 1×
- `w` – set speed to a custom value (default 4×)
- `e` – manually trigger the currently selected Skip Ad method
- Skip Ads – on YouTube the extension automatically presses the Skip button using the chosen method whenever it appears. The ad-skipping logic now waits until a video element is present before activating so the home page no longer triggers continuous scanning.

Whenever you adjust the rate, a small overlay briefly shows the current
playback speed on the page so you can confirm the setting. Detailed debug logs
are also written to the browser console when keys are pressed or when the
extension searches for and interacts with the Skip button.

Open the extension options to configure the value for the `w` key, set how long the extension waits before speeding up ads, choose how the Skip button is pressed, and manage the list of allowed sites. Settings are stored using `chrome.storage.sync` so they persist between browser sessions.

## Files

- `manifest.json` – Chrome extension manifest
- `content.js` – content script that handles keyboard input
- `options.html` / `options.js` – simple options page
- `icons/` – extension icons in SVG format


