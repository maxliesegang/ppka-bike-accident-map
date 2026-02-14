This folder stores app-ready Unfallatlas CSV files.

Recommended workflow:

1. Put raw yearly CSV exports in `data/unfallatlas-raw`.
2. Run `npm run unfallatlas:extract:bw` to keep only Baden-Wuerttemberg rows.
3. The script writes filtered yearly CSV files to this folder.

- Any `.csv` file with a 4-digit year in its filename is discovered automatically.

Examples:

- `opendata2022.csv`
- `opendata2023.csv`
- `opendata2024.csv`
- `Unfallorte2024.csv`
- `unfallorte_2021.csv`

The app builds `unfallatlas/manifest.json` from this folder and the UI year filter
is generated dynamically from those discovered years.

Fallback years in `src/constants.ts` are only used if the manifest cannot be loaded.
