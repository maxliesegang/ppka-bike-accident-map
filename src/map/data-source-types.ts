export const DATA_SOURCE_IDS = [
  'local',
  'unfallatlas-karlsruhe',
  'unfallatlas',
] as const;

export type DataSourceId = (typeof DATA_SOURCE_IDS)[number];

const DATA_SOURCE_SET = new Set<string>(DATA_SOURCE_IDS);

export function isDataSourceId(value: string): value is DataSourceId {
  return DATA_SOURCE_SET.has(value);
}

const UNFALLATLAS_SOURCE_SET = new Set<DataSourceId>([
  'unfallatlas',
  'unfallatlas-karlsruhe',
]);

export function isUnfallatlasSource(value: DataSourceId): boolean {
  return UNFALLATLAS_SOURCE_SET.has(value);
}
