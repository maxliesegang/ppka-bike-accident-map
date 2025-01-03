import path from 'path';
import process from 'node:process';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

export default {
  mode: 'development',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.css'],
    fallback: {
      'better-sqlite3': false,
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(process.cwd(), 'dist'),
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'no-frameworks-typescript-app-starter',
      template: 'src/index.html',
    }),
    new MiniCssExtractPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg', // Absolute path to your file
          to: 'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg', // Name or path in the `docs` folder
        },
      ],
    }),
    new NodePolyfillPlugin(),
  ],

  devServer: {
    static: path.join(process.cwd(), 'dist'),
    compress: true,
    port: 4000,
  },
};
