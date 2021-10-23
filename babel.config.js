const env = require('./utils/env');

const isDevelopment = env.NODE_ENV !== 'production';

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: '84',
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
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    '@babel/plugin-transform-runtime',
    ...(isDevelopment ? [require.resolve('react-refresh/babel')] : []),
  ],
};
