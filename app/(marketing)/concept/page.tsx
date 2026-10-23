import Image from "next/image";
import { cz } from "@/components/marketing/concept/cz";

// M0b concept board — static renders and a flight video from the prepared
// Three.js scene (components/marketing/concept/scene), all captured on a real
// GPU. Replaces the M0 board; M0 decisions are recorded at the bottom.

const ATMOSPHERES = [
  { id: "nebula", label: "Výchozí", note: "hluboká modř" },
  { id: "sunset", label: "Soumrak", note: "teplý, jantarový prach" },
  { id: "ocean", label: "Oceán", note: "chladná modrozelená" },
  { id: "midnight", label: "Půlnoc", note: "tlumené indigo, skoro nic" },
  { id: "stars", label: "Hvězdy", note: "bez mlhovin, hustší pole" },
] as const;

const STOPS = [
  { year: 2032, star: "Barnardova hvězda", ly: "5,96", src: "Gaia DR3" },
  { year: 2044, star: "Gliese 251", ly: "18,21", src: "Gaia DR3" },
  { year: 2051, star: "Vega", ly: "25,04", src: "Hipparcos 2007" },
  { year: 2070, star: "Titawin (υ And)", ly: "43,96", src: "Gaia DR3" },
];

function Shots({ name, alt }: { name: string; alt: string }) {
  return (
    <div className="cx-shots">
      <figure>
        <Image src={`/concept/m0b/${name}-d.jpg`} alt={`${alt}, desktop 1440 px`} width={1440} height={900} />
        <figcaption className="cx-mono">desktop 1440 × 900</figcaption>
      </figure>
      <figure>
        <Image src={`/concept/m0b/${name}-m.jpg`} alt={`${alt}, mobil 390 px`} width={1170} height={2532} />
        <figcaption className="cx-mono">mobil 390 × 844</figcaption>
      </figure>
    </div>
  );
}

export default function ConceptBoard() {
  return (
    <main className="cx-board">
      {cz(<>
      <p className="cx-mono">ARCA v2 · Světlo na cestě · koncept M0b · k odsouhlasení</p>
      <h1 className="cx-display cx-display--newsreader" style={{ fontSize: "clamp(2.6rem, 6vw, 5.4rem)", marginTop: 18 }}>
        Hloubka, měřítko a světlo.
      </h1>
      <p style={{ marginTop: 24 }}>
        Všechno níže je vyrenderované z jedné připravené Three.js scény (ne CSS) na reálném GPU, v desktopovém i mobilním poměru.
        Hvězdy jsou skutečné: 30 tisíc nejjasnějších z katalogu HYG na svých 3D pozicích. Jas, velikost i barvu mají podle skutečné
        vzdálenosti od kamery a spektra. Proto se při letu blízké hvězdy rozjasňují a vzdálené zůstávají na místě.
      </p>

      <section>
        <h2>1 · Louka v noci (hero A)</h2>
        <p>Tři vrstvy krajiny s vlastní paralaxou: vzdálené kopce v oparu, zalesněný hřbet a louka s trávou. Svit nad obzorem (chladná airglow, vlevo teplé světlo vzdáleného města), mlha v údolích mezi vrstvami. Hvězdy u obzoru slábnou (atmosféra), Mléčná dráha leží tam, kde na skutečném nebi. Odrazy hvězd nikde. Spodní třetina zůstává tmavá: tam bude nadpis a karta.</p>
        <Shots name="meadow" alt="Noční louka pod Mléčnou drahou" />
        <div className="cx-links cx-mono"><a href="/concept/scene?shot=meadow">Otevřít živě</a></div>
      </section>

      <section>
        <h2>2 · Let k první hvězdě (10 s)</h2>
        <p>Kamera se zvedne od obzoru, krajina a atmosféra zmizí, pak let po logaritmické vzdálenosti k Barnardově hvězdě (5,96 ly, rok 2032). Z louky ji okem nevidíš (9,5 mag). Během letu se vynoří jako červený bod a roste až do posledního snímku. Slabé částice kolem kamery dávají pocit rychlosti (jen vodítko hloubky, ne „warp“). Hrubé tempo, jde o pocit.</p>
        <div className="cx-shots">
          <figure>
            <video poster="/concept/flight-poster.jpg" controls muted loop playsInline preload="metadata" width={1280} height={720}>
              <source src="/concept/flight-16x9.webm" type="video/webm" />
              <source src="/concept/flight-16x9.mp4" type="video/mp4" />
            </video>
            <figcaption className="cx-mono">16 : 9 · 1280 × 720 · webm / mp4 (H.264, iOS)</figcaption>
          </figure>
          <figure>
            <video poster="/concept/flight-poster-m.jpg" controls muted loop playsInline preload="metadata" width={720} height={1280}>
              <source src="/concept/flight-9x16.webm" type="video/webm" />
              <source src="/concept/flight-9x16.mp4" type="video/mp4" />
            </video>
            <figcaption className="cx-mono">9 : 16 · 720 × 1280 · webm / mp4</figcaption>
          </figure>
        </div>
        <div className="cx-links cx-mono"><a href="/concept/scene?shot=flight">Otevřít živě (smyčka)</a></div>
      </section>

      <section>
        <h2>3 · Zastávky na cestě</h2>
        <p><b>Vega, 2051, 25 ly.</b> Hvězda je zdroj světla: jádro, koróna a pomalé paprsky v barvě podle spektra (A0, modrobílá). Kroužek ukazuje, kde je odtud Slunce: obyčejná slabá hvězdička.</p>
        <Shots name="vega" alt="Vega zblízka s korónou, v dálce Slunce" />
        <p style={{ marginTop: 40 }}><b>Titawin (υ Andromedae), 2070, 44 ly.</b> Kolem téhle hvězdy skutečně obíhají planety (υ And b, c, d). Jedna tu prochází před hvězdou jako silueta: tmavý kotouč s tenkým fresnelovým okrajem a světlem, které se láme přes okraj.</p>
        <Shots name="titawin" alt="Titawin s tmavou planetou před hvězdou" />
        <div className="cx-links cx-mono">
          <a href="/concept/scene?shot=vega">Vega živě</a>
          <a href="/concept/scene?shot=titawin">· Titawin živě</a>
        </div>
      </section>

      <section>
        <h2>4 · Atmosféry</h2>
        <p>Mlhoviny jsou výraznější a každá atmosféra má vlastní barvu i strukturu: domain-warped šum ve dvou měřítkách, světlejší uzly uvnitř oblaků a tmavý prach. Pořád tlumené, žádná magenta. Vlevo pohled ze Slunce do středu Galaxie, vpravo stejná atmosféra nad loukou.</p>
        <div className="cx-atm">
          {ATMOSPHERES.map((a) => (
            <figure key={a.id}>
              <div className="cx-atm__pair">
                <Image src={`/concept/m0b/deep-${a.id}.jpg`} alt={`${a.label}: pohled do středu Galaxie`} width={1440} height={900} />
                <Image src={`/concept/m0b/meadow-${a.id}.jpg`} alt={`${a.label}: louka`} width={1440} height={900} />
              </div>
              <figcaption className="cx-mono">{a.label} · {a.note} · <a href={`/concept/scene?shot=deep&atm=${a.id}`}>živě</a></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2>5 · Co je skutečné a co ilustrace</h2>
        <ul className="cx-list">
          <li><b>Skutečné:</b> pozice, jas a barva hvězd (HYG v4.4), poloha Mléčné dráhy (galaktické souřadnice), poloha Slunce z Vegy a Titawinu, vzdálenosti zastávek.</li>
          <li><b>Ilustrace:</b> mlhoviny (procedurální, aby atmosféry měly barvu), krajina, velikost korón (zvětšené kvůli čitelnosti), vzhled planety u Titawinu, částice při letu.</li>
          <li><b>Výkon prototypu:</b> jedna scéna, 30 tisíc hvězd v jednom <code>Points</code>, nebe a krajina jako dva fullscreen shadery. Katalog má teď 517 kB gzip, v produkci ho zmenším pod 300 kB.</li>
        </ul>
      </section>

      <section>
        <h2>6 · Rozhodnuto v M0</h2>
        <ul className="cx-list">
          <li>Hero A (horizont), display font Newsreader, mono Geist Mono.</li>
          <li>Hvězdy pro ukázkové zprávy: {STOPS.map((s, i) => <span key={s.year}>{i > 0 ? ", " : ""}{s.year} {s.star} ({s.ly} ly, {s.src})</span>)}.</li>
        </ul>
      </section>

      <section>
        <h2>7 · K rozhodnutí</h2>
        <ul className="cx-list">
          <li>Je tohle úroveň, se kterou jdeme do M1 (scéna v produktu)?</li>
          <li>Krajina: smrky a listnáč takhle, nebo střídmější (jen hřbety a les)?</li>
          <li>Částice při letu ponechat, nebo let jen s hvězdami?</li>
          <li>Síla atmosfér: Soumrak a Oceán jsou teď nejvýraznější. Ponechat, nebo ztlumit?</li>
        </ul>
      </section>

      <p className="cx-mono" style={{ marginTop: 48 }}>Hvězdná data: HYG Database v4.4 (CC BY-SA 4.0), codeberg.org/astronexus/hyg · vzdálenosti ověřeny v SIMBAD (CDS) z paralax Gaia DR3 / Hipparcos.</p>
      </>)}
    </main>
  );
}
