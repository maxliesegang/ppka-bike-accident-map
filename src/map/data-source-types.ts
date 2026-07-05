export const DATA_SOURCES = ['local', 'unfallatlas'] as const;

export type DataSource = (typeof DATA_SOURCES)[number];
