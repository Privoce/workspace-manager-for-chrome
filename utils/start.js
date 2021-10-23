// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

const path = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const portfinder = require('portfinder');
const express = require('express');
const cors = require('cors');
const SseStream = require('ssestream');
const env = require('./env');
const config = require('../webpack.config');
const crxHelperConstants = require('./crxHelper/constants');

(async () => {
  const options = config.boilerplateConfig || {};
  delete config.boilerplateConfig;

  const entriesNotToHotReload = options.notHotReload || [];
  const entriesOfBackgroundScripts = options.backgroundScripts || [];
  const entriesOfContentScripts = options.contentScrips || [];

  let crxHelperApp, crxHelperPort;
  const needCrxHelper = entriesOfBackgroundScripts.length !== 0 || entriesOfContentScripts.length !== 0;
  if (needCrxHelper) {
    crxHelperPort = await portfinder.getPortPromise();
  }

  for (let entryName in config.entry) {
    if (!entriesNotToHotReload.includes(entryName)) {
      config.entry[entryName] = [
        `webpack-dev-server/client?hostname=${env.HOST}&port=${env.PORT}&hot=true`,
        "webpack/hot/dev-server",
        path.resolve(__dirname, "reactRefresh/client/ErrorOverlayEntry.js?sockHost=localhost&sockPort=3000")
      ].concat(config.entry[entryName]);
    }
    if (entriesOfBackgroundScripts.includes(entryName)) {
      config.entry[entryName] = [
        path.resolve(__dirname, `crxHelper/backgroundScriptClient.js?host=${env.HOST}&port=${crxHelperPort}&path=${crxHelperConstants.PATH}`)
      ].concat(config.entry[entryName]);
    }
    if (entriesOfContentScripts.includes(entryName)) {
      config.entry[entryName] = [
        path.resolve(__dirname, "crxHelper/contentScriptClient.js")
      ].concat(config.entry[entryName]);
    }
  }

  config.plugins = config.plugins.concat([
    new webpack.ProvidePlugin({
      __react_refresh_error_overlay_alt__: require.resolve("@pmmmwh/react-refresh-webpack-plugin/overlay"),
      __react_refresh_socket_alt__: require.resolve("@pmmmwh/react-refresh-webpack-plugin/sockets/WDSSocket")
    })
  ]);

  const compiler = webpack(config);
  if (needCrxHelper) {
    crxHelperApp = express();
  }

  const server = new WebpackDevServer({
    hot: false,
    liveReload: false,
    client: false,
    static: path.resolve(__dirname, "../build"),
    devMiddleware: {
      writeToDisk: true
    },
    host: env.HOST,
    port: env.PORT,
    onAfterSetupMiddleware: (devServer) => {
      if (!needCrxHelper) {
        return;
      }
      crxHelperApp.use(cors());
      crxHelperApp.use(crxHelperConstants.PATH, (req, res) => {
        const sseStream = new SseStream(req);
        sseStream.pipe(res);
        let closed = false;
        devServer.compiler.hooks.done.tap(crxHelperConstants.NAME, (stats) => {
          if (!closed) {
            const compiledNames = stats
              .toJson({ all: false, modules: true })
              .modules
              .filter(i => i.name !== undefined)
              .map(i => i.name);
            const compiledChunks = stats
              .toJson()
              .modules
              .filter(i => compiledNames.includes(i.name))
              .map(i => i.chunks)
              .reduce((previousValue, currentValue) => previousValue.concat(currentValue), []);
            const isBackgroundScriptsUpdated = !stats.hasErrors() && compiledChunks.some((chunk) => entriesOfBackgroundScripts.includes(chunk));
            const isContentScriptsUpdated = !stats.hasErrors() && compiledChunks.some((chunk) => entriesOfContentScripts.includes(chunk));
            if (isBackgroundScriptsUpdated) {
              sseStream.write({
                event: crxHelperConstants.BACKGROUND_SCRIPTS_UPDATED_EVENT_NAME,
                data: {}
              }, "utf-8");
            } else if (isContentScriptsUpdated) {
              sseStream.write({
                event: crxHelperConstants.CONTENT_SCRIPTS_UPDATED_EVENT_NAME,
                data: {}
              }, "utf-8");
            }
          }
        });
        res.on("close", () => {
          closed = true;
          sseStream.unpipe(res);
        });
      });
    }
  }, compiler);

  await server.start();
  if (needCrxHelper) {
    crxHelperApp.listen(crxHelperPort);
  }
  ["SIGINT", "SIGTERM", "SIGQUIT"].forEach(signal => process.on(signal, () => {
    compiler.close(() => {});
    process.exit();
  }));
})();
