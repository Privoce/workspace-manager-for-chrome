import { userConfig } from './user.config';
import path from 'path';
import chalk from 'chalk';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import AntdDayjsWebpackPlugin from 'antd-dayjs-webpack-plugin';
import LodashWebpackPlugin from 'lodash-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const WebpackBar = require('webpackbar');

const isDevMode = process.env.NODE_ENV === 'development';

export const baseConfig: webpack.Configuration = {
  mode: isDevMode ? 'development' : 'production',
  entry: {
    background: [path.resolve(userConfig.projectRoot, 'src/pages/background/index.ts')],
    home: [path.resolve(userConfig.projectRoot, 'src/pages/home/index.tsx')],
  },
  output: {
    path: path.resolve(userConfig.projectRoot, 'dist'),
    filename: '[name].bundle.js',
    publicPath: './',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/i,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            [
              '@babel/preset-env',
              {
                'targets': {
                  'chrome': '80',
                },
              },
            ],
            '@babel/preset-react',
            '@babel/preset-typescript',
          ],
          plugins: [
            [
              'babel-plugin-import',
              {
                libraryName: 'antd',
                style: true,
              },
            ],
            [
              '@babel/plugin-proposal-decorators',
              {
                legacy: true,
              },
            ],
            [
              '@babel/plugin-proposal-class-properties',
              {
                loose: true,
              },
            ],
            [
              '@babel/plugin-proposal-private-methods',
              {
                loose: true,
              },
            ],
            '@babel/plugin-transform-runtime',
            ...(isDevMode ? [require.resolve('react-refresh/babel')] : []),
          ],
        },
      },
      {
        test: /\.css$/i,
        use: [
          isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.less$/i,
        use: [
          isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
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
    ...(isDevMode ? [] : [new MiniCssExtractPlugin()]),
    new AntdDayjsWebpackPlugin(),
    new LodashWebpackPlugin(),
    new WebpackBar(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(userConfig.projectRoot, 'src/templates/default.ejs'),
      minify: !isDevMode,
      chunks: ['home'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(userConfig.projectRoot, 'public'),
          to: path.resolve(userConfig.projectRoot, 'dist'),
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(userConfig.projectRoot, 'src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
};
