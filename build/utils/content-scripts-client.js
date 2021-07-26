chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.identity === 'crx-auto-refresh-reload-plugin' && message.msg === 'reload') {
    console.log('[CAR] received reload request from background script');
    console.log('[CAR] reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    sendResponse({ identity: 'crx-auto-refresh-reload-plugin', msg: 'ok' });
  }
});
console.log('[CAR] connected to background');
