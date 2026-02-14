#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const DEFAULT_SOURCE_DIRECTORY = 'data/unfallatlas-raw';
const DEFAULT_TARGET_DIRECTORY = 'data/unfallatlas';
const DEFAULT_BUNDESLAND = 'baden-wuerttemberg';
const BUNDESLAND_CODES = {
  schleswigholstein: '01',
  hamburg: '02',
  niedersachsen: '03',
  bremen: '04',
  nordrheinwestfalen: '05',
  hessen: '06',
  rheinlandpfalz: '07',
  badenwuerttemberg: '08',
  badenwurttemberg: '08',
  bayern: '09',
  saarland: '10',
  berlin: '11',
  brandenburg: '12',
  mecklenburgvorpommern: '13',
  sachsen: '14',
  sachsenanhalt: '15',
  thueringen: '16',
  thuringen: '16',
};

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const bundeslandCode = resolveBundeslandCode(options.bundesland);
  const sourceDirectory = path.resolve(process.cwd(), options.sourceDirectory);
  const targetDirectory = path.resolve(process.cwd(), options.targetDirectory);

  if (sourceDirectory === targetDirectory) {
    throw new Error('Source and target directories must be different.');
  }

  if (!(await directoryExists(sourceDirectory))) {
    throw new Error(`Source directory does not exist: ${sourceDirectory}`);
  }

  const sourceFiles = await getCsvFiles(sourceDirectory);
  if (sourceFiles.length === 0) {
    throw new Error(`No CSV files found in: ${sourceDirectory}`);
  }

  const stagedDirectory = await createStagedDirectory(targetDirectory);
  let totalRows = 0;
  let keptRows = 0;

  try {
    for (const fileName of sourceFiles) {
      const sourcePath = path.join(sourceDirectory, fileName);
      const stagedPath = path.join(stagedDirectory, fileName);
      const result = await extractBundeslandRowsFromFile(
        sourcePath,
        stagedPath,
        bundeslandCode,
      );

      totalRows += result.totalRows;
      keptRows += result.keptRows;

      console.info(
        `[${fileName}] kept ${result.keptRows} of ${result.totalRows} rows for ULAND=${bundeslandCode}`,
      );
    }

    await syncStagedCsvFilesToTarget(stagedDirectory, targetDirectory);
  } finally {
    await fs.promises.rm(stagedDirectory, { recursive: true, force: true });
  }

  console.info(
    `Done. Wrote ${sourceFiles.length} filtered CSV file(s) to ${targetDirectory}.`,
  );
  console.info(
    `Total rows kept: ${keptRows} of ${totalRows} for ULAND=${bundeslandCode}.`,
  );
}

function parseArguments(argumentsList) {
  const parsed = {
    sourceDirectory: DEFAULT_SOURCE_DIRECTORY,
    targetDirectory: DEFAULT_TARGET_DIRECTORY,
    bundesland: DEFAULT_BUNDESLAND,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--help' || argument === '-h') {
      printUsageAndExit();
    }

    if (argument === '--source-dir') {
      parsed.sourceDirectory = getArgumentValue(argumentsList, index, argument);
      index += 1;
      continue;
    }

    if (argument.startsWith('--source-dir=')) {
      parsed.sourceDirectory = argument.slice('--source-dir='.length);
      continue;
    }

    if (argument === '--target-dir') {
      parsed.targetDirectory = getArgumentValue(argumentsList, index, argument);
      index += 1;
      continue;
    }

    if (argument.startsWith('--target-dir=')) {
      parsed.targetDirectory = argument.slice('--target-dir='.length);
      continue;
    }

    if (argument === '--bundesland') {
      parsed.bundesland = getArgumentValue(argumentsList, index, argument);
      index += 1;
      continue;
    }

    if (argument.startsWith('--bundesland=')) {
      parsed.bundesland = argument.slice('--bundesland='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return parsed;
}

function getArgumentValue(argumentsList, argumentIndex, argumentName) {
  const value = argumentsList[argumentIndex + 1];
  if (!value) {
    throw new Error(`Missing value for ${argumentName}`);
  }
  return value;
}

function printUsageAndExit() {
  console.info(`Usage:
  node scripts/extract-unfallatlas-bundesland.mjs [options]

Options:
  --bundesland <name-or-code>  Bundesland name or 2-digit ULAND code (default: ${DEFAULT_BUNDESLAND})
  --source-dir <path>          Directory with raw CSV files (default: ${DEFAULT_SOURCE_DIRECTORY})
  --target-dir <path>          Directory for filtered CSV files (default: ${DEFAULT_TARGET_DIRECTORY})
  --help                       Show this help
`);
  process.exit(0);
}

function resolveBundeslandCode(value) {
  const normalizedValue = value.trim();
  if (/^\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const normalizedName = normalizeName(normalizedValue);
  const code = BUNDESLAND_CODES[normalizedName];
  if (!code) {
    throw new Error(
      `Unsupported bundesland: "${value}". Use a known name or a 2-digit code (e.g. 08).`,
    );
  }

  return code;
}

function normalizeName(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function directoryExists(directoryPath) {
  try {
    const fileStats = await fs.promises.stat(directoryPath);
    return fileStats.isDirectory();
  } catch {
    return false;
  }
}

async function getCsvFiles(directoryPath) {
  const entries = await fs.promises.readdir(directoryPath, {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function createStagedDirectory(targetDirectory) {
  await fs.promises.mkdir(path.dirname(targetDirectory), { recursive: true });
  return fs.promises.mkdtemp(
    path.join(path.dirname(targetDirectory), '.unfallatlas-extract-'),
  );
}

async function syncStagedCsvFilesToTarget(stagedDirectory, targetDirectory) {
  await fs.promises.mkdir(targetDirectory, { recursive: true });
  const stagedFiles = await getCsvFiles(stagedDirectory);
  const stagedFilesLowerCase = new Set(
    stagedFiles.map((fileName) => fileName.toLowerCase()),
  );

  const targetEntries = await fs.promises.readdir(targetDirectory, {
    withFileTypes: true,
  });
  for (const entry of targetEntries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.csv')) {
      continue;
    }

    if (!stagedFilesLowerCase.has(entry.name.toLowerCase())) {
      await fs.promises.unlink(path.join(targetDirectory, entry.name));
    }
  }

  for (const fileName of stagedFiles) {
    const stagedPath = path.join(stagedDirectory, fileName);
    const targetPath = path.join(targetDirectory, fileName);
    await removeFileIfExists(targetPath);
    await fs.promises.rename(stagedPath, targetPath);
  }
}

async function removeFileIfExists(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function extractBundeslandRowsFromFile(
  sourcePath,
  targetPath,
  bundeslandCode,
) {
  const readStream = fs.createReadStream(sourcePath, { encoding: 'utf8' });
  const writeStream = fs.createWriteStream(targetPath, { encoding: 'utf8' });
  const lineReader = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  let totalRows = 0;
  let keptRows = 0;
  let ulandColumnIndex = null;
  let pendingRecord = '';
  let recordNumber = 0;

  try {
    for await (const line of lineReader) {
      pendingRecord =
        pendingRecord.length === 0 ? line : `${pendingRecord}\n${line}`;
      if (!isCompleteCsvRecord(pendingRecord)) {
        continue;
      }

      const csvRecord = pendingRecord;
      pendingRecord = '';
      recordNumber += 1;

      if (ulandColumnIndex === null) {
        const headerColumns = parseCsvLine(csvRecord).map(cleanCsvValue);
        const resolvedIndex = headerColumns.indexOf('ULAND');
        if (resolvedIndex < 0) {
          throw new Error(`Missing ULAND column in ${sourcePath}`);
        }

        ulandColumnIndex = resolvedIndex;
        writeStream.write(`${csvRecord}\n`);
        continue;
      }

      if (csvRecord.trim().length === 0) {
        continue;
      }

      const values = parseCsvLine(csvRecord);
      if (ulandColumnIndex >= values.length) {
        throw new Error(
          `Malformed CSV row ${recordNumber} in ${sourcePath}: missing ULAND value.`,
        );
      }

      totalRows += 1;
      const stateCode = normalizeUlandCode(values[ulandColumnIndex]);
      if (stateCode === bundeslandCode) {
        writeStream.write(`${csvRecord}\n`);
        keptRows += 1;
      }
    }

    if (pendingRecord.length > 0) {
      throw new Error(
        `Malformed CSV in ${sourcePath}: unterminated quoted field near end of file.`,
      );
    }
  } finally {
    lineReader.close();
    await endWriteStream(writeStream);
  }

  if (ulandColumnIndex === null) {
    throw new Error(`Missing header row in ${sourcePath}`);
  }

  return {
    totalRows,
    keptRows,
  };
}

function isCompleteCsvRecord(record) {
  let insideQuotes = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];
    if (character !== '"') {
      continue;
    }

    const nextCharacter = record[index + 1];
    if (insideQuotes && nextCharacter === '"') {
      index += 1;
      continue;
    }

    insideQuotes = !insideQuotes;
  }

  return !insideQuotes;
}

function normalizeUlandCode(value) {
  const cleanedValue = cleanCsvValue(value);
  if (cleanedValue.length === 1) {
    return `0${cleanedValue}`;
  }
  return cleanedValue;
}

function parseCsvLine(line) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === ';' && !insideQuotes) {
      values.push(currentValue);
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
}

function cleanCsvValue(value) {
  return value.replace(/^\uFEFF/, '').trim();
}

function endWriteStream(writeStream) {
  return new Promise((resolve, reject) => {
    writeStream.on('error', reject);
    writeStream.end(resolve);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
