const path = require('path');
const { merge } = require('webpack-merge');
const { HotModuleReplacementPlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin');
const LodashWebpackPlugin = require('lodash-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const WebpackBarPlugin = require('webpackbar');
const FriendlyErrorsWebpackPlugin = require('@soda/friendly-errors-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const env = require('./utils/env');

const isDevelopment = env.NODE_ENV !== 'production';
const isAnalyzer = env.ANALYZER === 'true';

let config = {
  entry: {
    background: path.resolve(__dirname, 'src/pages/Background/index.ts'),
    contentScript: path.resolve(__dirname, 'src/pages/ContentScript/index.ts'),
    newTab: path.resolve(__dirname, 'src/pages/NewTab/index.tsx'),
    options: path.resolve(__dirname, 'src/pages/Options/index.tsx'),
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  boilerplateConfig: {
    notHotReload: ['background', 'contentScript'],
    backgroundScripts: ['background'],
    contentScrips: ['contentScript'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/i,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: [isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.less$/i,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'less-loader',
            options: { lessOptions: { javascriptEnabled: true } },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|woff2?)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[name]_[hash:6].[ext]',
              esModule: false,
              limit: 1024,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new AntdDayjsWebpackPlugin(),
    new LodashWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: path.resolve(__dirname, 'src/templates/default.ejs'),
      minify: !isDevelopment,
      chunks: ['options'],
    }),
    new HtmlWebpackPlugin({
      filename: 'newTab.html',
      template: path.resolve(__dirname, 'src/templates/default.ejs'),
      minify: !isDevelopment,
      chunks: ['newTab'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'build'),
        },
      ],

    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
};

if (isDevelopment) {
  config = merge(config, {
    mode: 'development',
    stats: false,
    devtool: 'inline-cheap-module-source-map',
    plugins: [
      new FriendlyErrorsWebpackPlugin(),
      new HotModuleReplacementPlugin(),
      new ReactRefreshPlugin({
        overlay: false,
      }),
    ],
    resolve: {
      alias: {
        'react-dom': '@hot-loader/react-dom',
      },
    },
  });
} else {
  config = merge(config, {
    mode: 'production',
    plugins: [
      new WebpackBarPlugin(),
      new MiniCssExtractPlugin(),
      ...(isAnalyzer ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerHost: env.HOST,
          analyzerPort: env.PORT,
          logLevel: 'silent',
        }),
      ] : []),
    ],
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
}

module.exports = config;
