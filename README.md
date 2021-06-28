# Webpack Boilerplate

A webpack 5 boilerplate with support of React, TypeScript, HMR, Chrome Extension Development, etc.

## To use

Install dependencies:

```shell
yarn install
```

Start development server:

```shell
yarn run start
```

Build bundle for production:

```shell
yarn run build
```

## Configure webpack entries

The configuration of webpack entries is located at `build/config/webpack.config.base.ts`, which is a typical [webpack configuration file](https://webpack.js.org/configuration/).

## HMR/Auto-reload for Chrome Extension Development

To facilitate development of Chrome extensions, this boilerplate supports HMR (Hot Module Replacement) for background scripts and auto-reload for content scripts.

To enable this feature, remember to edit the configuration at `build/config/user.config.ts` and put the corresponding webpack chunk names in `userConfig.devServer.crxContentScriptsChunks` and `userConfig.devServer.crxBackgroundScriptsChunks`.
