/**
 * Shared parsing helpers for the semicolon-separated CSV exports this app
 * consumes (Unfallatlas yearly files, the PPKA request export). Both use `;` as
 * the delimiter, may carry a BOM, and may quote individual values, so the
 * tokenizer below is kept in one place rather than duplicated per loader.
 */

/** Parses CSV chunks while retaining quoted fields across chunk boundaries. */
class CsvRowParser {
  private readonly row: string[] = [];
  private currentValue = '';
  private insideQuotes = false;
  private skipNextLineFeed = false;
  private pendingQuote = false;

  push(chunk: string): string[][] {
    const rows: string[][] = [];

    for (let index = 0; index < chunk.length; index += 1) {
      const character = chunk[index];

      if (this.skipNextLineFeed) {
        this.skipNextLineFeed = false;
        if (character === '\n') {
          continue;
        }
      }

      if (this.pendingQuote) {
        this.pendingQuote = false;
        if (character === '"') {
          if (this.insideQuotes) {
            this.currentValue += '"';
          }
          continue;
        }

        this.insideQuotes = !this.insideQuotes;
      }

      if (character === '"') {
        if (index === chunk.length - 1) {
          this.pendingQuote = true;
          continue;
        }

        const nextCharacter = chunk[index + 1];
        if (this.insideQuotes && nextCharacter === '"') {
          this.currentValue += '"';
          index += 1;
          continue;
        }

        this.insideQuotes = !this.insideQuotes;
        continue;
      }

      if (!this.insideQuotes && character === ';') {
        this.finalizeValue();
        continue;
      }

      if (!this.insideQuotes && (character === '\n' || character === '\r')) {
        const finalizedRow = this.finalizeRow();
        if (finalizedRow) {
          rows.push(finalizedRow);
        }
        this.skipNextLineFeed = character === '\r';
        continue;
      }

      this.currentValue += character;
    }

    return rows;
  }

  finish(): string[] | null {
    if (this.pendingQuote) {
      this.insideQuotes = !this.insideQuotes;
      this.pendingQuote = false;
    }
    if (this.currentValue.length === 0 && this.row.length === 0) {
      return null;
    }
    return this.finalizeRow();
  }

  private finalizeValue(): void {
    this.row.push(this.currentValue);
    this.currentValue = '';
  }

  private finalizeRow(): string[] | null {
    this.finalizeValue();
    if (this.row.length === 1 && this.row[0] === '') {
      this.row.length = 0;
      return null;
    }

    const finalizedRow = [...this.row];
    this.row.length = 0;
    return finalizedRow;
  }
}

/** Maximum number of parsed data rows between browser event-loop yields. */
export const CSV_YIELD_INTERVAL = 5000;

/** Parses a complete CSV string row by row. */
export function* iterateCsvRows(csvText: string): Generator<string[]> {
  const parser = new CsvRowParser();
  yield* parser.push(csvText);
  const finalRow = parser.finish();
  if (finalRow) {
    yield finalRow;
  }
}

/**
 * Parses a fetch response incrementally. A text fallback keeps this helper
 * usable with response-like test doubles that do not expose a body stream.
 */
export async function* iterateCsvResponseRows(
  response: Response,
): AsyncGenerator<string[]> {
  if (!response.body) {
    yield* iterateCsvRows(await response.text());
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new CsvRowParser();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      yield* parser.push(decoder.decode(value, { stream: true }));
    }

    yield* parser.push(decoder.decode());
    const finalRow = parser.finish();
    if (finalRow) {
      yield finalRow;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Strips the BOM a spreadsheet export may leave on the first header cell. */
export function cleanCsvValue(value: string): string {
  return value.replace(/^\uFEFF/, '').trim();
}

export function isEmptyCsvRow(values: readonly string[]): boolean {
  for (const value of values) {
    if (value.trim().length > 0) {
      return false;
    }
  }

  return true;
}

export function parseCsvInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parses a WGS84 degree value, tolerating the German decimal comma. */
export function parseCsvCoordinate(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Header name → column position, with the BOM/whitespace already stripped. */
export function createCsvHeaderIndex(
  headers: readonly string[],
): ReadonlyMap<string, number> {
  const indexByHeader = new Map<string, number>();
  for (let index = 0; index < headers.length; index += 1) {
    indexByHeader.set(cleanCsvValue(headers[index]), index);
  }
  return indexByHeader;
}

/** Lets a long parse loop hand control back to the browser periodically. */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
