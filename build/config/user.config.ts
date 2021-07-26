import path from 'path';

interface UserConfig {
  devServer: {
    host: string;
    port: number;
    hmrPath: string;
    crxPath: string;
    crxContentScriptsChunks: string[];
    crxBackgroundChunks: string[];
  };
  bundleAnalyzer: {
    enabled: boolean;
    host: string;
    port: number;
  };
  projectRoot: string;
  colors: {
    red: string;
    yellow: string;
    green: string;
    blue: string;
    gray: string;
    white: string;
    black: string;
  };
}

export const userConfig: UserConfig = {
  devServer: {
    host: '127.0.0.1',
    port: 3000,
    hmrPath: '/__webpack_hmr',
    crxPath: '/__auto_reload_crx',
    crxContentScriptsChunks: [],
    crxBackgroundChunks: ['background'],
  },
  bundleAnalyzer: {
    enabled: false,
    host: '127.0.0.1',
    port: 8888,
  },
  projectRoot: path.resolve(__dirname, '../../'),
  colors: {
    red: '#E7192B',
    yellow: '#E5C32F',
    green: '#47DD78',
    blue: '#419DD2',
    gray: '#DBDEE7',
    white: '#ffffff',
    black: '#000000',
  },
};
