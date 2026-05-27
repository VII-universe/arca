"use client";

import { useState, useEffect } from "react";
import type {
  SanctuaryContent,
  SanctuaryMemory,
  SanctuaryBlueprintItem,
} from "@/app/actions/sanctuary";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ownerName: string;
  packType: "EMOTIONAL" | "PRACTICAL";
  createdAt: string;
  contents: SanctuaryContent[];
  memories: SanctuaryMemory[];
  blueprintItems: SanctuaryBlueprintItem[];
}

// ── Scroll-reveal hook ────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".sanc-reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("sanc-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ── Category labels ───────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Předplatné & Smlouvy",
  DOCUMENT:     "Dokumenty",
  PROPERTY:     "Majetek",
  INSTRUCTION:  "Instrukce",
};

// ── Section divider tag ───────────────────────────────────────────────────────

function SectionTag({ roman, label }: { roman: string; label: string }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <p style={{
        fontSize: 10,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: "#a1a1aa",
        fontFamily: "var(--font-inter), sans-serif",
        margin: "0 0 10px",
      }}>
        {roman}
      </p>
      <h2 style={{
        fontFamily: "var(--font-playfair), Georgia, serif",
        fontWeight: 400,
        fontStyle: "italic",
        fontSize: "clamp(22px, 4vw, 30px)",
        color: "#f5f0df",
        margin: "0 0 20px",
        lineHeight: 1.2,
      }}>
        {label}
      </h2>
      <div style={{ width: 36, height: 1, background: "rgba(201,169,110,0.35)" }} />
    </div>
  );
}

// ── Message content media ─────────────────────────────────────────────────────

function MediaItem({ item }: { item: SanctuaryContent }) {
  if (!item.signedUrl || !item.s3FileKey) return null;
  const filename = (item.s3FileKey.split("/").pop() ?? "").replace(/^\d+_/, "");

  if (item.type === "VIDEO") {
    return (
      <figure style={{ margin: "36px 0" }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          src={item.signedUrl}
          style={{ width: "100%", borderRadius: 8, background: "#111", border: "1px solid rgba(245,240,223,0.06)" }}
        />
        <figcaption style={{ fontSize: 11, color: "#a1a1aa", marginTop: 8, fontFamily: "var(--font-inter), sans-serif" }}>
          {filename}
        </figcaption>
      </figure>
    );
  }

  if (item.type === "AUDIO") {
    return (
      <div style={{ margin: "28px 0", padding: "20px 24px", border: "1px solid rgba(245,240,223,0.08)", borderRadius: 8 }}>
        <p style={{ fontSize: 13, color: "#a1a1aa", fontFamily: "var(--font-inter), sans-serif", margin: "0 0 12px" }}>
          ♪ {filename}
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={item.signedUrl} style={{ width: "100%" }} />
      </div>
    );
  }

  return null;
}

// ── Memory photo ──────────────────────────────────────────────────────────────

function MemoryPhoto({ memory }: { memory: SanctuaryMemory }) {
  const date = memory.happenedAt
    ? new Date(memory.happenedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <figure style={{ margin: 0, position: "relative", overflow: "hidden", borderRadius: 6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={memory.signedUrl!}
        alt={memory.title ?? "Vzpomínka"}
        loading="lazy"
        style={{
          width: "100%",
          aspectRatio: "1",
          objectFit: "cover",
          display: "block",
          filter: "brightness(0.88)",
        }}
      />
      {(memory.title || date) && (
        <figcaption style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "24px 12px 10px",
          background: "linear-gradient(transparent, rgba(10,10,10,0.82))",
          fontSize: 11,
          color: "rgba(245,240,223,0.75)",
          fontFamily: "var(--font-inter), sans-serif",
        }}>
          {memory.title && <p style={{ margin: "0 0 2px", fontWeight: 500 }}>{memory.title}</p>}
          {date && <p style={{ margin: 0, opacity: 0.6 }}>{date}</p>}
        </figcaption>
      )}
    </figure>
  );
}

// ── Memory audio / video ──────────────────────────────────────────────────────

function MemoryAV({ memory }: { memory: SanctuaryMemory }) {
  const isVideo = memory.mediaType === "video";
  return (
    <div style={{ margin: "20px 0", border: "1px solid rgba(245,240,223,0.07)", borderRadius: 8, overflow: "hidden" }}>
      {isVideo
        ? /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video controls src={memory.signedUrl!} style={{ width: "100%", background: "#111" }} />
        : /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "var(--font-inter), sans-serif", margin: "0 0 12px" }}>
              ♪ {memory.title ?? "Nahrávka"}
            </p>
            <audio controls src={memory.signedUrl!} style={{ width: "100%" }} />
          </div>
      }
      {memory.note && (
        <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: 13, color: "#a1a1aa", fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: "italic", borderTop: "1px solid rgba(245,240,223,0.06)" }}>
          {memory.note}
        </p>
      )}
    </div>
  );
}

// ── Memory text card (no media) ───────────────────────────────────────────────

function MemoryTextCard({ memory }: { memory: SanctuaryMemory }) {
  const date = memory.happenedAt
    ? new Date(memory.happenedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <div style={{ padding: "20px 24px", border: "1px solid rgba(245,240,223,0.07)", borderRadius: 8, marginBottom: 12 }}>
      {memory.title && (
        <p style={{ fontSize: 14, fontWeight: 500, color: "#f5f0df", fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: "italic", margin: "0 0 6px" }}>
          {memory.title}
        </p>
      )}
      {memory.note && (
        <p style={{ fontSize: 14, color: "rgba(245,240,223,0.65)", fontFamily: "var(--font-playfair), Georgia, serif", lineHeight: 1.7, margin: "0 0 6px" }}>
          {memory.note}
        </p>
      )}
      {date && (
        <p style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "var(--font-inter), sans-serif", margin: 0 }}>
          {date}
        </p>
      )}
    </div>
  );
}

// ── Blueprint card ────────────────────────────────────────────────────────────

function BlueprintCard({
  item,
  done,
  onToggle,
}: {
  item: SanctuaryBlueprintItem;
  done: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="sanc-bp-card"
      style={{
        padding: "16px 18px",
        border: `1px solid ${item.isCritical && !done ? "rgba(211,84,0,0.35)" : "rgba(245,240,223,0.07)"}`,
        borderRadius: 8,
        opacity: done ? 0.38 : 1,
        cursor: "pointer",
        userSelect: "none",
        background: "transparent",
      }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

        {/* Checkbox circle */}
        <div style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1.5px solid ${done ? "rgba(201,169,110,0.6)" : "rgba(245,240,223,0.25)"}`,
          background: done ? "rgba(201,169,110,0.15)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
          transition: "all .25s",
        }}>
          {done && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#c9a96e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 14,
              fontFamily: "var(--font-inter), sans-serif",
              color: "#f5f0df",
              fontWeight: 500,
              textDecoration: done ? "line-through" : "none",
              transition: "text-decoration .2s",
            }}>
              {item.title}
            </span>
            {item.isCritical && !done && (
              <span style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 20,
                background: "rgba(211,84,0,0.15)",
                color: "#D35400",
                fontFamily: "var(--font-inter), sans-serif",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}>
                urgentní
              </span>
            )}
          </div>

          {item.content && (
            <div style={{ marginTop: 6 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "#a1a1aa",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontStyle: "italic",
                  lineHeight: 1.65,
                  margin: 0,
                  overflow: "hidden",
                  maxHeight: expanded ? "none" : "2.6em",
                  WebkitLineClamp: expanded ? "unset" : 2,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical" as const,
                }}
              >
                {item.content}
              </p>
              {item.content.length > 100 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "rgba(201,169,110,0.6)",
                    fontFamily: "var(--font-inter), sans-serif",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                  }}
                >
                  {expanded ? "Skrýt" : "Zobrazit vše"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SanctuaryClient ───────────────────────────────────────────────────────────

export default function SanctuaryClient({
  ownerName,
  packType,
  createdAt,
  contents,
  memories,
  blueprintItems,
}: Props) {
  useReveal();

  const [handled, setHandled] = useState<Set<string>>(new Set());

  const textContent    = contents.find((c) => c.type === "TEXT");
  const mediaContents  = contents.filter((c) => c.type !== "TEXT" && c.s3FileKey);

  const photoMemories  = memories.filter((m) => m.signedUrl && m.mediaType === "image");
  const avMemories     = memories.filter((m) => m.signedUrl && (m.mediaType === "audio" || m.mediaType === "video"));
  const textMemories   = memories.filter((m) => !m.signedUrl && (m.title || m.note));
  const hasMemories    = photoMemories.length + avMemories.length + textMemories.length > 0;

  const grouped = blueprintItems.reduce<Record<string, SanctuaryBlueprintItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const doneCount  = handled.size;
  const totalCount = blueprintItems.length;

  const formattedDate = new Date(createdAt).toLocaleDateString("cs-CZ", {
    day: "numeric", month: "long", year: "numeric",
  });

  function toggleHandled(id: string) {
    setHandled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 120 }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div
        className="sanc-hero-fade"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* ARCA mark */}
        <div style={{ marginBottom: 52, opacity: 0.28 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="#f5f0df" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="19" r="1.5" fill="#c9a96e"/>
          </svg>
        </div>

        <p style={{
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "#a1a1aa",
          fontFamily: "var(--font-inter), sans-serif",
          marginBottom: 40,
        }}>
          Tato zpráva čeká právě na tebe
        </p>

        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "clamp(2.2rem, 7vw, 4rem)",
          color: "#f5f0df",
          lineHeight: 1.15,
          margin: "0 0 28px",
        }}>
          {ownerName}
        </h1>

        <div style={{ width: 40, height: 1, background: "rgba(201,169,110,0.35)", marginBottom: 24 }} />

        <p style={{
          fontSize: 13,
          color: "#a1a1aa",
          fontFamily: "var(--font-inter), sans-serif",
          margin: 0,
          letterSpacing: "0.04em",
        }}>
          Napsáno {formattedDate}
        </p>

        {/* Scroll arrow */}
        <div style={{
          position: "absolute",
          bottom: 36,
          left: "50%",
          fontSize: 14,
          color: "#a1a1aa",
          animation: "sancBounce 2.4s ease infinite",
          animationDelay: "1.5s",
        }}>
          ↓
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 28px" }}>

        {/* ── I. Zpráva ─────────────────────────────────────────────── */}
        {(textContent?.textBody || mediaContents.length > 0) && (
          <section
            className="sanc-reveal"
            style={{ paddingTop: 80, paddingBottom: 80, borderTop: "1px solid rgba(245,240,223,0.07)" }}
          >
            <SectionTag roman="I" label="Zpráva" />

            {textContent?.textBody && (
              <div
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontSize: "clamp(16px, 2vw, 18.5px)",
                  lineHeight: 1.95,
                  color: "rgba(245,240,223,0.9)",
                  fontWeight: 400,
                  letterSpacing: "0.01em",
                }}
                dangerouslySetInnerHTML={{ __html: textContent.textBody }}
              />
            )}

            {mediaContents.map((item) => (
              <MediaItem key={item.id} item={item} />
            ))}
          </section>
        )}

        {/* ── II. Galerie okamžiků ───────────────────────────────────── */}
        {hasMemories && (
          <section
            className="sanc-reveal"
            style={{
              paddingTop: 80,
              paddingBottom: 80,
              borderTop: "1px solid rgba(245,240,223,0.07)",
              transitionDelay: "0.15s",
            }}
          >
            <SectionTag roman="II" label="Galerie okamžiků" />

            {/* Photo grid */}
            {photoMemories.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8,
                marginBottom: avMemories.length + textMemories.length > 0 ? 36 : 0,
              }}>
                {photoMemories.map((m) => <MemoryPhoto key={m.id} memory={m} />)}
              </div>
            )}

            {/* Audio / video memories */}
            {avMemories.map((m) => <MemoryAV key={m.id} memory={m} />)}

            {/* Text-only memories */}
            {textMemories.length > 0 && (
              <div style={{ marginTop: avMemories.length > 0 ? 24 : 0 }}>
                {textMemories.map((m) => <MemoryTextCard key={m.id} memory={m} />)}
              </div>
            )}
          </section>
        )}

        {/* ── III. Manuál k životu ───────────────────────────────────── */}
        {blueprintItems.length > 0 && (
          <section
            className="sanc-reveal"
            style={{
              paddingTop: 80,
              paddingBottom: 80,
              borderTop: "1px solid rgba(245,240,223,0.07)",
              transitionDelay: "0.3s",
            }}
          >
            <SectionTag roman="III" label="Manuál k životu" />

            <p style={{
              fontSize: 14,
              color: "#a1a1aa",
              fontFamily: "var(--font-inter), sans-serif",
              lineHeight: 1.65,
              margin: "0 0 36px",
            }}>
              Záležitosti, o které je třeba se postarat. Kliknutím na položku ji odškrtni jako vyřízenou.
            </p>

            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
              <div style={{ flex: 1, height: 2, background: "rgba(245,240,223,0.06)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                  background: "rgba(201,169,110,0.55)",
                  borderRadius: 1,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <span style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "var(--font-inter), sans-serif", whiteSpace: "nowrap" }}>
                {doneCount} / {totalCount} vyřízeno
              </span>
            </div>

            {/* Grouped categories */}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 36 }}>
                <p style={{
                  fontSize: 10,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#a1a1aa",
                  fontFamily: "var(--font-inter), sans-serif",
                  margin: "0 0 12px",
                }}>
                  {CAT_LABELS[cat] ?? cat}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((item) => (
                    <BlueprintCard
                      key={item.id}
                      item={item}
                      done={handled.has(item.id)}
                      onToggle={() => toggleHandled(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Footer seal ───────────────────────────────────────────── */}
        <div style={{
          paddingTop: 60,
          paddingBottom: 80,
          borderTop: "1px solid rgba(245,240,223,0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}>
          <div style={{ opacity: 0.15 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 18c0-7 3-12 7-12s7 5 7 12" stroke="#f5f0df" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="12" cy="19" r="1.5" fill="#c9a96e"/>
            </svg>
          </div>
          <p style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(161,161,170,0.35)",
            fontFamily: "var(--font-inter), sans-serif",
            margin: 0,
            textAlign: "center",
          }}>
            Doručeno bezpečně prostřednictvím ARCA
          </p>
        </div>

      </div>
    </div>
  );
}
