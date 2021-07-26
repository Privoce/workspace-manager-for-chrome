import { baseConfig } from './webpack.config.base';
import merge from 'webpack-merge';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

export const prodConfig: webpack.Configuration = merge(baseConfig, {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [
          {
            loader: 'webpack-strip-block',
          },
        ],
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
  performance: {
    maxEntrypointSize: 4096000,
    maxAssetSize: 1024000,
  },
});
