/* global __resourceQuery */
const options = {
  path: 'http://127.0.0.1:3000/__auto_reload_crx',
};
if (__resourceQuery) {
  const querystring = require('querystring');
  const overrides = querystring.parse(__resourceQuery.slice(1));
  if (overrides.path) {
    options.path = overrides.path;
  }
}

(() => {
  const source = new EventSource(options.path);
  source.addEventListener('open', () => {
    console.log('[CAR] connected to devServer');
  });
  source.addEventListener('error', () => {
    console.error('[CAR] connection error');
  });
  source.addEventListener('compiled-content-scripts', () => {
    console.log('[CAR] compilation of content scripts completed');
    console.log('[CAR] sending reload request to content scripts...');
    let cnt = 0;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        try {
          chrome.tabs.sendMessage(tab.id, { identity: 'crx-auto-refresh-reload-plugin', msg: 'reload' }, (response) => {
            if (response && response.identity === 'crx-auto-refresh-reload-plugin' && response.msg === 'ok') {
              cnt++;
            }
          });
        } catch {}
      });
      console.log(`[CAR] received acknowledgement from ${cnt.toString()} content scripts`);
      console.log('[CAR] reloading extension...');
      source.close();
      setTimeout(() => {
        chrome.runtime.reload();
      }, 1000);
    });
  });
  source.addEventListener('compiled-background', () => {
    console.log('[CAR] compilation of background completed');
    console.log('[CAR] reloading extension...');
    source.close();
    setTimeout(() => {
      chrome.runtime.reload();
    }, 1000);
  });
})();
