import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { NebulaSwatch } from "@/components/marketing/concept/NebulaSwatch";
import { cz } from "@/components/marketing/concept/cz";
import { bvToKelvin, rgbToCss, starColor } from "@/components/marketing/concept/starColor";

// M0 concept board — everything the brief asks for before any scene code:
// hero variants, display fonts, procedural nebula, catalogue star colours,
// the verified stars for each year, and the technical proposal.

const SPECTRUM = [
  { name: "Barnardova hvězda", type: "M4V", bv: 1.57, ly: "5,96", note: "chladný červený trpaslík" },
  { name: "Titawin (υ And)", type: "F9V", bv: 0.536, ly: "43,96", note: "o něco teplejší než Slunce" },
  { name: "Vega (α Lyr)", type: "A0V", bv: -0.001, ly: "25,04", note: "horká, modrobílá" },
];

const STOPS = [
  { year: 2032, target: 6, star: "Barnardova hvězda", alias: "Gl 699 · HIP 87937", hyg: "5,95", second: "5,96 (Gaia DR3, ϖ 546,98 mas)", type: "M4V", mag: "9,5", eye: "dalekohled" },
  { year: 2044, target: 18, star: "Gliese 251", alias: "HIP 33226 · Wolf 294", hyg: "18,22", second: "18,21 (Gaia DR3, ϖ 179,06 mas)", type: "M3V", mag: "~10", eye: "dalekohled" },
  { year: 2051, target: 25, star: "Vega", alias: "α Lyrae · HIP 91262", hyg: "25,04", second: "25,04 (Hipparcos 2007, ϖ 130,23 mas)", type: "A0V", mag: "0,03", eye: "pouhým okem" },
  { year: 2070, target: 44, star: "Titawin", alias: "υ Andromedae · HIP 7513", hyg: "44,00", second: "43,96 (Gaia DR3, ϖ 74,19 mas)", type: "F9V", mag: "4,1", eye: "pouhým okem" },
];

const ATMOSPHERES = [
  { id: "nebula", label: "Výchozí", note: "hluboká modř" },
  { id: "sunset", label: "Soumrak", note: "teplý okraj mlhoviny" },
  { id: "ocean", label: "Oceán", note: "chladné modrozelené světlo" },
  { id: "midnight", label: "Půlnoc", note: "téměř bez mlhovin" },
  { id: "stars", label: "Hvězdy", note: "hustší pole, bez mlhovin" },
] as const;

const DIACRITICS = "Příliš žluťoučký kůň úpěl ďábelské ódy. „Až tohle budeš číst“ — 2044";

export default async function ConceptBoard() {
  const t = await getTranslations({ locale: "cs", namespace: "Marketing" });
  const title = t.rich("hero.title", { em: (c) => <em>{c}</em> });

  return (
    <main className="cx-board">
      {cz(<>
      <p className="cx-mono">ARCA v2 · Světlo na cestě · koncept M0 · k odsouhlasení</p>
      <h1 className="cx-display cx-display--newsreader" style={{ fontSize: "clamp(2.6rem, 6vw, 5.4rem)", marginTop: 18 }}>
        Zpráva je světlo, které vyrazí dnes a dorazí v den, kdy má.
      </h1>
      <p style={{ marginTop: 24 }}>
        Obsah, texty i logika současného webu zůstávají. Tahle stránka ukazuje jen novou formu: skutečné nebe z hvězdného katalogu,
        typografii a materiály. Scéna se zatím neprogramuje; vše níže je prototyp k rozhodnutí.
      </p>

      <section>
        <h2>1 · Hero: dvě varianty</h2>
        <p>Obě s ověřenými texty z webu a skutečnými hvězdami (HYG v4.4). Posuvník roku v živé verzi mění výšku pohledu a hloubku nebe; „Až tu nebudu“ nebe ztlumí. Doporučuji <b>A</b>: člověk stojí na Zemi a dívá se nahoru, takže zapečetěná zpráva se má odkud odlepit. B je čistší, ale obecnější.</p>
        {(["a", "b"] as const).map((v) => (
          <div key={v} className="cx-variant">
            <h3>{v === "a" ? "A · horizont Země + nebe" : "B · pohled do hloubky, bez horizontu"}</h3>
            <div className="cx-shots">
              <figure>
                <Image src={`/concept/renders/${v}-desktop.png`} alt={`Varianta ${v.toUpperCase()}, desktop 1440 px`} width={1440} height={900} />
                <figcaption className="cx-mono">desktop 1440 × 900</figcaption>
              </figure>
              <figure>
                <Image src={`/concept/renders/${v}-mobile.png`} alt={`Varianta ${v.toUpperCase()}, mobil 390 px`} width={1170} height={2532} />
                <figcaption className="cx-mono">mobil 390 × 844</figcaption>
              </figure>
            </div>
            <div className="cx-links cx-mono">
              <a href={`/concept/hero-${v}`}>Otevřít živě</a>
              <a href={`/concept/hero-${v}?font=instrument`}>· s Instrument Serif</a>
              <a href={`/concept/hero-${v}?font=bodoni`}>· s Bodoni Moda</a>
              <a href={`/concept/hero-${v}?atm=sunset`}>· atmosféra Soumrak</a>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>2 · Display font</h2>
        <p>Stejný nadpis, stejná velikost, ručně nastavený tracking. Všechny tři fonty jsou OFL (zdarma) a pokrývají češtinu. <b>PP Editorial New</b> do srovnání doplním, až pošleš zkušební soubory: zkušební verze se stahuje přes registraci u Pangram Pangram a produkce by vyžadovala placenou webovou licenci. Doporučuji <b>Newsreader</b> s optickou velikostí Display: lidský, klidný, kurzíva má charakter a dobře čte i v menších velikostech (citace zpráv).</p>
        {[
          { id: "newsreader", name: "Newsreader · Display opsz 72 · 300", meta: "OFL · Production Type · variabilní opsz 6–72 · latin-ext" },
          { id: "instrument", name: "Instrument Serif · 400", meta: "OFL · Instrument · už v aplikaci · bez optických velikostí · latin-ext" },
          { id: "bodoni", name: "Bodoni Moda · opsz 96 · 400", meta: "OFL · vysoký kontrast · variabilní opsz · latin-ext" },
        ].map((f) => (
          <div key={f.id} className="cx-fontrow">
            <p className="cx-mono">{f.name}</p>
            <div className={`cx-display cx-display--${f.id}`} role="heading" aria-level={3}>{title}</div>
            <p className={`cx-fontrow__test cx-display cx-display--${f.id}`} style={{ lineHeight: 1.2 }}>{DIACRITICS}</p>
            <div className="cx-fontrow__meta cx-mono"><span>{f.meta}</span></div>
          </div>
        ))}
        <div className="cx-fontrow">
          <p className="cx-mono">UI a text · Inter (opsz, ss01, cv11, ručně nastavený tracking)</p>
          <p style={{ fontSize: "1.15rem", maxWidth: "60ch" }}>{t("hero.lead")}</p>
          <p className="cx-mono" style={{ marginTop: 18 }}>Mono · Geist Mono: 2044 · 18 světelných let · Gliese 251</p>
          <p className="cx-mono cx-mono--jet">Mono · JetBrains Mono: 2044 · 18 světelných let · Gliese 251</p>
        </div>
      </section>

      <section>
        <h2>3 · Mlhovina a atmosféry</h2>
        <p>Procedurálně ve shaderu (domain-warped FBM), dvě vzdálené tlumené vrstvy a tmavé prachové pruhy. Žádné textury z internetu. Atmosféra mění jen odstín a hustotu mlhoviny (u „Hvězd“ hustotu hvězdného pole), nikdy barvu textu a nikdy do růžové či magenty. Klíče zůstávají, takže volba se dál přenáší do aplikace (<code>arca-vibe</code>).</p>
        <div className="cx-swatches">
          {ATMOSPHERES.map((a) => <NebulaSwatch key={a.id} atmosphere={a.id} label={a.label} note={a.note} />)}
        </div>
      </section>

      <section>
        <h2>4 · Barva hvězdy podle spektra</h2>
        <p>Barva se počítá z barevného indexu B–V v katalogu: B–V → teplota (Ballesteros 2012) → sRGB (aproximace záření černého tělesa), stažená k bílé, protože oko vidí hvězdy mnohem bělejší. Výsledek je teplý nebo chladný odstín, nikdy neon.</p>
        <div className="cx-stars">
          {SPECTRUM.map((s) => {
            const c = rgbToCss(starColor(s.bv));
            return (
              <div key={s.name} className="cx-star">
                <div className="cx-star__dot" style={{ background: `radial-gradient(circle, ${c} 0%, ${c} 9%, transparent 62%)` }} aria-hidden="true" />
                <h3>{s.name}</h3>
                <p className="cx-mono">{s.type} · B–V {(Math.abs(s.bv) < 0.005 ? 0 : s.bv).toFixed(2).replace(".", ",")} · {Math.round(bvToKelvin(s.bv) / 50) * 50} K · {s.ly} ly</p>
                <p style={{ margin: "6px 0 0", fontSize: "0.92rem" }}>{s.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2>5 · Hvězdy pro ukázkové zprávy</h2>
        <p>Pro každý rok hvězda ve vzdálenosti „rok − 2026“ světelných let (±0,5 ly). Vzdálenost z HYG v4.4 a z druhého, nezávislého zdroje (SIMBAD: paralaxa Gaia DR3, u Vegy Hipparcos). Příklady ze zadání do tolerance nespadají: Sigma Draconis 18,77 ly, Delta Pavonis 19,92 ly, 47 UMa 45,87 ly.</p>
        <table className="cx-table">
          <thead>
            <tr><th>Rok</th><th>Cíl</th><th>Hvězda</th><th>HYG v4.4</th><th>Druhý zdroj (SIMBAD)</th><th>Spektrum · mag</th><th>Viditelnost</th></tr>
          </thead>
          <tbody>
            {STOPS.map((s) => (
              <tr key={s.year}>
                <td className="cx-mono" style={{ color: "var(--cx-star)" }}>{s.year}</td>
                <td className="cx-mono">{s.target} ly</td>
                <td><span className="cx-amber">{s.star}</span><br /><span className="cx-mono">{s.alias}</span></td>
                <td className="cx-mono">{s.hyg} ly</td>
                <td className="cx-mono">{s.second} ly</td>
                <td className="cx-mono">{s.type} · {s.mag}</td>
                <td className="cx-mono">{s.eye}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 18 }}>Důsledek pro texty: Barnardova hvězda a Gliese 251 nejsou vidět pouhým okem. Věta „Světlo, které z ní vidíš dnes…“ proto u první zastávky potřebuje přesnější znění, třeba „Světlo, které z ní dnes dorazí, vyrazilo v roce, kdy byla zpráva napsána.“ Navrhnu v M4.</p>
      </section>

      <section>
        <h2>6 · Technický návrh (zatím se neprogramuje)</h2>
        <ul className="cx-list">
          <li><b>Three.js 0.186.1</b> (přesně připnuto), načtené až po prvním vykreslení textu; LCP zůstává nadpis.</li>
          <li><b>Hvězdy:</b> jeden <code>Points</code> s vlastním shaderem (velikost podle magnitudy, barva podle B–V, pomalé mihotání). Katalog předpočítaný do binárního bufferu, ~30 tis. hvězd. Prototyp má 467 kB gzip, produkce bude &lt; 300 kB (16bit pozice + 8bit magnituda a barva).</li>
          <li><b>Kamera:</b> Catmull-Rom křivka přes body cesty, Lenis + GSAP ScrollTrigger se scrubem 0,8 s. Myš natočí pohled nejvýš o 1,5°. Při omezeném pohybu kamera stojí a sekce se prolínají.</li>
          <li><b>Výkon:</b> DPR max 1,5, rozlišení 0,66–1× podle FPS, pauza mimo viewport i ve skryté záložce, jen jeden lehký bloom (světlo zprávy). Fallback: statický AVIF snímek nebe.</li>
          <li><b>Data:</b> HYG Database v4.4, CC BY-SA 4.0. V patičce řádek „Hvězdná data: HYG Database (CC BY-SA 4.0), ESA Hipparcos / Gaia“; datový soubor pod stejnou licencí.</li>
        </ul>
      </section>

      <section>
        <h2>7 · K rozhodnutí</h2>
        <ul className="cx-list">
          <li>Hero A, nebo B?</li>
          <li>Display font: Newsreader, Instrument Serif, Bodoni Moda, nebo počkat na PP Editorial New (zkušební soubory a licence)?</li>
          <li>Mono: Geist Mono (doporučuji, klidnější), nebo JetBrains Mono?</li>
          <li>Hvězdy pro roky 2032 / 2044 / 2051 / 2070 podle tabulky?</li>
        </ul>
      </section>

      <p className="cx-mono" style={{ marginTop: 48 }}>Hvězdná data: HYG Database v4.4 (CC BY-SA 4.0), codeberg.org/astronexus/hyg · vzdálenosti ověřeny v SIMBAD (CDS) z paralax Gaia DR3 / Hipparcos.</p>
      </>)}
    </main>
  );
}
