import { describe, it, expect } from "vitest";
import { ENTRY_CSV_COLUMNS, parseCsv, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("writes a header and one line per row", () => {
    const csv = toCsv([{ a: 1, b: "two" }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,two\n");
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    const csv = toCsv(
      [{ note: 'Felt "strong", again' }, { note: "line\nbreak" }],
      ["note"],
    );
    expect(csv).toBe('note\n"Felt ""strong"", again"\n"line\nbreak"\n');
  });

  it("renders null and undefined as empty cells", () => {
    expect(toCsv([{ a: null, b: undefined }], ["a", "b"])).toBe("a,b\n,\n");
  });

  it("formats dates as ISO days", () => {
    const csv = toCsv([{ d: new Date("2026-04-01T00:00:00Z") }], ["d"]);
    expect(csv).toContain("2026-04-01");
  });
});

describe("parseCsv", () => {
  it("parses a header and rows into objects", () => {
    const { header, rows } = parseCsv("name,value\nPush-ups,45\nSquat,60\n");

    expect(header).toEqual(["name", "value"]);
    expect(rows).toEqual([
      { name: "Push-ups", value: "45" },
      { name: "Squat", value: "60" },
    ]);
  });

  it("handles quoted values, escaped quotes and commas", () => {
    const { rows } = parseCsv('name,notes\n"Bench, wide","He said ""go"""\n');

    expect(rows[0].name).toBe("Bench, wide");
    expect(rows[0].notes).toBe('He said "go"');
  });

  it("handles CRLF line endings and a UTF-8 BOM", () => {
    const { header, rows } = parseCsv("\uFEFFname,value\r\nPush-ups,45\r\n");

    expect(header).toEqual(["name", "value"]);
    expect(rows).toEqual([{ name: "Push-ups", value: "45" }]);
  });

  it("ignores blank lines", () => {
    const { rows } = parseCsv("name,value\n\nPush-ups,45\n\n");
    expect(rows).toHaveLength(1);
  });

  it("fills missing trailing cells with empty strings", () => {
    const { rows } = parseCsv("name,value,reps\nPush-ups,45\n");
    expect(rows[0]).toEqual({ name: "Push-ups", value: "45", reps: "" });
  });

  it("returns empty structures for empty input", () => {
    expect(parseCsv("")).toEqual({ header: [], rows: [] });
  });

  it("round-trips an export", () => {
    const rows = [
      {
        name: "Bench Press",
        type: "EXERCISE",
        unit: "KG",
        direction: "HIGHER",
        value: 100,
        reps: 5,
        date: "2026-04-01",
        notes: 'Felt "good", mostly',
        isBest: true,
      },
    ];

    const parsed = parseCsv(toCsv(rows, [...ENTRY_CSV_COLUMNS]));

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      name: "Bench Press",
      value: "100",
      reps: "5",
      notes: 'Felt "good", mostly',
      isBest: "true",
    });
  });
});
