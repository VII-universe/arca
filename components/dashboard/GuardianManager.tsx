"use client";

import { useRef, useState, useTransition } from "react";
import { addGuardian, removeGuardian } from "@/app/actions/guardians";

interface Guardian { id: string; name: string; email: string; }

const IcPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IcTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
  </svg>
);
const IcLoader = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "arca-spin 1s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
  </svg>
);

const TONES = ["sage", "sky", "clay", "ink"];
function toneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TONES[Math.abs(h) % TONES.length];
}
function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function GuardianManager({ initialGuardians }: { initialGuardians: Guardian[] }) {
  const [guardians, setGuardians] = useState<Guardian[]>(initialGuardians);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addGuardian(formData);
        const name = (formData.get("name") as string).trim();
        const email = (formData.get("email") as string).trim().toLowerCase();
        setGuardians((prev) => [...prev, { id: `temp-${Date.now()}`, name, email }]);
        setShowForm(false);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleRemove(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await removeGuardian(id);
      setGuardians((prev) => prev.filter((g) => g.id !== id));
      setDeletingId(null);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* List */}
      {guardians.map((g) => {
        const tone = toneFor(g.name);
        const init = initials(g.name);
        return (
          <div key={g.id} className="arca-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <span className={`arca-avatar ${tone}`}>{init}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 14 }}>{g.name}</div>
              <div className="arca-sub" style={{ fontSize: 12.5 }}>{g.email}</div>
            </div>
            <button
              onClick={() => handleRemove(g.id)}
              disabled={deletingId === g.id}
              className="arca-btn sm arca-btn--ghost"
              style={{ color: "var(--muted)", padding: "6px 8px" }}
              aria-label="Odebrat strážce"
            >
              {deletingId === g.id ? <IcLoader /> : <IcTrash />}
            </button>
          </div>
        );
      })}

      {guardians.length === 0 && !showForm && (
        <p className="arca-sub" style={{ fontSize: 13, fontStyle: "italic" }}>
          Zatím žádní strážci.
        </p>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="arca-card flat" style={{ background: "var(--bg-tint)", border: "none", padding: 18 }}>
          {error && (
            <p style={{ fontSize: 12, color: "#C0392B", background: "rgba(192,57,43,0.08)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              {error}
            </p>
          )}
          <form ref={formRef} action={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <input name="name" required placeholder="Celé jméno" className="arca-input" style={{ fontSize: 13 }} />
              <input name="email" type="email" required placeholder="email@example.com" className="arca-input" style={{ fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={isPending} className="arca-btn arca-btn--primary sm">
                {isPending ? <IcLoader /> : <IcPlus />}
                Přidat strážce
              </button>
              <button type="button" className="arca-btn arca-btn--ghost sm" onClick={() => { setShowForm(false); setError(null); }}>
                Zrušit
              </button>
            </div>
          </form>
        </div>
      ) : guardians.length < 3 && (
        <button
          className="arca-card"
          style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderStyle: "dashed", background: "transparent", color: "var(--muted)", cursor: "pointer", justifyContent: "center" }}
          onClick={() => setShowForm(true)}
        >
          <IcPlus /> Pozvat dalšího strážce
        </button>
      )}
    </div>
  );
}
