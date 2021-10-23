const constants = require('./constants');

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.identity === constants.NAME && message.msg === constants.MSG_REFRESH) {
    console.log('[crx-helper] received refresh request from background scripts');
    console.log('[crx-helper] reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
});
console.log('[crx-helper] registered message listener for background scripts');
