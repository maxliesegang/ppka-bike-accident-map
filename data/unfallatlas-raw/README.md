Place raw Unfallatlas CSV exports in this folder.

- This directory is intentionally gitignored for large source files.
- Keep original yearly files here (for example `opendata2024.csv`).
- Generate app-ready filtered files with:
  - `npm run unfallatlas:extract:bw`

The extraction script writes filtered files to `data/unfallatlas`.
