chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.identity === 'auto-reload-crx-plugin' && message.msg === 'reload') {
        console.log('[ARC] received reload request from background script');
        console.log('[ARC] reloading page...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        sendResponse({ identity: 'auto-reload-crx-plugin', msg: 'ok' });
    }
});
