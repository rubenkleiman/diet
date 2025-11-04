import { merge } from 'webpack-merge';
import common from './webpack.common.js';

export default merge(common, {
  mode: 'development',
  
  devtool: 'inline-source-map',
  
  devServer: {
    static: {
      directory: './dist',
    },
    compress: true,
    port: 3001,
    hot: true,
    open: false,
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    ],
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },

  output: {
    filename: 'js/[name].js',
  },

  optimization: {
    runtimeChunk: 'single',
  },
});
