const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const extensionPath = path.resolve(__dirname, '..', 'src');
    const userDataDir = path.resolve(__dirname, '.tmp-profile');

    console.log('Launching Chromium with extension:', extensionPath);
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
        ],
    });

    try {
        const page = context.pages()[0] || await context.newPage();
        // Use CDP to list targets and find the extension target URL (service_worker/background)
        const client = await context.newCDPSession(page);
        const { targetInfos } = await client.send('Target.getTargets');
        const extTarget = targetInfos.find(t => t.url && t.url.startsWith('chrome-extension://'));
        if (!extTarget) {
            console.error('Could not find extension target. Make sure the src folder is a valid extension.');
            await context.close();
            process.exit(1);
        }

        const match = extTarget.url.match(/^chrome-extension:\/\/([a-p0-9]+)\//i);
        if (!match) {
            console.error('Could not parse extension id from target url:', extTarget.url);
            await context.close();
            process.exit(1);
        }
        const extensionId = match[1];
        console.log('Found extension id:', extensionId);

        const popup = await context.newPage();
        const popupUrl = `chrome-extension://${extensionId}/popup.html`;
        console.log('Opening popup:', popupUrl);
        await popup.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

        // Wait for UI and click ADD
        await popup.waitForSelector('#addBtn', { timeout: 5000 });
        await popup.click('#addBtn');
        // Wait for list item to appear
        await popup.waitForSelector('#links li', { timeout: 5000 });

        const count = await popup.$$eval('#links li', els => els.length);
        console.log('Popup list item count after ADD:', count);

        // Clean up and exit
        await context.close();
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        await context.close();
        process.exit(1);
    }
})();
