import { describe, it, expect } from "vitest";
import { parseContactsCsv } from "./csv";

describe("parseContactsCsv", () => {
  it("parses simple name,email rows with a header", () => {
    const csv = "name,email\nJana Novakova,jana@example.com\nPetr Svoboda,petr@example.com";
    const { contacts, skipped } = parseContactsCsv(csv);
    expect(contacts).toEqual([
      { name: "Jana Novakova", email: "jana@example.com" },
      { name: "Petr Svoboda", email: "petr@example.com" },
    ]);
    expect(skipped).toBe(0);
  });

  it("parses rows with no header (first row has no @ is still required to detect header)", () => {
    // Without a header, the first data row itself contains an email, so it
    // is correctly NOT treated as a header.
    const csv = "Jana Novakova,jana@example.com";
    const { contacts } = parseContactsCsv(csv);
    expect(contacts).toEqual([{ name: "Jana Novakova", email: "jana@example.com" }]);
  });

  it("handles reversed column order (email first)", () => {
    const csv = "email,name\njana@example.com,Jana Novakova";
    const { contacts } = parseContactsCsv(csv);
    expect(contacts).toEqual([{ name: "Jana Novakova", email: "jana@example.com" }]);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'name,email\n"Novakova, Jana",jana@example.com';
    const { contacts } = parseContactsCsv(csv);
    expect(contacts).toEqual([{ name: "Novakova, Jana", email: "jana@example.com" }]);
  });

  it("skips rows missing a name or email", () => {
    const csv = "name,email\nNo Email Person,\n,noname@example.com\nValid,valid@example.com";
    const { contacts, skipped } = parseContactsCsv(csv);
    expect(contacts).toEqual([{ name: "Valid", email: "valid@example.com" }]);
    expect(skipped).toBe(2);
  });

  it("deduplicates by email, case-insensitively", () => {
    const csv = "name,email\nJana,JANA@example.com\nJana Again,jana@example.com";
    const { contacts, skipped } = parseContactsCsv(csv);
    expect(contacts).toEqual([{ name: "Jana", email: "jana@example.com" }]);
    expect(skipped).toBe(1);
  });

  it("returns empty result for empty input", () => {
    expect(parseContactsCsv("")).toEqual({ contacts: [], skipped: 0 });
    expect(parseContactsCsv("   \n  \n")).toEqual({ contacts: [], skipped: 0 });
  });

  it("ignores extra columns beyond name/email", () => {
    const csv = "name,phone,email\nJana,123456,jana@example.com";
    const { contacts } = parseContactsCsv(csv);
    expect(contacts).toEqual([{ name: "Jana", email: "jana@example.com" }]);
  });
});
