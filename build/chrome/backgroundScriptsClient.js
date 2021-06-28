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
        console.log('[ARC] connected');
    });
    source.addEventListener('error', () => {
        console.error('[ARC] connection error');
    });
    source.addEventListener('compiled', () => {
        console.log('[ARC] compilation completed');
        console.log('[ARC] sending reload request to content scripts...');
        let cnt = 0;
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                try {
                    chrome.tabs.sendMessage(
                        tab.id,
                        { identity: 'auto-reload-crx-plugin', msg: 'reload' },
                        (response) => {
                            if (response && response.identity === 'auto-reload-crx-plugin' && response.msg === 'ok') {
                                cnt++;
                            }
                        }
                    );
                } catch {}
            });
            console.log(`[ARC] received acknowledgement from ${cnt.toString()} content scripts`);
            console.log('[ARC] reloading extension...');
            source.close();
            setTimeout(() => {
                chrome.runtime.reload();
            }, 1000);
        });
    });
})();
