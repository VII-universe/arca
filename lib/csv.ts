// Minimal CSV parsing for the contact-import feature. Expects a simple
// "name,email" shape (optionally more columns, which are ignored) — not a
// general-purpose CSV library, and deliberately not trying to reverse-
// engineer every contact-export app's column layout.

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === "\"") {
        if (line[i + 1] === "\"") { current += "\""; i++; }
        else inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export interface ParsedContact {
  name: string;
  email: string;
}

export interface ParseContactsCsvResult {
  contacts: ParsedContact[];
  skipped: number;
}

export function parseContactsCsv(text: string): ParseContactsCsvResult {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { contacts: [], skipped: 0 };

  const rows = lines.map(parseCsvLine);

  // Skip a header row — detected as a first row where no field looks like
  // an email address.
  const firstRowLooksLikeHeader = !rows[0].some((f) => f.includes("@"));
  const dataRows = firstRowLooksLikeHeader ? rows.slice(1) : rows;

  const contacts: ParsedContact[] = [];
  let skipped = 0;
  const seenEmails = new Set<string>();

  for (const row of dataRows) {
    const emailField = row.find((f) => f.includes("@"));
    const nameField = row.find((f) => f && f !== emailField);

    if (!emailField || !nameField) { skipped++; continue; }

    const email = emailField.toLowerCase();
    if (seenEmails.has(email)) { skipped++; continue; }
    seenEmails.add(email);

    contacts.push({ name: nameField, email });
  }

  return { contacts, skipped };
}
