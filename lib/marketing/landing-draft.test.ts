import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveLandingDraft, readLandingDraft, clearLandingDraft, draftTextToHtml, LANDING_DRAFT_KEY } from "./landing-draft";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe("landing draft", () => {
  it("round-trips a draft", () => {
    saveLandingDraft({ text: "Ahoj", recipient: "child", when: "year", year: 2044 });
    expect(readLandingDraft()).toMatchObject({ v: 1, text: "Ahoj", recipient: "child", when: "year", year: 2044 });
    clearLandingDraft();
    expect(readLandingDraft()).toBeNull();
  });

  it("ignores empty, malformed or stale drafts", () => {
    store.set(LANDING_DRAFT_KEY, "{not json");
    expect(readLandingDraft()).toBeNull();
    store.set(LANDING_DRAFT_KEY, JSON.stringify({ v: 1, text: "   ", savedAt: Date.now() }));
    expect(readLandingDraft()).toBeNull();
    store.set(LANDING_DRAFT_KEY, JSON.stringify({ v: 1, text: "old", savedAt: Date.now() - 40 * 86_400_000 }));
    expect(readLandingDraft()).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    });
    expect(() => saveLandingDraft({ text: "x", recipient: null, when: "gone", year: 2030 })).not.toThrow();
    expect(readLandingDraft()).toBeNull();
    expect(() => clearLandingDraft()).not.toThrow();
  });

  it("turns plain text into escaped paragraphs for the editor", () => {
    expect(draftTextToHtml("Ahoj <b>ty</b>\nřádek\n\nDruhý & poslední")).toBe(
      "<p>Ahoj &lt;b&gt;ty&lt;/b&gt;<br>řádek</p><p>Druhý &amp; poslední</p>"
    );
  });
});
