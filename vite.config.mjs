import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { defineConfig } from 'vite';

const GEOPACKAGE_FILE_NAME = 'unfaelle_mit_fuss_oder_rad_2018_2023_ka.gpkg';
const GEOPACKAGE_WASM_FILE = 'sql-wasm.wasm';

const rootDirectory = process.cwd();
const geopackageSourcePath = path.resolve(rootDirectory, GEOPACKAGE_FILE_NAME);
const geopackageWasmSourcePath = path.resolve(
  rootDirectory,
  'node_modules/@ngageoint/geopackage/dist/sql-wasm.wasm',
);
const unfallatlasSourceDirectory = path.resolve(
  rootDirectory,
  'data/unfallatlas',
);
const emptyModulePath = path.resolve(
  rootDirectory,
  'src/shims/empty-module.js',
);

function collectUnfallatlasManifest(sourceDirectory) {
  if (!fs.existsSync(sourceDirectory)) {
    return { years: [], pathsByYear: {} };
  }

  const pathSetsByYear = {};
  const files = fs.readdirSync(sourceDirectory, { withFileTypes: true });

  for (const file of files) {
    if (!file.isFile() || !file.name.toLowerCase().endsWith('.csv')) {
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

      pathSetsByYear[year] ??= new Set();
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

function emitAssetFile(context, sourcePath, fileName) {
  if (!fs.existsSync(sourcePath)) {
    context.error(`Required static asset is missing: ${sourcePath}`);
  }

  context.emitFile({
    type: 'asset',
    fileName,
    source: fs.readFileSync(sourcePath),
  });
}

function emitDirectoryAssets(context, sourceDirectory, outputDirectory) {
  if (!fs.existsSync(sourceDirectory)) {
    return;
  }

  const files = fs.readdirSync(sourceDirectory, { withFileTypes: true });

  for (const file of files) {
    if (file.name === '.DS_Store') {
      continue;
    }

    const sourcePath = path.join(sourceDirectory, file.name);
    const outputPath = path.posix.join(outputDirectory, file.name);

    if (file.isDirectory()) {
      emitDirectoryAssets(context, sourcePath, outputPath);
      continue;
    }

    if (file.isFile()) {
      emitAssetFile(context, sourcePath, outputPath);
    }
  }
}

function sendJson(response, data) {
  const body = JSON.stringify(data, null, 2);
  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Content-Length', Buffer.byteLength(body));
  response.end(body);
}

function sendFile(response, sourcePath, contentType) {
  if (!fs.existsSync(sourcePath)) {
    response.statusCode = 404;
    response.end();
    return;
  }

  const stat = fs.statSync(sourcePath);
  response.statusCode = 200;
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Length', stat.size);
  fs.createReadStream(sourcePath).pipe(response);
}

function resolveUnfallatlasRequest(pathname) {
  const relativePath = pathname.slice('/unfallatlas/'.length);
  const sourcePath = path.resolve(unfallatlasSourceDirectory, relativePath);
  const sourceRoot = `${unfallatlasSourceDirectory}${path.sep}`;

  if (!sourcePath.startsWith(sourceRoot)) {
    return null;
  }

  return sourcePath;
}

function localDataAssetsPlugin() {
  return {
    name: 'ppka-local-data-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost');
        const pathname = decodeURIComponent(requestUrl.pathname);

        if (pathname === `/${GEOPACKAGE_FILE_NAME}`) {
          sendFile(response, geopackageSourcePath, 'application/octet-stream');
          return;
        }

        if (pathname === `/${GEOPACKAGE_WASM_FILE}`) {
          sendFile(response, geopackageWasmSourcePath, 'application/wasm');
          return;
        }

        if (pathname === '/unfallatlas/manifest.json') {
          sendJson(
            response,
            collectUnfallatlasManifest(unfallatlasSourceDirectory),
          );
          return;
        }

        if (pathname.startsWith('/unfallatlas/')) {
          const sourcePath = resolveUnfallatlasRequest(pathname);
          if (sourcePath) {
            sendFile(response, sourcePath, 'text/csv; charset=utf-8');
            return;
          }
        }

        next();
      });
    },
    generateBundle() {
      emitAssetFile(this, geopackageSourcePath, GEOPACKAGE_FILE_NAME);
      emitAssetFile(this, geopackageWasmSourcePath, GEOPACKAGE_WASM_FILE);
      emitDirectoryAssets(this, unfallatlasSourceDirectory, 'unfallatlas');

      this.emitFile({
        type: 'asset',
        fileName: 'unfallatlas/manifest.json',
        source: JSON.stringify(
          collectUnfallatlasManifest(unfallatlasSourceDirectory),
          null,
          2,
        ),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [localDataAssetsPlugin()],
  resolve: {
    alias: {
      'better-sqlite3': emptyModulePath,
      crypto: emptyModulePath,
      fs: emptyModulePath,
      path: emptyModulePath,
      stream: emptyModulePath,
      vm: emptyModulePath,
    },
  },
  server: {
    port: 4000,
  },
  preview: {
    port: 4000,
  },
  build: {
    emptyOutDir: true,
  },
});
