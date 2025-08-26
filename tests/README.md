Run Playwright smoke test for the extension

1. From repository root install Playwright:
   npm install --save-dev playwright

   (Playwright will download browser binaries. If you prefer only Chromium:
   npm i -D playwright-chromium )

2. Run the test:
   node tests/playwright-smoke.js

Notes:
- The script launches a visible Chromium profile in ./tests/.tmp-profile.
- It requires a valid extension in src/ (the extension in this repo).
- The script finds the extension id via CDP, opens popup.html and clicks the ADD button.
- If the extension uses chrome.storage.sync, items will be saved in the launched profile.
