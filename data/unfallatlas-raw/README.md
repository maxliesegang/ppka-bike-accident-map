# Raw Unfallatlas data

Place the extracted yearly Unfallatlas CSV files in this directory. The directory is gitignored because the source files are large.

Prepare app-ready Baden-Württemberg files with:

```bash
npm run unfallatlas:extract:bw
```

The script writes filtered files to `data/unfallatlas`. Keep the original files here so they can be reprocessed.
