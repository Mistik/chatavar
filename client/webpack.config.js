const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';
  return {
    entry: {
      main:   './src/index.jsx',
      widget: './src/widget/index.jsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: (pathData) =>
        pathData.chunk.name === 'widget'
          ? 'widget-bundle.js'
          : (isDev ? '[name].js' : '[name].[contenthash].js'),
      publicPath: '/',
      clean: true,
    },
    resolve: { extensions: ['.js', '.jsx'], alias: { '@': path.resolve(__dirname, 'src') } },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { browsers: ['> 1%', 'last 2 versions'] } }],
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
            },
          },
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        { test: /\.(png|svg|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/, type: 'asset/resource' },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './public/index.html', favicon: './public/favicon.ico', chunks: ['main'], filename: 'index.html' }),
      new Dotenv({ silent: true }),
    ],
    devServer: {
      port: 3000, hot: true,
      historyApiFallback: {
        rewrites: [
          { from: /^\/widget-bundle\.js$/, to: '/widget-bundle.js' },
          { from: /./, to: '/index.html' },
        ],
      },
      proxy: [
        { context: ['/api'], target: 'http://localhost:3001' },
        { context: ['/socket.io'], target: 'http://localhost:3002', ws: true },
        { context: ['/widget-bundle.js', '/g/', '/widget-login', '/embed.js'], target: 'http://localhost:3001' },
      ],
    },
    devtool: isDev ? 'eval-source-map' : 'source-map',
    optimization: {
      splitChunks: {
        chunks: chunk => chunk.name === 'main',
        cacheGroups: { vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendors', chunks: c => c.name === 'main' } },
      },
    },
  };
};
