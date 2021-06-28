import { devConfig } from '../config/webpack.config.dev';
import { userConfig } from '../config/user.config';
import path from 'path';
import chalk from 'chalk';
import portfinder from 'portfinder';
import webpack from 'webpack';
import express from 'express';
import cors from 'cors';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import FriendlyErrorWebpackPlugin from '@soda/friendly-errors-webpack-plugin';
import SseStream from 'ssestream';

(async () => {
    const portToUse: number = await portfinder.getPortPromise({
        port: userConfig.devServer.port,
        stopPort: userConfig.devServer.port + 10,
    });
    const contentScriptsModuleNames: string[] = Object.entries(devConfig.entry as { string: string[] })
        .filter(([entryName]) => userConfig.devServer.crxContentScriptsChunks.includes(entryName))
        .map(([, entryValue]) => entryValue)
        .concat([[]])
        .reduce((pre, cur) => pre.concat(cur));
    for (const [entryName, entryValue] of Object.entries(devConfig.entry as { [index: string]: string[] })) {
        if (userConfig.devServer.crxContentScriptsChunks.includes(entryName)) {
            entryValue.unshift(path.resolve(userConfig.projectRoot, 'build/chrome/contentScriptsClient'));
        } else if (userConfig.devServer.crxBackgroundScriptsChunks.includes(entryName)) {
            entryValue.unshift(
                `webpack-hot-middleware/client?path=http://${userConfig.devServer.host}:${portToUse}${userConfig.devServer.hmrPath}&timeout=10000&overlay=true&reload=true`,
                path.resolve(
                    userConfig.projectRoot,
                    `build/chrome/backgroundScriptsClient?path=http://${userConfig.devServer.host}:${portToUse}${userConfig.devServer.crxPath}`
                )
            );
        } else {
            entryValue.unshift(
                `webpack-hot-middleware/client?path=http://${userConfig.devServer.host}:${portToUse}${userConfig.devServer.hmrPath}&timeout=10000&overlay=true&reload=true`,
                'react-hot-loader/patch'
            );
        }
    }

    devConfig.plugins = [
        ...(devConfig.plugins || []),
        new FriendlyErrorWebpackPlugin({
            compilationSuccessInfo: {
                messages: [
                    `The development server is running at ${chalk
                        .hex(userConfig.colors.blue)
                        .underline(`http://${userConfig.devServer.host}:${portToUse}`)}.`,
                    `To terminate it, press ${chalk.hex(userConfig.colors.yellow)('Ctrl+C')}.`,
                ],
                notes: [
                    'Note that the development build is not optimized.',
                    `To create a production build, run "${chalk.hex(userConfig.colors.blue)(
                        'npm run build'
                    )}" or "${chalk.hex(userConfig.colors.blue)('yarn run build')}".`,
                ],
            },
        }),
    ];

    const app = express();
    const compiler = webpack(devConfig);

    app.use(cors());
    app.use(
        webpackDevMiddleware(compiler, {
            publicPath: '/',
            stats: devConfig.stats,
            writeToDisk: devConfig.devServer.writeToDisk,
        })
    );
    app.use(
        webpackHotMiddleware(compiler, {
            log: false,
            path: userConfig.devServer.hmrPath,
            heartbeat: 2000,
        })
    );
    app.use(userConfig.devServer.crxPath, (req, res, next) => {
        const sseStream: SseStream = new SseStream(req);
        sseStream.pipe(res);
        let closed = false;
        compiler.hooks.done.tap('auto-reload-crx-plugin', (stats) => {
            if (!closed) {
                const needReload: boolean =
                    !stats.hasErrors() &&
                    stats
                        .toJson({ all: false, modules: true })
                        .modules.some((module) => contentScriptsModuleNames.includes(module.nameForCondition));
                if (needReload) {
                    sseStream.write(
                        {
                            event: 'compiled',
                            data: {},
                        },
                        'utf-8'
                    );
                }
            }
        });
        res.on('close', () => {
            closed = true;
            sseStream.unpipe(res);
        });
        next();
    });

    const server = app.listen(portToUse, userConfig.devServer.host);
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, () => {
            server.close();
            console.log(
                `\n${chalk.hex(userConfig.colors.white).bgHex(userConfig.colors.red)(
                    ' QUIT '
                )} The development server is terminated. See you next time!`
            );
            process.exit();
        });
    });
})();
