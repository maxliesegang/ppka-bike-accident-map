import path from 'path';
import fs from 'node:fs';
import process from 'node:process';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

class UnfallatlasManifestPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'UnfallatlasManifestPlugin',
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'UnfallatlasManifestPlugin',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          () => {
            const sourceDirectory = path.resolve(
              process.cwd(),
              'data/unfallatlas',
            );
            const manifest = collectUnfallatlasManifest(sourceDirectory);
            const manifestJson = JSON.stringify(manifest, null, 2);

            compilation.emitAsset(
              'unfallatlas/manifest.json',
              new compiler.webpack.sources.RawSource(manifestJson),
            );
          },
        );
      },
    );
  }
}

function collectUnfallatlasManifest(sourceDirectory) {
  if (!fs.existsSync(sourceDirectory)) {
    return { years: [], pathsByYear: {} };
  }

  const pathSetsByYear = {};
  const files = fs.readdirSync(sourceDirectory, { withFileTypes: true });

  for (const file of files) {
    if (!file.isFile()) {
      continue;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      continue;
    }

    const yearMatches = file.name.match(/(?:19|20)\d{2}/g);
    if (!yearMatches) {
      continue;
    }

    const relativePath = `unfallatlas/${file.name}`;
    for (const yearText of yearMatches) {
      const year = Number.parseInt(yearText, 10);
      if (!Number.isInteger(year)) {
        continue;
      }

      if (!pathSetsByYear[year]) {
        pathSetsByYear[year] = new Set();
      }
      pathSetsByYear[year].add(relativePath);
    }
  }

  const years = Object.keys(pathSetsByYear)
    .map((yearText) => Number.parseInt(yearText, 10))
    .filter((year) => Number.isInteger(year))
    .sort((a, b) => a - b);
  const pathsByYear = {};

  for (const year of years) {
    pathsByYear[year] = [...pathSetsByYear[year]].sort();
  }

  return { years, pathsByYear };
}

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
      crypto: false,
      fs: false,
      path: false,
      stream: false,
      vm: false,
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(process.cwd(), 'dist'),
    clean: true,
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'no-frameworks-typescript-app-starter',
      template: 'src/index.html',
    }),
    new MiniCssExtractPlugin(),
    new UnfallatlasManifestPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg',
          to: 'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg',
        },
        {
          from: './node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm',
          to: 'sql-wasm.wasm',
        },
        {
          from: './data/unfallatlas',
          to: 'unfallatlas',
          noErrorOnMissing: true,
          globOptions: {
            ignore: ['**/.DS_Store'],
          },
        },
      ],
    }),
  ],

  devServer: {
    static: path.join(process.cwd(), 'dist'),
    compress: true,
    port: 4000,
  },
};
