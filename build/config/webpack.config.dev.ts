import { baseConfig } from './webpack.config.base';
import merge from 'webpack-merge';
import webpack, { Configuration as WebpackConfiguration } from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

export const devConfig: Configuration = merge<Configuration>(baseConfig, {
  stats: false,
  devtool: 'inline-cheap-module-source-map',
  devServer: {
    writeToDisk: true,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshPlugin(),
  ],
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
});
