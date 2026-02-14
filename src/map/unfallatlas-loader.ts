import {
  UNFALLATLAS_CSV_PATH_TEMPLATES,
  UNFALLATLAS_MANIFEST_FILE,
  UNFALLATLAS_SELECTED_YEARS,
  UNFALLATLAS_SOURCE_NAME,
} from '../constants';
import { AccidentType, SeverityType } from '../data/accident-styles';
import {
  CategorizedMarkerData,
  createAndRegisterCategorizedMarker,
} from './layer-creator';

const REQUIRED_COLUMNS = [
  'UJAHR',
  'UMONAT',
  'USTUNDE',
  'UKATEGORIE',
  'IstRad',
  'IstFuss',
  'IstPKW',
  'IstKrad',
  'XGCSWGS84',
  'YGCSWGS84',
] as const;

const IST_SONSTIGE_COLUMN_CANDIDATES = ['IstSonstige', 'IstSonstig'] as const;
const REGISTRATION_YIELD_INTERVAL = 5000;

interface ColumnIndexMap {
  UJAHR: number;
  UMONAT: number;
  USTUNDE: number;
  UKATEGORIE: number;
  IstRad: number;
  IstFuss: number;
  IstPKW: number;
  IstKrad: number;
  IstGkfz: number | undefined;
  IstSonstige: number;
  XGCSWGS84: number;
  YGCSWGS84: number;
}

export interface UnfallatlasLoadResult {
  loadedYears: number;
  failedYears: number;
  markerCount: number;
}

interface UnfallatlasFlags {
  hasBike: boolean;
  hasPedestrian: boolean;
  hasMotorVehicle: boolean;
}

interface UnfallatlasManifestPayload {
  years?: unknown;
  pathsByYear?: unknown;
}

interface UnfallatlasManifest {
  years: number[];
  pathsByYear: Record<number, string[]>;
}

type UnfallatlasSeverityType = Extract<
  SeverityType,
  | 'UNFALLATLAS_FATALITY'
  | 'UNFALLATLAS_SEVERE_INJURY'
  | 'UNFALLATLAS_LIGHT_INJURY'
>;

const severityTypeByCode: Readonly<Record<number, UnfallatlasSeverityType>> = {
  1: 'UNFALLATLAS_FATALITY',
  2: 'UNFALLATLAS_SEVERE_INJURY',
  3: 'UNFALLATLAS_LIGHT_INJURY',
};

const severityDescriptionByType: Readonly<
  Record<UnfallatlasSeverityType, string>
> = {
  UNFALLATLAS_FATALITY: 'Kategorie 1: Mit Getoeteten',
  UNFALLATLAS_SEVERE_INJURY: 'Kategorie 2: Mit Schwerverletzten',
  UNFALLATLAS_LIGHT_INJURY: 'Kategorie 3: Mit Leichtverletzten',
};

let availableYearsPromise: Promise<number[]> | null = null;
let manifestPromise: Promise<UnfallatlasManifest> | null = null;

export async function getAvailableUnfallatlasYears(): Promise<number[]> {
  if (!availableYearsPromise) {
    availableYearsPromise = resolveAvailableUnfallatlasYears();
  }
  return availableYearsPromise;
}

async function resolveAvailableUnfallatlasYears(): Promise<number[]> {
  const manifest = await loadManifest();
  if (manifest.years.length > 0) {
    return manifest.years;
  }

  return normalizeYears([...UNFALLATLAS_SELECTED_YEARS]);
}

async function loadManifest(): Promise<UnfallatlasManifest> {
  if (manifestPromise) {
    return manifestPromise;
  }

  manifestPromise = resolveManifest();
  return manifestPromise;
}

async function resolveManifest(): Promise<UnfallatlasManifest> {
  try {
    const response = await fetch(UNFALLATLAS_MANIFEST_FILE, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return emptyManifest();
    }

    const payload = (await response.json()) as UnfallatlasManifestPayload;
    const pathsByYear = normalizePathsByYear(payload.pathsByYear);
    const years = new Set<number>(normalizeYears(payload.years));

    for (const yearText of Object.keys(pathsByYear)) {
      years.add(Number.parseInt(yearText, 10));
    }

    return {
      years: [...years].sort((a, b) => a - b),
      pathsByYear,
    };
  } catch (error: unknown) {
    console.warn(
      'Could not load Unfallatlas manifest. Falling back to defaults.',
      error,
    );
    return emptyManifest();
  }
}

function normalizeYears(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const years = new Set<number>();
  for (const entry of value) {
    if (typeof entry === 'number' && Number.isInteger(entry)) {
      years.add(entry);
    }
  }

  return [...years].sort((a, b) => a - b);
}

function normalizePathsByYear(value: unknown): Record<number, string[]> {
  const normalized: Record<number, string[]> = {};
  if (!value || typeof value !== 'object') {
    return normalized;
  }

  for (const [yearText, paths] of Object.entries(value)) {
    const year = Number.parseInt(yearText, 10);
    if (!Number.isInteger(year) || !Array.isArray(paths)) {
      continue;
    }

    const normalizedPaths = paths.filter(
      (pathValue): pathValue is string => typeof pathValue === 'string',
    );
    if (normalizedPaths.length > 0) {
      normalized[year] = normalizedPaths;
    }
  }

  return normalized;
}

function emptyManifest(): UnfallatlasManifest {
  return {
    years: [],
    pathsByYear: {},
  };
}

export async function loadUnfallatlasMarkersForYears(
  years: readonly number[],
): Promise<UnfallatlasLoadResult> {
  let markerCount = 0;
  let loadedYears = 0;
  let failedYears = 0;

  const fetchResults = await Promise.all(
    years.map(async (year) => {
      try {
        const csvText = await loadYearCsvText(year);
        return { year, csvText } as const;
      } catch (error: unknown) {
        return { year, error } as const;
      }
    }),
  );

  for (const result of fetchResults) {
    if ('error' in result) {
      failedYears += 1;
      console.warn(
        `Failed to load Unfallatlas CSV for ${result.year}:`,
        result.error,
      );
      continue;
    }

    try {
      markerCount += await parseAndRegisterRows(result.csvText, result.year);
      loadedYears += 1;
    } catch (error: unknown) {
      failedYears += 1;
      console.warn(
        `Failed to parse Unfallatlas CSV for ${result.year}:`,
        error,
      );
    }
  }

  return {
    markerCount,
    loadedYears,
    failedYears,
  };
}

export async function loadUnfallatlasMarkers(): Promise<UnfallatlasLoadResult> {
  const years = await getAvailableUnfallatlasYears();
  return loadUnfallatlasMarkersForYears(years);
}

async function loadYearCsvText(year: number): Promise<string> {
  const manifest = await loadManifest();
  const candidatePaths =
    manifest.pathsByYear[year] && manifest.pathsByYear[year].length > 0
      ? manifest.pathsByYear[year]
      : buildCsvPaths(year);

  for (const path of candidatePaths) {
    const response = await fetch(path);
    if (!response.ok) {
      continue;
    }

    return response.text();
  }

  throw new Error(`No CSV found for ${year} in configured templates.`);
}

function buildCsvPaths(year: number): readonly string[] {
  const yearString = String(year);
  return UNFALLATLAS_CSV_PATH_TEMPLATES.map((template) =>
    template.replace('{year}', yearString),
  );
}

async function parseAndRegisterRows(
  csvText: string,
  fallbackYear: number,
): Promise<number> {
  const rows = iterateCsvRows(csvText);
  const firstRow = rows.next();
  if (firstRow.done) {
    return 0;
  }

  const headerValues = firstRow.value.map(cleanCsvValue);
  const columnIndex = createColumnIndex(headerValues);

  let markerCount = 0;
  let parsedRowCount = 0;

  for (const values of rows) {
    if (isEmptyCsvRow(values)) {
      continue;
    }
    parsedRowCount += 1;

    const markerData = mapToMarkerData(values, columnIndex, fallbackYear);
    if (!markerData) {
      continue;
    }

    createAndRegisterCategorizedMarker(markerData, 'unfallatlas');
    markerCount += 1;

    if (parsedRowCount % REGISTRATION_YIELD_INTERVAL === 0) {
      await yieldToEventLoop();
    }
  }

  return markerCount;
}

function createColumnIndex(headers: string[]): ColumnIndexMap {
  const indexByHeader = new Map<string, number>();

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    indexByHeader.set(header, index);
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !indexByHeader.has(column),
  );

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const indexIstSonstige = getFirstExistingColumnIndex(
    indexByHeader,
    IST_SONSTIGE_COLUMN_CANDIDATES,
  );
  if (indexIstSonstige === undefined) {
    throw new Error(
      `Missing required columns: ${IST_SONSTIGE_COLUMN_CANDIDATES.join(' or ')}`,
    );
  }

  return {
    UJAHR: getRequiredColumnIndex(indexByHeader, 'UJAHR'),
    UMONAT: getRequiredColumnIndex(indexByHeader, 'UMONAT'),
    USTUNDE: getRequiredColumnIndex(indexByHeader, 'USTUNDE'),
    UKATEGORIE: getRequiredColumnIndex(indexByHeader, 'UKATEGORIE'),
    IstRad: getRequiredColumnIndex(indexByHeader, 'IstRad'),
    IstFuss: getRequiredColumnIndex(indexByHeader, 'IstFuss'),
    IstPKW: getRequiredColumnIndex(indexByHeader, 'IstPKW'),
    IstKrad: getRequiredColumnIndex(indexByHeader, 'IstKrad'),
    // Older yearly exports (for example 2017) can omit IstGkfz.
    IstGkfz: getOptionalColumnIndex(indexByHeader, 'IstGkfz'),
    IstSonstige: indexIstSonstige,
    XGCSWGS84: getRequiredColumnIndex(indexByHeader, 'XGCSWGS84'),
    YGCSWGS84: getRequiredColumnIndex(indexByHeader, 'YGCSWGS84'),
  };
}

function mapToMarkerData(
  values: string[],
  columnIndex: ColumnIndexMap,
  fallbackYear: number,
): CategorizedMarkerData | null {
  const longitude = parseCoordinate(values[columnIndex.XGCSWGS84]);
  const latitude = parseCoordinate(values[columnIndex.YGCSWGS84]);
  if (latitude === null || longitude === null) {
    return null;
  }

  const flags = extractFlags(values, columnIndex);
  if (!flags.hasBike && !flags.hasPedestrian) {
    return null;
  }

  const severityCode = parseInteger(values[columnIndex.UKATEGORIE]);
  const severityType = mapSeverityType(severityCode);
  if (!severityType) {
    return null;
  }

  const year = parseInteger(values[columnIndex.UJAHR]) ?? fallbackYear;
  const month = parseInteger(values[columnIndex.UMONAT]);
  const hour = parseInteger(values[columnIndex.USTUNDE]);

  return {
    latitude,
    longitude,
    accidentType: mapAccidentType(flags),
    severityType,
    popupProperties: () => ({
      Quelle: UNFALLATLAS_SOURCE_NAME,
      Jahr: year,
      Monat: month ?? 'N/A',
      Stunde: hour ?? 'N/A',
      Schweregrad: describeSeverity(severityType),
      Beteiligung: describeParticipants(flags),
    }),
  };
}

function extractFlags(
  values: string[],
  columnIndex: ColumnIndexMap,
): UnfallatlasFlags {
  const hasBike = parseFlag(values[columnIndex.IstRad]);
  const hasPedestrian = parseFlag(values[columnIndex.IstFuss]);
  const hasMotorVehicle =
    parseFlag(values[columnIndex.IstPKW]) ||
    parseFlag(values[columnIndex.IstKrad]) ||
    parseOptionalFlag(values, columnIndex.IstGkfz) ||
    parseFlag(values[columnIndex.IstSonstige]);

  return {
    hasBike,
    hasPedestrian,
    hasMotorVehicle,
  };
}

function mapAccidentType({
  hasBike,
  hasPedestrian,
  hasMotorVehicle,
}: UnfallatlasFlags): AccidentType {
  if (hasBike && hasMotorVehicle && !hasPedestrian) {
    return 'BIKE_AND_VEHICLE';
  }
  if (!hasBike && hasPedestrian && hasMotorVehicle) {
    return 'PEDESTRIAN_AND_VEHICLE';
  }
  if (hasBike && hasPedestrian && !hasMotorVehicle) {
    return 'BIKE_AND_PEDESTRIAN';
  }
  if (hasBike && !hasPedestrian && !hasMotorVehicle) {
    // The Unfallatlas source does not expose participant counts for cyclists.
    return 'SINGLE_BIKE';
  }
  return 'DEFAULT_FILL';
}

function mapSeverityType(
  severityCode: number | null,
): UnfallatlasSeverityType | null {
  if (severityCode === null) {
    return null;
  }

  return severityTypeByCode[severityCode] ?? null;
}

function describeSeverity(severityType: UnfallatlasSeverityType): string {
  return severityDescriptionByType[severityType];
}

function describeParticipants({
  hasBike,
  hasPedestrian,
  hasMotorVehicle,
}: UnfallatlasFlags): string {
  const participants: string[] = [];
  if (hasBike) {
    participants.push('Fahrrad');
  }
  if (hasPedestrian) {
    participants.push('Fussverkehr');
  }
  if (hasMotorVehicle) {
    participants.push('Kfz');
  }
  return participants.length > 0 ? participants.join(', ') : 'Unbekannt';
}

function cleanCsvValue(value: string): string {
  return value.replace(/^\uFEFF/, '').trim();
}

function* iterateCsvRows(csvText: string): Generator<string[]> {
  const row: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  const finalizeValue = (): void => {
    row.push(currentValue);
    currentValue = '';
  };

  const finalizeRow = (): string[] | null => {
    finalizeValue();
    if (row.length === 1 && row[0] === '') {
      row.length = 0;
      return null;
    }

    const finalizedRow = [...row];
    row.length = 0;
    return finalizedRow;
  };

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (character === '"') {
      const nextCharacter = csvText[index + 1];
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && character === ';') {
      finalizeValue();
      continue;
    }

    if (!insideQuotes && (character === '\n' || character === '\r')) {
      const finalizedRow = finalizeRow();
      if (finalizedRow) {
        yield finalizedRow;
      }

      if (character === '\r' && csvText[index + 1] === '\n') {
        index += 1;
      }
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || row.length > 0) {
    const finalizedRow = finalizeRow();
    if (finalizedRow) {
      yield finalizedRow;
    }
  }
}

function isEmptyCsvRow(values: readonly string[]): boolean {
  for (const value of values) {
    if (value.trim().length > 0) {
      return false;
    }
  }

  return true;
}

function parseInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFlag(value: string | undefined): boolean {
  const parsed = parseInteger(value);
  return parsed !== null && parsed > 0;
}

function parseCoordinate(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRequiredColumnIndex(
  indexByHeader: Map<string, number>,
  columnName: string,
): number {
  const index = indexByHeader.get(columnName);
  if (index === undefined) {
    throw new Error(`Missing required column: ${columnName}`);
  }
  return index;
}

function getOptionalColumnIndex(
  indexByHeader: Map<string, number>,
  columnName: string,
): number | undefined {
  return indexByHeader.get(columnName);
}

function getFirstExistingColumnIndex(
  indexByHeader: Map<string, number>,
  columnNames: readonly string[],
): number | undefined {
  for (const columnName of columnNames) {
    const index = indexByHeader.get(columnName);
    if (index !== undefined) {
      return index;
    }
  }
  return undefined;
}

function parseOptionalFlag(
  values: string[],
  columnIndex: number | undefined,
): boolean {
  if (columnIndex === undefined) {
    return false;
  }
  return parseFlag(values[columnIndex]);
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
