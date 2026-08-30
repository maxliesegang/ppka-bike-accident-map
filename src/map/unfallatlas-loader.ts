import {
  UNFALLATLAS_FALLBACK_YEARS,
  UNFALLATLAS_CSV_PATH_TEMPLATES,
  UNFALLATLAS_MANIFEST_FILE,
  UNFALLATLAS_SOURCE_NAME,
} from '../constants';
import type { AccidentType, SeverityType } from '../data/accident-styles';
import {
  type AccidentMarkerData,
  createAndRegisterAccidentMarker,
} from './accident-marker-factory';
import { type DataSourceId } from './data-source-types';
import {
  CSV_YIELD_INTERVAL,
  createCsvHeaderIndex,
  isEmptyCsvRow,
  iterateCsvResponseRows,
  parseCsvCoordinate,
  parseCsvInteger,
  yieldToEventLoop,
} from '../data/csv';

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
  UREGBEZ: number | undefined;
  UKREIS: number | undefined;
}

/**
 * Optional geographic narrowing applied while parsing rows. A row is kept only
 * if its Regierungsbezirk matches `uregbez` and its Kreis is in `ukreise`.
 */
export interface UnfallatlasRegionFilter {
  uregbez: number;
  ukreise: readonly number[];
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

type YearCsvLoadResult =
  | {
      status: 'loaded';
      year: number;
      response: Response;
    }
  | {
      status: 'failed';
      year: number;
      error: unknown;
    };

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

  return normalizeYears([...UNFALLATLAS_FALLBACK_YEARS]);
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
  regionFilter: UnfallatlasRegionFilter | undefined,
  markerSourceId: DataSourceId,
): Promise<UnfallatlasLoadResult> {
  let markerCount = 0;
  let loadedYears = 0;
  let failedYears = 0;

  const fetchResults = await Promise.all(years.map(loadYearCsvSafely));

  for (const result of fetchResults) {
    if (result.status === 'failed') {
      failedYears += 1;
      warnYearFailure('load', result);
      continue;
    }

    try {
      markerCount += await parseAndRegisterRows(
        result.response,
        result.year,
        regionFilter,
        markerSourceId,
      );
      loadedYears += 1;
    } catch (error: unknown) {
      failedYears += 1;
      warnYearFailure('parse', {
        status: 'failed',
        year: result.year,
        error,
      });
    }
  }

  return {
    markerCount,
    loadedYears,
    failedYears,
  };
}

async function loadYearCsvSafely(year: number): Promise<YearCsvLoadResult> {
  try {
    return {
      status: 'loaded',
      year,
      response: await loadYearCsvResponse(year),
    };
  } catch (error: unknown) {
    return {
      status: 'failed',
      year,
      error,
    };
  }
}

function warnYearFailure(
  phase: 'load' | 'parse',
  result: Extract<YearCsvLoadResult, { status: 'failed' }>,
): void {
  console.warn(
    `Failed to ${phase} Unfallatlas CSV for ${result.year}:`,
    result.error,
  );
}

async function loadYearCsvResponse(year: number): Promise<Response> {
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

    return response;
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
  response: Response,
  fallbackYear: number,
  regionFilter: UnfallatlasRegionFilter | undefined,
  markerSourceId: DataSourceId,
): Promise<number> {
  const rows = iterateCsvResponseRows(response);
  try {
    const firstRow = await rows.next();
    if (firstRow.done) {
      return 0;
    }

    const columnIndex = createColumnIndex(
      firstRow.value,
      regionFilter !== undefined,
    );

    let markerCount = 0;
    let parsedRowCount = 0;

    for await (const values of rows) {
      if (isEmptyCsvRow(values)) {
        continue;
      }
      parsedRowCount += 1;

      if (parsedRowCount % CSV_YIELD_INTERVAL === 0) {
        await yieldToEventLoop();
      }

      const accidentMarkerData = mapToMarkerData(
        values,
        columnIndex,
        fallbackYear,
        regionFilter,
      );
      if (!accidentMarkerData) {
        continue;
      }

      createAndRegisterAccidentMarker(accidentMarkerData, markerSourceId);
      markerCount += 1;
    }

    return markerCount;
  } finally {
    await rows.return(undefined);
  }
}

function createColumnIndex(
  headers: readonly string[],
  includeRegionColumns: boolean,
): ColumnIndexMap {
  const indexByHeader = createCsvHeaderIndex(headers);

  const requiredColumns = includeRegionColumns
    ? [...REQUIRED_COLUMNS, 'UREGBEZ', 'UKREIS']
    : REQUIRED_COLUMNS;
  const missingColumns = requiredColumns.filter(
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
    UREGBEZ: includeRegionColumns
      ? getRequiredColumnIndex(indexByHeader, 'UREGBEZ')
      : undefined,
    UKREIS: includeRegionColumns
      ? getRequiredColumnIndex(indexByHeader, 'UKREIS')
      : undefined,
  };
}

function mapToMarkerData(
  values: readonly string[],
  columnIndex: ColumnIndexMap,
  fallbackYear: number,
  regionFilter?: UnfallatlasRegionFilter,
): AccidentMarkerData | null {
  if (regionFilter && !isRowInRegion(values, columnIndex, regionFilter)) {
    return null;
  }

  const longitude = parseCsvCoordinate(values[columnIndex.XGCSWGS84]);
  const latitude = parseCsvCoordinate(values[columnIndex.YGCSWGS84]);
  if (latitude === null || longitude === null) {
    return null;
  }

  const flags = extractFlags(values, columnIndex);
  if (!flags.hasBike && !flags.hasPedestrian) {
    return null;
  }

  const severityCode = parseCsvInteger(values[columnIndex.UKATEGORIE]);
  const severityType = mapSeverityType(severityCode);
  if (!severityType) {
    return null;
  }

  const year = parseCsvInteger(values[columnIndex.UJAHR]) ?? fallbackYear;
  const month = parseCsvInteger(values[columnIndex.UMONAT]);
  const hour = parseCsvInteger(values[columnIndex.USTUNDE]);

  return {
    latitude,
    longitude,
    accidentType: mapAccidentType(flags),
    severityType,
    year,
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
  values: readonly string[],
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
  return 'UNKNOWN';
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

function parseFlag(value: string | undefined): boolean {
  const parsed = parseCsvInteger(value);
  return parsed !== null && parsed > 0;
}

function isRowInRegion(
  values: readonly string[],
  columnIndex: ColumnIndexMap,
  regionFilter: UnfallatlasRegionFilter,
): boolean {
  if (columnIndex.UREGBEZ === undefined || columnIndex.UKREIS === undefined) {
    return false;
  }

  const uregbez = parseCsvInteger(values[columnIndex.UREGBEZ]);
  const ukreis = parseCsvInteger(values[columnIndex.UKREIS]);
  return (
    uregbez === regionFilter.uregbez &&
    ukreis !== null &&
    regionFilter.ukreise.includes(ukreis)
  );
}

function getRequiredColumnIndex(
  indexByHeader: ReadonlyMap<string, number>,
  columnName: string,
): number {
  const index = indexByHeader.get(columnName);
  if (index === undefined) {
    throw new Error(`Missing required column: ${columnName}`);
  }
  return index;
}

function getOptionalColumnIndex(
  indexByHeader: ReadonlyMap<string, number>,
  columnName: string,
): number | undefined {
  return indexByHeader.get(columnName);
}

function getFirstExistingColumnIndex(
  indexByHeader: ReadonlyMap<string, number>,
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
  values: readonly string[],
  columnIndex: number | undefined,
): boolean {
  if (columnIndex === undefined) {
    return false;
  }
  return parseFlag(values[columnIndex]);
}
