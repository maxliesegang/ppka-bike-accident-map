import { PPKA_CSV_PATH, PPKA_SOURCE_NAME } from '../constants';
import {
  CSV_YIELD_INTERVAL,
  createCsvHeaderIndex,
  isEmptyCsvRow,
  iterateCsvResponseRows,
  parseCsvCoordinate,
  parseCsvInteger,
  yieldToEventLoop,
} from '../data/csv';
import type { AccidentCasualtyTotals } from '../data/accident-properties';
import {
  getAccidentType,
  getLocalSeverityTypeFromCasualties,
} from '../features/accident-classification';
import {
  type AccidentMarkerData,
  createAndRegisterAccidentMarker,
} from './accident-marker-factory';
import { type DataSourceId } from './data-source-types';

/**
 * The unified PPKA export. It restates the 2018-2023 accidents already shipped
 * in the GeoPackage — without coordinates, but carrying the GeoPackage's
 * `UN_KEY` in `Original_Unfall_ID` — and adds the geocoded newer years. Only the
 * latter become markers here; see `isSupersededByGeoPackage`.
 */

const REQUIRED_COLUMNS = [
  'Original_Unfall_ID',
  'Datum + Uhrzeit',
  'Koordinaten Breitengrad',
  'Koordinaten Längengrad',
  'Anzahl der Getöteten',
  'Anzahl der Schwerverletzten',
  'Anzahl der Leichtverletzten',
  'Anzahl Fahrrad',
  'Anzahl zu Fuß',
  'Anzahl Pkw',
  'Anzahl sonstige Kfz',
] as const;

/**
 * Free-text columns copied into the popup's detail list when the row fills
 * them. The response leaves many of them empty, so each is emitted only when
 * present rather than as a fixed `N/A` row.
 */
const DETAIL_COLUMNS = [
  'Gemeinde',
  'Unfallart',
  'Unfalltyp',
  'Charakteristik',
  'Besonderheiten',
  'Lichtzeichenanlage',
  'Lichtverhältnisse',
  'Straßenzustand',
  'Aufprall auf Hindernis',
  'Beteiligter 1: Verkehrsbeteiligung',
  'Beteiligter 2: Verkehrsbeteiligung',
  'Beteiligter 1: Ursachen',
  'Beteiligter 2: Ursachen',
] as const;

export interface PpkaLoadResult {
  markerCount: number;
  /** Rows that cannot become markers: duplicates or incomplete/invalid records. */
  skippedCount: number;
}

interface PpkaAccidentRow {
  latitude: number;
  longitude: number;
  year: number;
  month: number | null;
  hour: number | null;
  date: string;
  bikes: number;
  pedestrians: number;
  motorVehicles: number;
  participants: number | null;
  casualties: AccidentCasualtyTotals;
  severityLabel: string;
  details: Record<string, string>;
}

export async function loadPpkaCsvMarkers(
  markerSourceId: DataSourceId,
): Promise<PpkaLoadResult> {
  const response = await fetch(PPKA_CSV_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load PPKA CSV: ${response.statusText}`);
  }

  return parseAndRegisterRows(response, markerSourceId);
}

async function parseAndRegisterRows(
  response: Response,
  markerSourceId: DataSourceId,
): Promise<PpkaLoadResult> {
  const rows = iterateCsvResponseRows(response);
  try {
    const headerRow = await rows.next();
    if (headerRow.done) {
      return { markerCount: 0, skippedCount: 0 };
    }

    const columnIndex = createColumnIndex(headerRow.value);
    let markerCount = 0;
    let skippedCount = 0;
    let parsedRowCount = 0;

    for await (const values of rows) {
      if (isEmptyCsvRow(values)) {
        continue;
      }
      parsedRowCount += 1;

      const accidentRow = parseRow(values, columnIndex);
      if (accidentRow === null) {
        skippedCount += 1;
      } else {
        createAndRegisterAccidentMarker(
          toMarkerData(accidentRow),
          markerSourceId,
        );
        markerCount += 1;
      }

      if (parsedRowCount % CSV_YIELD_INTERVAL === 0) {
        await yieldToEventLoop();
      }
    }

    return { markerCount, skippedCount };
  } finally {
    await rows.return(undefined);
  }
}

type ColumnIndex = ReadonlyMap<string, number>;

function createColumnIndex(headers: readonly string[]): ColumnIndex {
  const indexByHeader = createCsvHeaderIndex(headers);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !indexByHeader.has(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required PPKA columns: ${missingColumns.join(', ')}`,
    );
  }
  return indexByHeader;
}

function parseRow(
  values: readonly string[],
  columnIndex: ColumnIndex,
): PpkaAccidentRow | null {
  if (isSupersededByGeoPackage(values, columnIndex)) {
    return null;
  }

  const latitude = parseCsvCoordinate(
    getValue(values, columnIndex, 'Koordinaten Breitengrad'),
  );
  const longitude = parseCsvCoordinate(
    getValue(values, columnIndex, 'Koordinaten Längengrad'),
  );
  if (latitude === null || longitude === null) {
    return null;
  }

  const timestamp = parseTimestamp(
    getValue(values, columnIndex, 'Datum + Uhrzeit'),
  );
  if (timestamp === null) {
    return null;
  }

  return {
    latitude,
    longitude,
    ...timestamp,
    bikes: getCount(values, columnIndex, 'Anzahl Fahrrad'),
    pedestrians: getCount(values, columnIndex, 'Anzahl zu Fuß'),
    // The response splits motorized traffic into cars and "sonstige Kfz"
    // (lorries, buses, trams, motorcycles); the GeoPackage's counterpart
    // `sum_car_truck_bus` covers both, so they are added back together.
    motorVehicles:
      getCount(values, columnIndex, 'Anzahl Pkw') +
      getCount(values, columnIndex, 'Anzahl sonstige Kfz'),
    participants: parseCsvInteger(
      getValue(values, columnIndex, 'Anzahl Beteiligte'),
    ),
    casualties: {
      killed: getCount(values, columnIndex, 'Anzahl der Getöteten'),
      severelyInjured: getCount(
        values,
        columnIndex,
        'Anzahl der Schwerverletzten',
      ),
      slightlyInjured: getCount(
        values,
        columnIndex,
        'Anzahl der Leichtverletzten',
      ),
    },
    severityLabel:
      getValue(values, columnIndex, 'Unfallkategorie')?.trim() ?? '',
    details: collectDetails(values, columnIndex),
  };
}

/**
 * Whether this row is one of the pre-2024 accidents the GeoPackage already
 * renders. Those rows carry the GeoPackage's `UN_KEY` in `Original_Unfall_ID`
 * and arrive without coordinates; skipping them keeps the two shipped files
 * from producing duplicate markers should a future response geocode them.
 */
function isSupersededByGeoPackage(
  values: readonly string[],
  columnIndex: ColumnIndex,
): boolean {
  const originalId = getValue(values, columnIndex, 'Original_Unfall_ID');
  return originalId !== undefined && originalId.trim().length > 0;
}

function toMarkerData(row: PpkaAccidentRow): AccidentMarkerData {
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    accidentType: getAccidentType({
      sum_bike: row.bikes,
      sum_ped: row.pedestrians,
      sum_car_truck_bus: row.motorVehicles,
    }),
    severityType: getLocalSeverityTypeFromCasualties(row.casualties),
    year: row.year,
    // Built lazily: only the popups the user actually opens pay for it.
    popupProperties: () => buildPopupProperties(row),
  };
}

function buildPopupProperties(row: PpkaAccidentRow): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Quelle: PPKA_SOURCE_NAME,
    Jahr: row.year,
    Datum: row.date,
    Beteiligung: describeParticipants(row),
  };

  if (row.month !== null) {
    properties.Monat = row.month;
  }
  if (row.hour !== null) {
    properties.Stunde = row.hour;
  }
  if (row.severityLabel.length > 0) {
    properties.Schweregrad = row.severityLabel;
  }
  if (row.participants !== null) {
    properties['Anzahl Beteiligte'] = row.participants;
  }

  properties['Getötete'] = row.casualties.killed;
  properties['Schwerverletzte'] = row.casualties.severelyInjured;
  properties['Leichtverletzte'] = row.casualties.slightlyInjured;

  return { ...properties, ...row.details };
}

function describeParticipants(row: PpkaAccidentRow): string {
  const parts = [
    countLabel(row.bikes, 'Fahrrad', 'Fahrräder'),
    countLabel(row.pedestrians, 'zu Fuß', 'zu Fuß'),
    countLabel(row.motorVehicles, 'Kfz', 'Kfz'),
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(', ') : 'Unbekannt';
}

function countLabel(
  count: number,
  singular: string,
  plural: string,
): string | null {
  if (count <= 0) {
    return null;
  }
  return `${count} ${count === 1 ? singular : plural}`;
}

function collectDetails(
  values: readonly string[],
  columnIndex: ColumnIndex,
): Record<string, string> {
  const details: Record<string, string> = {};
  for (const column of DETAIL_COLUMNS) {
    const value = getValue(values, columnIndex, column)?.trim();
    if (value !== undefined && value.length > 0) {
      details[column] = value;
    }
  }
  return details;
}

/**
 * Splits the `YYYY-MM-DDTHH:MM:SSZ` timestamp textually. The trailing `Z` is an
 * artifact of the export — the times are local Karlsruhe wall-clock times — so
 * parsing through `Date` would shift them by the UTC offset.
 */
function parseTimestamp(value: string | undefined): {
  year: number;
  month: number | null;
  hour: number | null;
  date: string;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(
    value?.trim() ?? '',
  );
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const date =
    hourText === undefined
      ? `${dayText}.${monthText}.${yearText}`
      : `${dayText}.${monthText}.${yearText}, ${hourText}:${minuteText} Uhr`;

  return {
    year,
    month: month >= 1 && month <= 12 ? month : null,
    hour: hourText === undefined ? null : Number.parseInt(hourText, 10),
    date,
  };
}

function getValue(
  values: readonly string[],
  columnIndex: ColumnIndex,
  column: string,
): string | undefined {
  const index = columnIndex.get(column);
  return index === undefined ? undefined : values[index];
}

function getCount(
  values: readonly string[],
  columnIndex: ColumnIndex,
  column: string,
): number {
  return parseCsvInteger(getValue(values, columnIndex, column)) ?? 0;
}
