export const DATA_SOURCES = ['local', 'unfallatlas'] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

export function isDataSource(value: string | undefined): value is DataSource {
  return value === 'local' || value === 'unfallatlas';
}
