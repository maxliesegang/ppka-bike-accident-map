import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

export default {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(process.cwd(), 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Path to your source index.html
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg', // Absolute path to your file
          to: 'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg', // Name or path in the `dist` folder
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: './app.css', to: 'app.css' }],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(process.cwd(), 'dist'), // Serve files from 'dist'
    },
    port: 8080, // You can change the port if needed
    open: true, // Automatically open the browser
    hot: true, // Enable Hot Module Replacement (HMR)
    compress: true, // Enable gzip compression
  },
};
