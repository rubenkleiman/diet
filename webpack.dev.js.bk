import { merge } from 'webpack-merge';
import common from './webpack.common.js';

export default merge(common, {
  mode: 'development',
  
  devtool: 'eval-source-map',
  
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
    devMiddleware: {
      writeToDisk: false,
    },
  },

  output: {
    filename: 'js/[name].js',
    devtoolModuleFilenameTemplate: 'webpack://[namespace]/[resource-path]?[loaders]',
  },

  optimization: {
    runtimeChunk: 'single',
    moduleIds: 'named',
    chunkIds: 'named',
  },
});