# CanDoYouTube Extension

This repository contains a simple Chrome extension that lets you control video playback speed with keyboard shortcuts.

## Usage

Load the `CanDoYouTube` folder as an unpacked extension in Chrome and navigate to a supported site such as YouTube. Use the following keys:

- `a` – decrease speed by 0.25×
- `s` – increase speed by 0.25×
- `q` – reset speed to 1×
- `w` – set speed to a custom value (default 4×)
- `e` – skip ads when the Skip button is available
- Skip Ads – on YouTube the extension automatically clicks the "Skip" button whenever it appears and listens for new variations of the button

Whenever you adjust the rate, a small overlay briefly shows the current
playback speed on the page so you can confirm the setting. Debug logs are
also written to the browser console when keys are pressed.

Open the extension options to configure the value for the `w` key, set how long the extension waits before speeding up ads, and manage the list of allowed sites. Settings are stored using `chrome.storage.sync` so they persist between browser sessions.

## Files

- `manifest.json` – Chrome extension manifest
- `content.js` – content script that handles keyboard input
- `options.html` / `options.js` – simple options page
- `icons/` – extension icons in SVG format


