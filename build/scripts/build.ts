import { prodConfig } from '../config/webpack.config.prod';
import { userConfig } from '../config/user.config';
import webpack from 'webpack';
import chalk from 'chalk';
import portfinder from 'portfinder';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

(async () => {
    let portToUse: number;
    if (userConfig.bundleAnalyzer.enabled) {
        portToUse = await portfinder.getPortPromise({
            port: userConfig.bundleAnalyzer.port,
            stopPort: userConfig.bundleAnalyzer.port + 10,
        });

        prodConfig.plugins = [
            ...(prodConfig.plugins || []),
            new BundleAnalyzerPlugin({
                analyzerMode: 'server',
                analyzerHost: userConfig.bundleAnalyzer.host,
                analyzerPort: portToUse,
                logLevel: 'silent',
            }),
        ];
    }

    const compiler = webpack(prodConfig);
    compiler.run((err, stats) => {
        if (err) {
            console.error(`${chalk.hex(userConfig.colors.white).bgHex(userConfig.colors.red)(' ERROR ')}\n${err}`);

            console.error(
                `\n${chalk.hex(userConfig.colors.white).bgHex(userConfig.colors.red)(
                    ' ERROR '
                )} Build process failed with errors.`
            );
        } else {
            console.log(
                `${chalk.hex(userConfig.colors.black).bgHex(userConfig.colors.gray)(' STATS ')}\n${stats.toString()}`
            );

            if (stats.hasErrors()) {
                console.error(
                    `\n${chalk.hex(userConfig.colors.white).bgHex(userConfig.colors.red)(
                        ' ERROR '
                    )} Build process completed with some errors.`
                );
            } else if (stats.hasWarnings()) {
                console.warn(
                    `\n${chalk.hex(userConfig.colors.black).bgHex(userConfig.colors.yellow)(
                        ' WARN '
                    )} Build process completed with some warnings.`
                );
            } else {
                console.log(
                    `\n${chalk.hex(userConfig.colors.black).bgHex(userConfig.colors.green)(
                        ' DONE '
                    )} Build process completed.`
                );
            }
        }

        if (userConfig.bundleAnalyzer.enabled) {
            console.log(
                `\n${chalk.hex(userConfig.colors.black).bgHex(userConfig.colors.gray)(
                    ' INFO '
                )} The bundle analysis is served at ${chalk
                    .hex(userConfig.colors.blue)
                    .underline(`http://${userConfig.bundleAnalyzer.host}:${userConfig.bundleAnalyzer.port}`)}.`
            );
            console.log(
                `${chalk.hex(userConfig.colors.black).bgHex(userConfig.colors.gray)(
                    ' INFO '
                )} To terminate it, press ${chalk.hex(userConfig.colors.yellow)('Ctrl+C')}.`
            );
            ['SIGINT', 'SIGTERM'].forEach((signal) => {
                process.on(signal, () => {
                    console.log(
                        `\n${chalk.hex(userConfig.colors.white).bgHex(userConfig.colors.red)(
                            ' QUIT '
                        )} The bundle analysis report server is terminated. See you next time!\n`
                    );
                    process.exit();
                });
            });
        }
    });
})();
