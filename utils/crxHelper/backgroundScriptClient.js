/* global __resourceQuery */
const options = {
  protocol: 'http',
  host: 'localhost',
  port: 3000,
  path: '/ws',
};
if (__resourceQuery) {
  const querystring = require('querystring');
  const overrides = querystring.parse(__resourceQuery.slice(1));
  if (overrides.protocol) {
    options.protocol = overrides.protocol;
  }
  if (overrides.host) {
    options.host = overrides.host;
  }
  if (overrides.port) {
    options.port = overrides.port;
  }
  if (overrides.path) {
    options.path = overrides.path;
  }
}

const constants = require('./constants');

(() => {
  const source = new EventSource(`${options.protocol}://${options.host}:${options.port}${options.path}`);
  source.addEventListener('open', () => {
    console.log('[crx-helper] connected to devServer');
  });
  source.addEventListener('error', () => {
    console.error('[crx-helper] connection error');
  });
  source.addEventListener(constants.BACKGROUND_SCRIPTS_UPDATED_EVENT_NAME, () => {
    console.log('[crx-helper] background scripts are updated');
    console.log('[crx-helper] reloading extension...');
    source.close();
    setTimeout(() => {
      chrome.runtime.reload();
    }, 1000);
  });
  source.addEventListener(constants.CONTENT_SCRIPTS_UPDATED_EVENT_NAME, () => {
    console.log('[crx-helper] content scripts are updated');
    console.log('[crx-helper] sending refreshing request to content scripts...');
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { identity: constants.NAME, msg: constants.MSG_REFRESH });
      });
      console.log('[crx-helper] reloading extension...');
      source.close();
      setTimeout(() => {
        chrome.runtime.reload();
      }, 1000);
    });
  });
})();
