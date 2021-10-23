// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const webpack = require('webpack');
const config = require('../webpack.config');

delete config.boilerplateConfig;

const compiler = webpack(config);
compiler.run((err, stats) => {
  if (err) {
    throw err;
  }
  console.log(stats.toString({
    chunks: false,
    colors: true,
  }));
  compiler.close(() => {});
})
