/**
 * Minimal CSV helpers.
 *
 * Small enough to avoid a dependency: handles quoted fields, escaped quotes,
 * CRLF line endings, and a trailing newline.
 */

/** Columns used by the CSV export and understood by the importer. */
export const ENTRY_CSV_COLUMNS = [
  "name",
  "type",
  "unit",
  "direction",
  "value",
  "reps",
  "date",
  "notes",
  "isBest",
];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

/** Splits a CSV line into cells, honouring quoted values. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

export type ParsedCsv = {
  header: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) return { header: [], rows: [] };

  const header = splitLine(lines[0]).map((cell) => cell.trim());

  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    header.forEach((key, index) => {
      row[key] = (cells[index] ?? "").trim();
    });
    return row;
  });

  return { header, rows };
}
