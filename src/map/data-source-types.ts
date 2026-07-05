export const DATA_SOURCE_IDS = ['local', 'unfallatlas'] as const;

export type DataSourceId = (typeof DATA_SOURCE_IDS)[number];

const DATA_SOURCE_SET = new Set<string>(DATA_SOURCE_IDS);

export function isDataSourceId(value: string): value is DataSourceId {
  return DATA_SOURCE_SET.has(value);
}
