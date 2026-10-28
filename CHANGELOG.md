# Changelog

## [1.64.0] - Web v3 „Oběhy“, milník M0: koncept ve skutečné scéně
Nový veřejný web začíná znovu od scény: jedna jízda kamery od nízké oběžné dráhy Země přes oběhy kolem Slunce, Jupiter a Saturn až k pohledu na Mléčnou dráhu a zpět. Rok = jeden oběh Země; zpráva pro rok 2044 čeká 18 oběhů a každý z nich zanechá stopu. Tento milník jsou koncepční rendery (Země z oběžné dráhy, zastávka 2044 s oběhy, Saturn, Galaxie), video oddálení a statický hero + jedna zastávka s finální typografií. Louka, hvězdné zastávky a všechny komponenty v2, které v3 nepoužije, jsou smazané.

### Přidáno
- `components/marketing/cosmos/` — scéna v3: `engine.ts` (Three.js 0.186, floating origin v jednotkách au, logaritmický depth buffer, adaptivní rozlišení, panel `?perf=1`), `journey.ts` (záběry pro každou sekci, logaritmická vzdálenost kamery, oběhy; testy), `ephemeris.ts` (polohy planet podle přibližných Keplerových prvků JPL, Měsíc podle Astronomical Almanac, rotace Země podle GMST, galaktická soustava; testy proti referenčním hodnotám), shadery pro Zemi (den/noc/oblaka/odlesk oceánu/atmosféra s Rayleighovým a Mieho rozptylem), planety, Saturnovy prstence se stíny, Slunce s korónou, oběžné dráhy, stopu oběhů Země a procedurální Mléčnou dráhu.
- `public/cosmos/tex/` — textury v KTX2 (Basis ETC1S, 3,4 MB celkem): NASA Blue Marble (4k), Black Marble (4k), oblačnost, Měsíc z LRO (volné dílo); normálová a specular mapa Země a planety ze Solar System Scope (CC BY 4.0, poděkování v patičce). `scripts/build-cosmos-textures.mjs` (sharp + ktx2-encoder) je sestaví ze zdrojů; licence v `public/cosmos/TEXTURES-LICENSE.md`. Transcoder Basis v `public/cosmos/basis/`.
- `public/cosmos/stills/` — AVIF/JPG snímky čtyř klíčových pohledů z téže scény: hero se zobrazí okamžitě, bez WebGL se snímky přepínají podle scrollu.
- Hero: nadpis přes osm sloupců (Newsreader opsz 72, 10,5 vw), Země zprava, ukázka zprávy pod ním. Zastávky: obří rok vystředěný, ukázka zprávy v jantarové kurzívě, mono řádek s počtem oběhů, prsteny oběhů v pozadí. Nová sekce „Některá slova mají přijít později.“ přes celou šířku a tichý pohled na Galaxii.
- `messages/*.json` — počet oběhů (plurály), poznámka o oběhu, titulek Galaxie, poděkování za textury a polohy planet v patičce, text po zapečetění s oběhy.
- `proxy.ts` — `/cosmos/` (statické soubory scény) mimo matcher proxy.

### Změněno
- `app/(marketing)/layout.tsx`, `components/marketing/landing/` — sekce ukotvené na nové záběry cesty; typografie: text 18 px, lead 22 px, mono 0,8 rem, kompozice se mezi sekcemi střídá.
- Katalog hvězd (`stars.bin`, HYG) přesunut do `components/marketing/cosmos/`; `scripts/build-sky-catalog.mjs` zapisuje tam.

### Odstraněno
- `components/marketing/sky/` (nebe v2, louka, snímky louky), `components/marketing/scene/` a nepoužívané komponenty webu v1 (`HeroComposer`, `Odometer`, `LifeTimeline`, `MarketingNav`, `MarketingFooter`, …, `marketing.css`).

## [1.63.0] - Web v2, milník M2: typografie a rozvržení ve scéně
Všechny sekce stojí staticky ve skutečném nebi, v češtině i angličtině: text sedí na scéně jako titulky ve filmu (Newsreader, Inter s `ss01`/`cv11`, Geist Mono), karty jen tam, kde je zpráva nebo plán (matný obsidián, žádné sklo). Ukázkové zprávy jsou zastávky u hvězd ve vzdálenosti „rok − 2026“ světelných let. Animace přijdou v M3–M6.

### Přidáno
- `components/marketing/landing/` — nové sekce (hero s ukázkou zprávy, cesta ke hvězdám jako seznam zastávek, Pro koho, Jak to funguje, Strážci, Atmosféry, Bezpečnost, Ceník, FAQ, závěr, patička), `Waypoint` (sekce = obsah, během kterého kamera stojí, + krátký přelet k další), česká typografie (nezlomitelné mezery po jednopísmenných předložkách a mezi číslem a jednotkou).
- `app/(marketing)/layout.tsx` — vlastní kořenový layout webu: jen fonty, scéna a i18n (na serveru; klientské komponenty dostávají texty jako props). Bez providerů aplikace, bez CSS aplikace, bez Sentry.
- `app/global-not-found.tsx` — 404 pro neexistující adresy (web a aplikace mají oddělené kořenové layouty).
- `messages/*.json` — názvy hvězd, vzdálenost ve světelných letech, věta o světle u první zastávky, poděkování za hvězdná data v patičce.
- Hero je vidět okamžitě: statický snímek louky (AVIF/WebP, vykreslený touto scénou se stejnou projekcí), WebGL se přes něj prolne bez skoku.

### Změněno
- `app/(app)/` — aplikace (layout, `globals.css`, `dashboard`, `login`, `arca`, `guardian`, `contribute`, `(sanctuary)`) přesunuta do skupiny tras; URL beze změny. Přechod mezi webem a aplikací je plné načtení stránky.
- `instrumentation-client.ts` — na marketingových stránkách se Sentry nenačítá; jinde se načte jako samostatný chunk a inicializuje hned po načtení.
- `components/marketing/atmosphere.tsx` — atmosféra se čte a ukládá přímo pod klíčem `arca-vibe` (stejně jako `VibeProvider` aplikace), takže se volba dál přenáší.
- Scéna: Barnardova hvězda a Gliese 251 (červení trpaslíci) mají teplejší barvu a menší, slabší korónu; Vega je velká a modrobílá. Hvězda zastávky je na širokých obrazovkách vpravo (text vlevo), na telefonu nahoře (text pod ní). Louka se počítá od středu obrazovky, takže vypadá stejně na každém poměru stran.
- `next.config.ts` — `experimental.globalNotFound`.

### Opraveno
- Uložená atmosféra se na webu nepoužila, pokud ji prohlížeč načetl až po spuštění scény.

## [1.62.0] - Web v2, milník M1: scéna ze skutečného katalogu hvězd
Nový veřejný web („Světlo na cestě“): jedna Three.js scéna za celou stránkou, kamera řízená scrollem letí od louky přes Barnardovu hvězdu, Gliese 251, Vegu a Titawin (silueta planety) podél Mléčné dráhy a zpátky pohledem domů.

### Přidáno
- `components/marketing/sky/` — engine (Three.js 0.186.1), shadery, cesta kamery (`journey.ts`, testy), katalog (`stars.bin`, 30 005 hvězd z HYG v4.4, 8 B na hvězdu, 240 kB) a jeho dekodér s testy. Mléčná dráha a mlhoviny se pro každou atmosféru předpočítají do cube mapy, přepnutí atmosféry se prolne za 1,2 s.
- `scripts/build-sky-catalog.mjs` — sestavení katalogu z HYG (CC BY-SA 4.0).
- Výkon: DPR max 1,5, adaptivní rozlišení (100/83/66 %), pauza ve skryté záložce, Three.js a katalog až po prvním vykreslení. Bez WebGL statický snímek, `prefers-reduced-motion` = střih přes ztmavení místo letu.
- `?perf=1` — panel s FPS, GPU a rozlišením a 40s test celé cesty se souhrnem po sekcích.
- Závislosti: `three@0.186.1`, `lenis@1.3.26`, `@types/three@0.186.0` (přesně připnuté).

## [1.58.11] - Bezpečnost: Next.js 16.4.0 → 16.4.2
`npm audit` hlásil u Next.js 16.4.0 kritické zranitelnosti: neautentizované vzdálené spuštění kódu v Image Optimization API při použití SVG, DoS v App Routeru přes Server Actions a vzdálené spuštění kódu v `use cache` funkcích vracejících typed arrays. Opraveno v 16.4.2 (patch verze).

### Změněno
- `package.json`, `package-lock.json` — `next` 16.4.2. Build, typy, lint a testy beze změny chování.

## [1.61.1] - Nový web: plynulé zapečetění na mobilu
Měření v mobilním Chromu (Android emulátor) ukázalo, že při zapečetění padá snímková frekvence na ~40 fps se 14 snímky delšími než 50 ms: skládání karty do orbu se animovalo přes `clip-path` (z JavaScriptu se v Chromu nekompozituje, takže se každý snímek překreslovala vrstva velká jako karta — na mobilu přes 1000 px při DPR 2,6) a celý formulář se rozostřoval filtrem.

### Opraveno
- `components/marketing/HeroComposer.tsx`, `marketing.css` — orb se skládá jen přes `transform` (scale z velikosti viditelné části karty na velikost orbu) a `opacity`, obojí na kompozitoru; rozostření formuláře jen na zařízeních s myší. Výsledek v emulátoru: 53–58 fps, 2–5 delších snímků; na desktopu (Apple M4 Max, Chrome) celá sekvence 60 fps bez jediného dlouhého snímku.

## [1.61.0] - Nový web, milník M3: zapečetění zprávy v hero
Hero je teď celý zážitek: návštěvník napíše zprávu, vybere komu a kdy — a při tažení posuvníkem let se mění barva světla za hero (blízká budoucnost ranní a teplá, vzdálená hluboce modrá, „až tu nebudu“ noční). Po „Zapečetit“ se v kartě shromáždí světlo, slova se v něm rozpustí, karta se složí do zářícího orbu, ten převezme WebGL scéna (skutečný lom světla) a orb pomalu stoupá a mizí v hloubce mezi ostatními světly, které se na okamžik rozzáří. Rok mezitím doroluje na zvolený rok. Nic se neodesílá.

### Přidáno
- `components/marketing/HeroComposer.tsx` — sekvence v GSAP (`@gsap/react`); orb se animuje přes `clip-path`/`transform`, takže žádný posun layoutu (CLS 0). Bez WebGL letí DOM orb; `prefers-reduced-motion` = jen tiché prolnutí. Výsledek ohlášen přes `aria-live`, fokus přejde na „Ulož ji doopravdy“. Na mobilu se orb i výsledek drží ve viditelné části karty.
- `components/marketing/Odometer.tsx` — rok rolující po číslicích v pevných sloupcích (znovu použije časová osa v M4).
- `lib/marketing/landing-draft.ts` — rozepsaná zpráva v `localStorage` (vše v try/catch, platnost 30 dní).
- `app/dashboard/arca/new/ComposeWizard.tsx` — po registraci composer nabídne „Rozepsanou zprávu z webu“: text, režim i spouštěč (rok → „za X let“, 18. narozeniny → věkový milník, „až tu nebudu“ → zapečetit); použije se jen po kliknutí.
- `app/login/LoginForm.tsx` — `?mode=signup` otevře rovnou registraci; `?next=` (jen cesty v rámci webu) určí, kam pokračovat. Pro potvrzení e-mailem a Google jede cíl v krátké cookie, ne v návratové adrese Supabase — ta tak dál přesně odpovídá allow-listu.
- `lib/auth/safe-next.ts` — kontrola, že `next` je cesta na tomto webu.

### Změněno
- `app/api/auth/callback/route.ts` — vedle `?next=` (ověřeného od 1.58.9) čte cíl i z krátké cookie `arca_next` a po použití ji smaže.
- `proxy.ts` — přihlášený uživatel na `/login?next=…` pokračuje rovnou na `next` (dřív vždy na dashboard).

### Změněno
- `messages/*.json` — texty o strážcích na webu platí pro všechny zprávy „až tu nebudu“ (od opravy 1.58.5 je to pravda).
- Závislosti: `gsap@3.15.0`, `@gsap/react@2.1.2` (přesně připnuté).

## [1.60.0] - Nový web, milník M2: světelná scéna se skleněnými orby
Pozadí celého webu je teď živá WebGL scéna: světelné pole v barvách zvolené atmosféry, skleněné orby (zprávy, které čekají) s lomem světla, jemnou barevnou disperzí, fresnelovým okrajem a vlastním světlem uvnitř, a drobná vzdálená světla. Pomalu plují, reagují jemně na pohyb myši a scroll (bližší orby víc, vzdálenější míň) a při přepnutí atmosféry plynule přejdou do nových barev.

### Přidáno
- `components/marketing/scene/` — holé WebGL 1 (jeden fragment shader, bez three.js; celá scéna má ~5 kB gzip v samostatném chunku), načítané přes `next/dynamic` bez SSR.
- Adaptivní kvalita: rozlišení vykreslování je omezené (DPR max 1,5, 42–70 % CSS pixelů), slabší zařízení startují níž, při pomalých snímcích scéna sama sníží úroveň; na nejnižší úrovni vypne `backdrop-filter` na skle, a když nepomůže ani to, zůstane statický snímek. Zařízení zamčené na 30 fps (úsporný režim) se za pomalé nepovažuje.
- Smyčka se zastaví ve skryté záložce. `prefers-reduced-motion`: žádná smyčka ani parallaxa, jen statický snímek.
- Fallback: bez WebGL (nebo při ztrátě kontextu) zůstává CSS pozadí z M1 — zároveň slouží jako placeholder stejné velikosti, plátno se plynule objeví až po prvním vykresleném snímku.

## [1.59.0] - Nový web, milník M1: kostra všech sekcí
První milník nového veřejného webu („Světlo, které cestuje časem“). Všechny sekce stojí staticky a responzivně (375–1920 px), v češtině i angličtině, na design tokenech aplikace. Animace, WebGL scéna a předání konceptu zprávy do editoru přijdou v dalších milnících.

### Přidáno
- `app/(marketing)/` — landing na `/` (jazyk podle cookie / prohlížeče) a nově na `/en` a `/cs` (pevný jazyk, `hreflang`, canonical). `components/marketing/` — navigace, interaktivní ukázka zprávy v hero (skutečné textové pole, volba adresáta a roku, zapečetění s ohlášením přes `aria-live`), časová osa jednoho života, Pro koho, Jak to funguje, Strážci, Tvůj vlastní svět (přepínač atmosféry sdílený s aplikací přes `arca-vibe`), Bezpečnost, Ceník, FAQ, závěrečná výzva, patička.
- `lib/marketing/pricing.ts` — ceny se načítají ze stejných Stripe cen, které účtuje checkout (`STRIPE_PRICE_MONTHLY`/`_LIFETIME`, cache 1 h), limit plánu Zdarma z `FREE_LIMITS`. Bez Stripe se částka nezobrazí.
- `lib/marketing/operator.ts` + `.env.example` — provozovatel v patičce z `NEXT_PUBLIC_OPERATOR_*`, nic natvrdo.
- `messages/*.json` — nový jmenný prostor `Marketing`; všechna tvrzení ověřená proti kódu.

### Změněno
- `proxy.ts` — marketingové stránky přeskakují dotaz na Supabase a určují jazyk stránky hlavičkou `x-arca-locale`. `i18n/request.ts` hlavičku respektuje a na Supabase/DB se ptá jen při existující session cookie (anonymní návštěva bez síťového volání navíc).
- `components/VibeBackground.tsx` — na marketingových stránkách se nevykresluje (mají vlastní scénu, nestahuje se fotka pozadí).
- `app/layout.tsx` — fonty se subsetem `latin-ext`, aby česká diakritika nepadala na náhradní font (i v aplikaci).
- `app/sitemap.ts` — přidány `/en` a `/cs`.

### Odstraněno
- `app/page.tsx` a jmenný prostor `Landing` (starý landing).
## [1.58.10] - Oprava: volba „Opakování: každý rok“ nic nedělala
U doručení „V daný den“ composer nabízel výběr „Opakování: Jednorázově / Každý rok“. Výběr se nikam neodesílal a opakované doručení v aplikaci neexistuje — kdo zvolil „Každý rok“, dostal jedno doručení a myslel si, že jich bude víc.

### Opraveno
- `app/dashboard/arca/new/ComposeWizard.tsx`, `messages/*.json` — výběr opakování odstraněn (stejně jako dřív „Při události“). Doručení na datum je jednorázové, jak vždy fungovalo.

## [1.58.9] - Oprava: otevřené přesměrování v přihlašovacím callbacku
`/api/auth/callback` skládal cíl jako `${origin}${next}` bez kontroly parametru `next`. Hodnota `@evil.com` z toho udělala `https://arca…@evil.com`, tedy přesměrování na cizí web hned po přihlášení.

### Opraveno
- `lib/auth/safe-next.ts` (nové) — povolí jen cesty v rámci webu (`/…`), ne `//…`, `/\…`, `@…` ani celé URL; `app/api/auth/callback/route.ts` ho používá, jinak `/dashboard`.

## [1.58.8] - Oprava: volba „Při události“ slibovala doručení, které neexistovalo
Composer v režimu „Odkaz pro blízké“ nabízel spouštěč „Při události“ (18 let, svatba, narození prvního dítěte) s textem „Strážci potvrdí, že okamžik nastal. ARCA pak zprávu doručí.“ Žádný takový mechanismus v aplikaci není: výběr události se ani neodesílal, server nevytvořil žádný spouštěč a zpráva se po „Zapečetit a uložit“ tiše uložila jako koncept, který se nikdy nedoručí.

### Opraveno
- `app/dashboard/arca/new/ComposeWizard.tsx`, `messages/*.json` — volba „Při události“ odstraněna (včetně slibu o strážcích). Zůstávají funkční možnosti: konkrétní den a „Zapečetit, až tu nebudu“.
- `app/actions/arca.ts` — „Zapečetit a uložit“ bez platného spouštěče server odmítne s hláškou místo tichého uložení konceptu.

Existující data: dotčené zprávy jsou uložené jako koncepty — nic se nemění, autor je může dál upravit a aktivovat s funkčním spouštěčem.

## [1.58.7] - Oprava: „Zrušit doručení“ v editoru ukazovalo zrušení, které se nestalo
Tlačítko „Zrušit doručení“ v editoru zprávy volalo `cancelDelivery`, které aktivní zprávu odmítne (umí jen zprávy v ochranné lhůtě) — ale editor výsledek ignoroval a zprávu rovnou zobrazil jako koncept. Autor si tak myslel, že doručení zastavil, a zpráva dál čekala na svůj den.

### Opraveno
- `app/actions/delivery.ts` — nová akce `deactivatePack`: aktivní zprávu, i zprávu v ochranné lhůtě nebo čekající na strážce, vrátí do konceptu (crony koncepty nezpracovávají), resetuje spouštěč a zneplatní nevyužité odkazy strážců. Přechod je hlídaný stavem, takže zpráva, kterou cron právě doručil, se nepřepne zpátky.
- `components/arca/ArcaEditorNew.tsx` — editor ukáže koncept až po úspěchu na serveru, jinak chybu; tlačítko je dostupné i ve stavu „čeká na strážce“.

## [1.58.6] - Oprava: adresát se nedostal ke zprávě přes kontrolní otázku
Osoba přidaná přes Schránku → „Přidat osobu“ s kontrolní otázkou měla odpověď uloženou jako nesolený SHA-256 hash, ale všechna místa, která odpověď ověřují (stránka doručení `/arca/…` i `/s/…`), čekala formát `sůl:scrypt`. Ověření tak vždy selhalo a adresát svou zprávu neotevřel ani se správnou odpovědí.

### Opraveno
- `lib/challenge-answer.ts` (nové) — jedno místo pro hashování i ověření odpovědí; staré nesolené hashe se dál přijímají, takže dotčení adresáti zprávu otevřou bez migrace dat.
- `app/actions/contacts.ts` — ukládá odpověď ve stejném formátu jako zbytek appky.
- `app/actions/delivery.ts`, `app/actions/unlock.ts`, `app/actions/sanctuary.ts` — používají sdílený modul místo tří kopií.

### Přidáno
- `lib/challenge-answer.test.ts`.

## [1.58.5] - Oprava: „Zapečetit, až tu nebudu“ teď prochází strážci
Nejdůležitější slib produktu nefungoval. Zpráva vytvořená v composeru volbou „Zapečetit, doručit, až tu nebudu“ dostala spouštěč `MANUAL_EMERGENCY`, který doručovací cron vůbec nezpracovával. Doručit ji uměl jen globální spínač v nastavení (ve výchozím stavu vypnutý), a ten obcházel strážce a autorovi nic nepsal. Composer navíc sliboval „otevře se až poté, co tři strážci nezávisle potvrdí, předtím nikdo, ani my, neuvidí obsah“, což nebyla pravda ani zčásti.

### Opraveno
- `lib/triggers/inactivity.ts` (nové) — jedna cesta pro všechno, co se doručuje „po dlouhém tichu“: když má autor strážce, dostanou e-mail s odkazy „je v pořádku“ / „uvolnit“ (72 h); bez strážců dostane varování autor. Zpráva se atomicky „zabere“ (jen z `ACTIVE`), takže dva crony běžící ve stejnou minutu nepošlou e-maily dvakrát.
- `app/api/cron/process-triggers/route.ts` — sweep B zpracovává i zapečetěné zprávy (`MANUAL_EMERGENCY`); limit nečinnosti bere ze spouštěče, jinak z nastavení uživatele (výchozí 90 dní).
- `app/api/cron/pulse/route.ts` — globální spínač na neaktivitu jde stejnou cestou přes strážce (dřív rovnou do ochranné lhůty bez e-mailu). Spínač na konkrétní datum beze změny.
- `app/actions/delivery.ts` — `cancelDelivery` zruší doručení i ve stavu „čeká na strážce“ (dashboard tyhle zprávy nabízel ke zrušení, ale akce je odmítla) a zneplatní nevyužité odkazy strážců.
- `lib/auth/activity.ts` (nové) + `app/dashboard/layout.tsx` — používání dashboardu se počítá jako aktivita (nejvýš jeden zápis za 12 h). Dřív se `lastActiveAt` obnovovalo jen při přihlášení heslem / přes e-mail, check-inu a heartbeatu — uživatel s dlouhou session by po 90 dnech vypadal neaktivní a strážcům by odešly e-maily, i když appku normálně používá.
- `messages/*.json` — pravdivý popis volby „Zapečetit“ v composeru.
- `AUDIT.md` — zapsán known issue: zrušení po globálním spínači „na datum“ zprávu nezastaví.

### Přidáno
- `lib/triggers/inactivity.test.ts` — strážci / ochranná lhůta / souběh dvou cronů.

## [1.58.4] - Oprava: nepravdivá tvrzení o šifrování end-to-end
Aplikace a web na několika místech tvrdily „šifrováno end-to-end“, „zero-knowledge“ a „tvoje zprávy nepřečteme“. Ve skutečnosti se text zpráv a média ukládají bez šifrování na úrovni aplikace (spojení je HTTPS, úložiště u poskytovatele infrastruktury je šifrované na úrovni disku). Navíc vlastním klíčem (AES-256-GCM, klíč na serveru) se šifrují jen položky Trezoru / Manuálu k životu. Nic z toho není end-to-end ani zero-knowledge.

### Opraveno
- `messages/cs.json`, `messages/en.json` — composer (náhled i editor), login, dashboard (upsell, uklidňující karta) a současný landing teď říkají přesně: šifrované spojení a úložiště, Trezor navíc AES-256-GCM, zprávy nejsou šifrované end-to-end. Z karty „Stav schránky“ na landingu zmizely řádky „Uložení klíče: jen u tebe“ a „Náš přístup: žádný“.
- `app/dashboard/billing/page.tsx`, `components/billing/UpgradeModal.tsx` — „Zero-Knowledge Encryption“ odstraněno ze seznamu funkcí Pro i ze srovnávací tabulky.
- Stejná místa + `messages/*.json` — odstraněny i další sliby bez implementace: „Physical letter delivery“ / „fyzické dopisy“ a „Priority support“.
- `prisma/schema.prisma` — komentáře tvrdily, že `textBody` je šifrovaný ciphertext; opraveno na skutečný stav (jen komentář, schéma beze změny).
## [1.58.3] - Oprava: zprávy s pevným datem chodily o den později a globální spínač je doručoval předčasně
Dvě chyby v doručování nalezené při auditu pro nový web.

1. **Zpoždění o den.** Zpráva na konkrétní datum se ukládá s časem (výchozí 08:00, čas serveru = UTC), ale doručovací cron `process-triggers` běžel jen jednou denně ve 03:00 UTC. V den doručení tak ve 03:00 ještě nebyl čas, a zpráva odešla až další den ráno — přání k narozeninám by přišlo den po narozeninách. Milníky podle věku (ukládají se na půlnoc) postižené nebyly.
2. **Globální spínač.** Když se spustil globální spínač (nastavení → neaktivita nebo datum), `pulse` přesunul do ochranné lhůty **všechny** aktivní zprávy uživatele — i ty s vlastním pevným datem (např. „k 18. narozeninám“). Po lhůtě se doručily roky předčasně.

### Opraveno
- `vercel.json` — `process-triggers` běží každou hodinu (`0 * * * *`) místo jednou denně. Zpráva odejde nejpozději do hodiny po nastaveném čase. Sweepy jsou na hodinové spouštění připravené (každý přechod stavu je jednorázový, e-maily se neopakují).
- `app/api/cron/pulse/route.ts` — globální spínač vynechává zprávy se spouštěčem `SPECIFIC_DATE` (časové kapsle, milníky podle věku). Ty čekají na své datum a doručí je `process-triggers`. Zprávy s neaktivitou, „zapečetěné“ a zprávy bez spouštěče spínač zpracuje jako dřív.

## [1.58.2] - Oprava: panel vzhledu na mobilu šel vidět, ale nešel použít
Uživatel po předchozích dvou opravách (#75 pozice, #76 zabalující se lišta) stále hlásil, že na mobilu "panel se otevře, ale kliknutí na volby nic nedělá". Příčina byla jiná, hlubší verze stejného tématu: panel výběru vzhledu se portáluje mimo svého rodiče (aby unikl oříznutí), ale na mobilu je tím rodičem mobilní menu, což je samo o sobě portálované okno (Radix Dialog). Panel se tak portáloval jako NEZÁVISLÉ druhé okno vedle mobilního menu, ne dovnitř něj — a z důvodu, který se nepodařilo přesně vystopovat na úrovni CSS specifikace (pravděpodobně souvislost s `backdrop-filter` a způsobem, jakým prohlížeč skládá dvě nezávisle portálovaná okna), se dotyky na panelu "ztrácely" a propadaly na mobilní menu pod ním — i když panel byl vizuálně nahoře a měl vyšší z-index.

Ověřil jsem to skutečným testem (Playwright se simulací reálného dotyku na mobilním zařízení přes skutečné komponenty appky, ne jen simulaci CSS) — potvrdilo se, že dotyk na tlačítko "Tmavý" appku vůbec nezasáhl.

### Opraveno
- `components/layout/AppearanceButton.tsx` — panel se teď portáluje dovnitř nejbližšího rodičovského dialogu (mobilní menu), pokud existuje, místo vždy do `<body>`. Protože `position: fixed` uniká oříznutí (`overflow: hidden`) libovolného rodiče samo o sobě, tohle neobnovuje původní problém s oříznutím — jen panel dělá skutečným potomkem mobilního menu místo nezávislého souběžného portálu. Na počítači (kde žádný dialog není) se chování nemění.
- Po opravě ověřeno týmž automatizovaným testem — dotyk teď skutečně změní téma, uloží se do localStorage a menu zůstane otevřené.

## [1.58.1] - Dashboard: sjednocené ikony (konec redesignu dashboardu)
Třetí a poslední krok redesignu dashboardu — vizuální doladění. Panel "Vyžaduje pozornost" (předchozí krok) používal barevné emoji (✉️⚠️🎂🎉) pro ikony jednotlivých řádků — jediné místo na dashboardu, co je používalo. Zbytek appky (postranní lišta, Manuál k životu, výběr vzhledu) důsledně používá jednobarevné obrysové SVG ikonky. Nahrazeno vlastní sadou SVG ikon (obálka, štít, výstražný trojúhelník, dort, srdce) ve stejném stylu, jaký appka používá všude jinde.

### Opraveno
- `app/dashboard/page.tsx` — `AttentionRow`/`AttentionItem` teď berou klíč ikony (`"mail" | "delivered" | "warning" | "cake" | "heart"`) místo emoji řetězce, vykreslený přes novou mapu `ATTENTION_ICONS`.

Tímto je dokončen celý schválený 3-krokový plán redesignu dashboardu (přehled připravenosti, sjednocená upozornění, vizuální doladění).

## [1.58.0] - Dashboard: sjednocená upozornění
Druhý krok redesignu dashboardu. Tři samostatné plné karty (dopis připravený k otevření, grace period u spínače, narozeninové/výroční připomínky) se dřív stavěly pod sebe — teď jsou jeden panel "Vyžaduje pozornost" se sjednoceným vzhledem řádků (ikona, text, případně pulzující tečka u urgentních položek, tlačítko akce), seřazený podle naléhavosti: nejdřív připravené dopisy, pak grace period, pak připomínky.

### Přidáno
- `app/dashboard/page.tsx` — nové komponenty `AttentionPanel`/`AttentionRow`, data sestavena do jednoho pole `attentionItems` místo tří oddělených bloků JSX.

## [1.57.2] - Oprava: na panel výběru vzhledu v postranní liště se nedalo kliknout
Hned po předchozí opravě (panel byl mimo obrazovku) uživatel nahlásil navazující problém: teď panel jde vidět, ale kliknutí na něj nefungují — jakoby kliknutí propadlo na odkaz pod panelem a otevřela se jiná podstrana. Příčina: postranní lišta se rozbaluje/zabaluje přes CSS `:hover`/`:focus-within` (najetí myší nebo zaostření na cokoliv uvnitř ji drží rozbalenou). Panel výběru vzhledu se ale portáluje mimo lištu přímo do `<body>` (musí, jinak ho ořízne vlastní `overflow`/`transform` lišty — viz oprava #69). V momentě, kdy myš nebo fokus přejde z tlačítka na panel, lišta tím pádem ztratí `:hover` i `:focus-within` najednou a začne se zabalovat zpátky — přímo pod otevřeným panelem, uprostřed toho, co se uživatel snaží udělat.

### Opraveno
- `components/layout/AppearanceButton.tsx` — dokud je panel otevřený, nastaví se atribut na `<html>`, který lištu "připíchne" rozbalenou (stejný mechanismus appka už používá pro téma/barvu).
- `app/globals.css` — nové pravidlo `html[data-appearance-open] .arca-side`, co lištu drží rozbalenou bez ohledu na hover/fokus.
- Ověřeno automatizovaným testem (Playwright) — s opravou zůstává poloha odkazů v liště beze změny po celou dobu interakce s panelem a kliknutí na panel se správně zaregistruje.

## [1.57.1] - Oprava: panel výběru vzhledu v postranní liště byl mimo obrazovku
Uživatel nahlásil, že po kliknutí na "Vzhled" v levém menu se panel otevře, ale "režim" (light/dark/auto) nejde zvolit, protože je "schovaný za horizontem". Příčina byla v logice z opravy #69 — tehdy jsem přidal pevný práh (`rect.top < 320`), který rozhodoval, jestli se panel otevře nahoru nebo dolů, ale u varianty "nahoru" se výška panelu ořezávala jen podle celé výšky okna, ne podle skutečně dostupného prostoru nad tlačítkem. Když tlačítko sedí níž v postranní liště a panel má dost obsahu (režim, barvy, vlastní barva, podsvícení, pozadí), horní část panelu (právě výběr režimu, protože je v panelu první) se vykreslila nad horní okraj obrazovky.

### Opraveno
- `components/layout/AppearanceButton.tsx` — místo pevného prahu se teď spočítá skutečný volný prostor nad i pod tlačítkem, panel se otevře tam, kde je ho víc, a jeho výška se omezí přesně na tento prostor (zbytek obsahu jede scrollováním uvnitř panelu, ne mimo obrazovku). Ověřeno screenshotem porovnávajícím starou a novou logiku.

## [1.57.0] - Dashboard: přehled připravenosti účtu
První krok redesignu dashboardu. Nová karta nahoře (hned pod pozdravem) ukazuje procentuální "připravenost" účtu — kombinuje pět věcí: aspoň jedna zpráva, kontakt na příjemce, strážce, nastavený spínač (dead-man's switch) a vyplněný Manuál k životu. Každá položka je klikatelná a vede přímo tam, kde se dá doplnit.

### Přidáno
- `app/dashboard/page.tsx` — nová `CompletenessCard` komponenta (kruhový ukazatel procent + klikatelné "pilulky" pro každou podmínku), data dotažena paralelně se zbytkem stránky (`UserSettings.switchEnabled`, počet položek Manuálu k životu).

## [1.56.2] - Oprava: formulář pro novou položku v Manuálu k životu byl mimo obrazovku
Uživatel nahlásil, že formulář pro přidání nové položky (např. předplatného) "je někde nahoře za horizontem" — nešlo ho vidět ani vyplnit. Příčina: formulář (Sheet) je vykreslený jako `position: fixed`, aby zůstal přilepený k pravému okraji obrazovky bez ohledu na scroll — ale obalující `.arca-inner` má animaci vstupu stránky, která používá `transform`. Podle CSS specifikace prvek s transform animací (i taková, co skončí na `transform: none` s `animation-fill-mode: both`) vytváří vlastní "containing block" pro fixed potomky — takže "fixed" formulář se ve skutečnosti přilepil k `.arca-inner`, ne k oknu prohlížeče. Jakmile uživatel sjel stránku dolů (což je běžné, pokud má v manuálu víc položek), formulář zůstal "přilepený" ke starému místu nahoře a zmizel z dohledu. Stejný mechanismus a stejné řešení (portál do `document.body`) byl použit o pár oprav zpátky u výběru vzhledu (#69).

### Opraveno
- `app/dashboard/blueprint/BlueprintClient.tsx` — formulář pro přidání/úpravu položky se teď portáluje přes `createPortal` přímo do `document.body`, mimo dosah `.arca-inner`, takže zůstává skutečně přilepený k viewportu. Ověřeno screenshoty před/po při simulovaném scrollu dlouhé stránky.

## [1.56.1] - Oprava: obsah v Manuálu k životu byl neviditelný (hesla "zmizela")
Uživatel nahlásil, že v Manuálu k životu nejde nic přidat a nikde nevidí uložená hesla ani jiný obsah — stránka vypadala prázdná. Příčina: funkce "skrýt obsah ťuknutím" z verze 1.53.0 obarvovala skryté tečky barvou `var(--hairline-2)`, což je téměř průhledný tón určený pro jemné okraje karet, ne pro čitelný text. Výsledek: skrytý obsah (i nově přidaný) byl fakticky neviditelný — splynul s pozadím karty, takže to vypadalo, jako by položka vůbec neměla žádný obsah nebo jako by přidání položky nic neudělalo. Žádná data se přitom neztratila, šlo čistě o barvu textu.

### Opraveno
- `app/dashboard/blueprint/BlueprintClient.tsx` — skryté tečky teď používají ztlumenou, ale čitelnou barvu (`color-mix` s `var(--muted)`) místo `var(--hairline-2)`. Ověřeno screenshotem vedle sebe (původní vs. opravená barva) — rozdíl je na první pohled vidět.

## [1.56.0] - Oprava: tísnivé mřížky na mobilu (nastavení, manuál, strážci)
Třetí oprava mobilní verze — poslední z prioritního seznamu z auditu. Několik stránek používalo natvrdo 2-4sloupcové CSS mřížky přímo v inline stylu, takže je nezachytil stávající mobilní CSS blok (ten cílí podle třídy, ne podle vlastnosti) a na telefonu se tak tísnily vedle sebe. Hlavní dashboard layout (postranní lišta, spodní navigace) a login stránka byly při kontrole v pořádku už teď.

### Opraveno
- `app/dashboard/settings/SettingsClient.tsx` — výběr typu spínače (2 karty), pole dnů/data a statistika uplynulo/limit/zbývá teď používají sdílené responzivní třídy (`arca-mode-grid`, `arca-date-grid`, `arca-stats-row`).
- `app/dashboard/blueprint/BlueprintClient.tsx` — rychlé přidání kategorie (4 karty) teď stačí na 2 sloupce na mobilu (`arca-kind-grid`).
- `app/dashboard/guardians/page.tsx` — tři kroky "jak funguje ping" (`arca-steps-grid`, nová třída) se teď na mobilu sbalí pod sebe místo tří úzkých sloupců textu.
- Ostatní nahlášené mřížky (kalendářový výběr měsíce, pole ve vault/strážci s pevným sloupcem pro ikonu) byly po kontrole v pořádku — buď jsou uvnitř úzkého popoveru s vlastní šířkou, nebo mají jen malý pevný sloupec (ikonové tlačítko), který se netísní.

### Rozsah
- Tím je uzavřen prioritní seznam ze vstupního auditu mobilní verze (4 položky: výběr vzhledu, horní lišta editoru, tyto mřížky, kontrola login stránky).

## [1.55.0] - Oprava: zmizelá horní lišta v editoru zprávy na mobilu
Druhá oprava mobilní verze. Obrazovky "nová zpráva" a "upravit zprávu" nepoužívají hlavní dashboard layout (jedou na vlastní celostránkové vrstvě, aby unikly postranní liště), takže nemají mobilní hlavičku dashboardu — ale CSS stejně schovávalo jejich vlastní horní lištu (`display: none` na mobilu, protože normální stránky ji nahrazují mobilní hlavičkou). Výsledek: na telefonu v editoru zprávy úplně zmizelo tlačítko zpět, přepínač typu balíčku (emotivní/praktický) a v editaci i tlačítko na výběr vzhledu — nedalo se nic z toho použít.

### Opraveno
- `app/globals.css` — nová třída `.arca-topbar--standalone` pro tyto dvě obrazovky: lišta zůstává viditelná, ale na mobilu se zalamuje (drobečková navigace jede vodorovně scrollovatelně, ovládací prvky jako přepínač typu balíčku nebo výběr vzhledu spadnou na vlastní řádek pod ní) místo aby mizela beze zbytku.
- Odstraněn zastaralý `padding-top: 52px` hack v `.arca-compose-layout`, který počítal s mobilní hlavičkou, jež se v této obrazovce vůbec nevykresluje — teď, když je lišta skutečně vidět, kompenzace není potřeba.
- `app/dashboard/arca/new/ComposeWizard.tsx`, `components/arca/ArcaEditorNew.tsx` — přidána třída `arca-topbar--standalone` na jejich tři horní lišty.
- Při příležitosti opraveny i tři natvrdo dvou/čtyřsloupcové mřížky v `ComposeWizard.tsx` (výběr režimu zprávy, pole "kdo/věk" u spouštěče, mřížka fotek) — na mobilu se tísnily vedle sebe, protože nebyly pokryté stávajícím responzivním CSS blokem.

## [1.54.0] - Oprava: výběr vzhledu nešel použít na mobilu
Uživatel nahlásil, že spousta věcí na telefonu nefunguje — začátek širší opravy mobilní verze. První a nejzávažnější nález: tlačítko na změnu vzhledu (téma, barva, pozadí) v mobilním menu nešlo vůbec použít — klik na libovolnou možnost menu jen zavřel. Nešlo o CSS, ale o konflikt s Radix Dialogem: panel výběru vzhledu se portáluje přímo do `<body>` (mimo strom mobilního menu, aby ho neoříznul `overflow`/`transform` postranní lišty), takže Radix ho vyhodnotil jako klik "mimo" dialog a hned zavřel celé menu.

### Opraveno
- `components/ui/sheet.tsx` — `Dialog.Content` teď ignoruje kliky uvnitř panelů opt-in přes `data-arca-portal-panel` (obecný mechanismus pro jakýkoliv budoucí komponent portálující mimo Sheet, ne jen pro výběr vzhledu).
- `components/layout/AppearanceButton.tsx` — panel má nový atribut `data-arca-portal-panel`; navíc doplněno chybějící vertikální ořezání (panel se dřív mohl vykreslit nad horním okrajem obrazovky, pokud tlačítko sedí blízko vrcholu) — panel se teď otevírá dolů místo nahoru, pokud by jinak přetekl mimo obrazovku.

### Rozsah
- Toto je první z několika oprav mobilní verze; další v plánu: zmizelá horní lišta v editoru zprávy na mobilu a pár mřížek, co se nesbalují na malé obrazovce.

## [1.53.0] - Manuál k životu: skrytý obsah a upozornění na neaktuálnost
Čtvrtý a poslední krok redesignu Manuálu k životu — čistě UI polish, žádné změny v databázi/API. Obsah položky (hesla, instrukce) se teď v seznamu karet nezobrazuje čistým textem hned po otevření stránky, ale skrytý za maskou (teček) — dává to smysl i vizuálně, teď když je obsah skutečně šifrovaný na uložišti (1.50.0). Druhá věc: karta ukazuje odznak "Aktualizováno před X dny", pokud se položka déle neupravovala (nad 180 dní), výrazněji pokud nad 365 dní — upomínka, že třeba heslo nebo info o předplatném může být zastaralé.

### Přidáno
- `app/dashboard/blueprint/BlueprintClient.tsx` — tlačítko "Zobrazit/Skrýt" nad obsahem položky (výchozí stav: skryto, maskováno tečkami); odznak neaktuálnosti v meta řádku karty založený na `updatedAt`.

## [1.52.0] - Manuál k životu: strukturované odkazy
Třetí krok redesignu Manuálu k životu. Nové volitelné pole `url` u položky — pro odkaz na zrušení předplatného, portál dokumentu apod. Na rozdíl od `content` (hesla/instrukce) se nejedná o citlivé pole, takže zůstává nešifrované v databázi. Validace na serveru (musí být platná http/https adresa), zobrazeno jako klikatelný chip na kartě položky. Doplněno i do `getSanctuaryContent` (doručení balíčku příjemci) — příjemce uvidí odkaz stejně jako vlastník.

### Přidáno
- `BlueprintItem.url` — nové volitelné textové pole (ruční migrace).
- `app/actions/blueprint.ts` — validace URL (`parseOptionalUrl`) v `createBlueprintItem`/`updateBlueprintItem`.
- `app/dashboard/blueprint/BlueprintClient.tsx` — pole pro odkaz ve formuláři, klikatelný chip na kartě.
- `app/actions/sanctuary.ts` — `url` doplněno do výběru a vráceného typu pro doručení příjemci.

## [1.51.0] - Manuál k životu: skutečné přílohy dokumentů
Druhý krok redesignu Manuálu k životu (po šifrování v 1.50.0). Appka dosud u položek jen popisovala dokument textem — teď lze k položce reálně nahrát soubor (smlouva, scan dokladu, potvrzení o předplatném...), uložený do privátního Supabase Storage (bucket `arca-media`, stejný vzor jako u avatarů). Přístup k přílohám je přes krátkodobě platné podepsané URL (10 min) generované až po ověření vlastnictví položky na serveru.

### Přidáno
- `BlueprintItem.attachmentPath` / `attachmentName` — nová pole v DB (ruční migrace, lokální `DATABASE_URL` je stále rozbité).
- `app/actions/blueprint.ts` — `uploadBlueprintAttachment` (ověření vlastnictví, limit 10 MB, nahrazení starého souboru při re-uploadu), `removeBlueprintAttachment`, `getBlueprintAttachmentUrl` (podepsaná URL, ověřená proti cestě vlastníka). `deleteBlueprintItem` teď při mazání položky smaže i přiloženou přílohu z úložiště.
- `app/dashboard/blueprint/BlueprintClient.tsx` — ve formuláři přidání/úpravy lze přiložit/odstranit soubor; na kartě položky tlačítko pro otevření přílohy přes podepsanou URL.

### Rozsah (vědomě vynechané)
- Binární obsah přílohy se nešifruje (jen textové pole `content` je šifrované od 1.50.0) — privátní bucket + ownership-scoped podepsané URL odpovídá úrovni ochrany ostatních médií v appce (avatary, fotky příjemců).

## [1.50.0] - Bezpečnost: šifrování obsahu Manuálu k životu na uložišti
Začátek redesignu "Manuálu k životu" (Blueprint) — uživatel chce dokonalejší formu, top UX a features, co lidi ocení. Než do toho sekce stavět cokoliv dalšího, nejdřív základ: `BlueprintItem.content` (kam appka nabádá ukládat přístupové údaje a hesla) se dosud ukládal v databázi čistým textem, bez jakéhokoliv šifrování na úrovni appky. Appka navíc nepoužívá Supabase RLS (všechen přístup je jen ruční `ownerId` filtr v kódu) — únik service-role klíče nebo chyba v dotazu by znamenaly čitelná hesla všech uživatelů.

### Přidáno
- `lib/crypto/blueprint-encryption.ts` — AES-256-GCM, klíč z `BLUEPRINT_ENCRYPTION_KEY` (32 bajtů, base64). Verzovaný formát (`v1.<iv>.<authTag>.<ciphertext>`) místo hádání podle délky — jednoznačné, umožní budoucí změnu formátu. Fail-safe: poškozený/padělaný ciphertext vrátí prázdný řetězec místo pádu appky.
- `lib/crypto/blueprint-encryption.test.ts` — 8 jednotkových testů (round-trip s diakritikou, náhodné IV při každém šifrování, legacy plaintext fallback, odolnost vůči poškozenému/padělanému obsahu, chybějící/špatně dlouhý klíč).
- `BLUEPRINT_ENCRYPTION_KEY` nastaven na Vercelu (Production+Preview) i lokálně, doplněn do `.env.example`.

### Opraveno
- `app/actions/blueprint.ts` — `createBlueprintItem`/`updateBlueprintItem` teď šifrují při zápisu; `createBlueprintItem` vrací klientovi otevřený text (co uživatel zrovna napsal), ne uloženou šifru.
- `app/dashboard/blueprint/page.tsx` — dešifruje při čtení pro zobrazení vlastníkovi.
- `app/actions/sanctuary.ts` — **našel jsem při auditu druhé čtecí místo**: `getSanctuaryContent` (doručení PRACTICAL balíčku příjemci přes `/s/[token]`) posílalo `blueprintItems` bez dešifrování — příjemce by po odemčení viděl nečitelnou šifru místo hesel/instrukcí, které potřebuje. Opraveno.

### Zpětná kompatibilita
Žádná hromadná migrace existujících řádků (lokální `DATABASE_URL` je stále rozbité, nešlo by to spustit ani kdybych chtěl) — staré nezašifrované položky se zobrazují normálně (detekovány podle chybějící `v1.` předpony) a zašifrují se samy při příštím uložení vlastníkem. Žádné funkční přerušení pro stávající uživatele.

### Ověřeno
- Živě otestován round-trip (včetně české diakritiky), fail-safe chování na poškozeném ciphertextu, legacy plaintext fallback — přes dočasnou debug route, ne jen přes testy.

## [1.49.0] - Feature: spoluautorství zprávy
Pátá a poslední položka z druhé vlny feature backlogu. Vlastník zprávy teď může pozvat někoho dalšího (ne nutně příjemce), aby ke zprávě přidal vlastní slova — odkazem, bez nutnosti účtu.

### Architektonické zjištění
Appka má v datovém modelu přesně jeden textový blok na zprávu — `upsertContent` dělá `findFirst({ type: TEXT })` a přepíše, co najde. Přidat příspěvek jako druhý `MessageContent` s typem `TEXT` by znamenalo reálné riziko, že vlastníkovo příští uložení přepíše cizí příspěvek (nebo naopak). Řešení: samostatné modely `Contribution` + `ContributionInvite`, nic se nedotýká existující `upsertContent`/compose/PDF logiky kolem `TEXT` obsahu.

### Přidáno
- `prisma/schema.prisma` — nové modely `Contribution` (autor + text) a `ContributionInvite` (jednorázový token, stejný vzor jako `GuardianToken`, 72h platnost). Hand-written migrace (lokální DB stále rozbitá).
- `app/actions/contribution.ts` — `createContributionInvite` (vlastník, autentizováno) vygeneruje sdílený odkaz; `getContributionInvitePreview`/`submitContribution` (veřejné, bez přihlášení — přispěvatel není app uživatel, stejný bezpečnostní model jako strážci).
- `app/contribute/[token]/page.tsx` — nová veřejná stránka s jednoduchým formulářem (jméno + text), přidáno do `proxy.ts` `PUBLIC_PREFIXES`.
- UI v `ArcaEditorNew.tsx` — sekce "Pozvat spoluautora" s tlačítkem na vygenerování odkazu (kopírování do schránky) a seznamem už přidaných příspěvků.
- Příspěvky se zobrazují i příjemci na `/arca/[hash]` (sekce "Also from"), a jsou zahrnuté v obou PDF exportech (jednotlivá zpráva i celý trezor), označené jménem autora.

### Ověřeno
- Typecheck, lint, build, testy (31/31) v pořádku.
- **Na rozdíl od ostatních položek téhle session se nepodařilo tuhle funkci živě otestovat end-to-end** — `/contribute/[token]` na rozdíl od `/guardian/action` nemá žádnou cestu bez DB dotazu (token je povinný route parametr, i neplatný token potřebuje `findUnique` na ověření), takže s rozbitým lokálním `DATABASE_URL` jde jen potvrdit, že build/typecheck prochází a že kód strukturálně kopíruje už prověřený `GuardianToken` vzor (re-validace, jednorázovost, expirace). Stojí za to si tenhle flow ručně projít na produkci/preview po mergi.

## [1.48.0] - Chore: automatické nasazení Prisma migrací při produkčním buildu
Opravuje opakující se problém z celé téhle session — hand-written migrace (Executor removal, `lastReminderSentAt`, `transcript`) se musely spouštět ručně přes `npx prisma migrate deploy`, protože nic v buildovacím pipeline to nedělalo samo. Teď už ano, natrvalo.

### Přidáno
- `package.json` — nový `vercel-build` skript. Vercel ho při nasazení automaticky použije místo `build`, pokud existuje (zero-config chování, žádná změna nastavení na Vercelu potřeba). Běží `prisma migrate deploy` **jen když `VERCEL_ENV=production`** — ne pro preview deploymenty (ty typicky sdílí stejnou DB, spouštět migrace na každý push do PR branch by bylo zbytečné a riskantní).
- Normální `build` skript (`npm run build`, používaný lokálně i v CI) zůstává beze změny — migrace se spouští jen na skutečném produkčním nasazení na Vercelu.

### Ověřeno
- Logika podmínky (`VERCEL_ENV === "production"`) ověřena v izolaci pro všechny tři stavy (nenastaveno/preview/production) — sandbox blokuje přímé spuštění `vercel-build` skriptu lokálně kvůli jeho názvu (klasifikátor ho vyhodnotil jako produkční deploy akci), takže otestováno obezřetně: syntax-check (`sh -n`) prošel, standardní `build` skript dál funguje beze změny.

## [1.46.0] - Feature: automatický přepis hlasových a video zpráv
Čtvrtá položka z druhé vlny feature backlogu. Appka teď automaticky vygeneruje textový přepis pro každou nahranou hlasovou/video zprávu — hned po nahrání, bez dalšího kroku od uživatele.

### Technické zjištění
Žádná vyhrazená transkripční služba není potřeba — OpenRouter podporuje `input_audio`/`video_url` jako běžné typy obsahu v multimodálním chat completion volání (ověřeno proti oficiální OpenAPI specifikaci openrouter.ai, ne proti podezřelým "zrcadlovým" doménám, co se objevily ve výsledcích vyhledávání a vypadaly jako spam). Stejná infrastruktura, žádný nový provider/klíč.

### Přidáno
- `MessageContent.transcript` — nové nullable pole (hand-written migrace, lokální DB stále rozbitá).
- `lib/ai/transcribe.ts` — `transcribeAudio` (stáhne soubor, base64 — OpenRouter nepodporuje URL pro audio) a `transcribeVideo` (pošle přímo URL, žádné stahování).
- `app/actions/arca.ts::addMediaContent` — po úspěšném uploadu audia/videa se transkripce spustí automaticky a rovnou se čeká na výsledek (ne fire-and-forget — serverless funkce může skončit dřív, než by se stihla dokončit práce na pozadí). Selhání transkripce nikdy nezablokuje samotný upload.
- **Synergie s PDF exportem**: hlasové/video zprávy dřív v PDF exportu (jednotlivém i celovaultovém) úplně chyběly — exportovaly se jen `TEXT` obsahy. `lib/pdf/pdf-copy.ts::buildMainParagraphs` teď zahrne i přepis, označený "Přepis hlasové/video zprávy:".

### Ověřeno
- Živě otestováno přes skutečnou `say` (macOS TTS) vygenerovanou nahrávku — jak syrové volání na OpenRouter, tak celá exportovaná funkce `transcribeAudio` (fetch → base64 → OpenRouter → parsing) vrátily přesný přepis českého i anglického textu.
- `transcribeVideo` (formát `video_url`) nebyl živě otestován — nemám k dispozici reálné video s veřejně dostupnou URL (OpenRouter by k ní potřeboval přístup ze svých serverů, ne z mého). Formát je ale potvrzený přímo z oficiální OpenAPI specifikace, strukturálně stejný vzor jako už ověřené audio volání.

## [1.45.0] - Feature: automatický AI překlad zprávy pro příjemce
Třetí položka z druhé vlny feature backlogu. Na recipient-facing stránce (`/arca/[hash]`) pod hlavní zprávou přibyly dva odkazy — "Zobrazit v češtině" / "Show in English". Příjemce si může zprávu nechat přeložit do druhého jazyka appky jedním kliknutím.

### Bezpečnostní rozvaha (recipient-facing, bez přihlášení)
Příjemci nejsou přihlášení uživatelé appky — endpoint `app/api/arca/translate-content/route.ts` musí být veřejný (přidán do `proxy.ts` `PUBLIC_PREFIXES`), což znamená žádnou standardní Supabase auth kontrolu. Aby se z toho nestal volně zneužitelný "přelož cokoliv zadarmo" nástroj:
- Endpoint **nikdy nepřekládá text poslaný klientem** — bere jen `livingLinkHash` + cílový jazyk, obsah si sám znovu natáhne z DB.
- Před překladem **znovu ověří přesně ten samý gate**, co recipient stránka sama — stav zprávy (`TRIGGERED`/`DELIVERED`) i challenge otázku (`isUnlocked` cookie check) — jinak by šlo přes překlad obejít zamčenou zprávu.
- Rate limit podle IP (20/h), stejný vzor jako `guardian-action`.

### Přidáno
- `app/arca/[livingLinkHash]/TranslatableText.tsx` — nová klientská komponenta (ostatní recipient stránka zůstává čistě server-rendered), přepíná mezi originálem a přeloženou verzí, žádná auto-detekce jazyka — ruční volba, appka stejně podporuje jen cs/en.
- Prompt instruuje AI, ať text vrátí beze změny, pokud je už v cílovém jazyce — ověřeno živě.

### Ověřeno
- Živé volání na OpenRouter pro oba směry (EN→CS, CS→EN) i no-op případ (text už v cílovém jazyce) přes dočasnou debug route — všechny tři scénáře fungují správně, zachovává tón a smysl osobní zprávy.

## [1.44.0] - Feature: export celého trezoru najednou
Druhá položka z druhé vlny feature backlogu. Ve Vault teď vedle "Nová zpráva" přibylo tlačítko "Exportovat vše" — stáhne jedno PDF se všemi zprávami uživatele najednou (titulní strana + každá zpráva na vlastní stránce s vlastním QR kódem).

### Přidáno
- `lib/pdf/VaultBookDocument.tsx` — nová PDF šablona pro víc zpráv v jednom dokumentu, každá zpráva na vlastní stránce (`<Page>`), vlastní QR kód pro nezávislou skenovatelnost i při fyzickém rozstříhání výtisku.
- `lib/pdf/fonts.ts` — vytažená registrace fontu (dřív duplicitně v `LegacyBookDocument.tsx`, teď sdílená mezi oběma PDF šablonami).
- `lib/pdf/pdf-copy.ts` — vytažená sdílená logika (resolce locale, textové konstanty, výpočet labelu odemčení kapitoly), dřív jen v `export-pdf/route.tsx`, teď použitá i v nové `export-vault` route — beze změny chování pro existující export jedné zprávy.
- `app/api/arca/export-vault/route.tsx` — nová route, bez `[id]` parametru, natáhne všechny zprávy přihlášeného uživatele (`ownerId` scoped).

### Ověřeno
- Živě vygenerováno PDF se 2 zprávami přes dočasnou debug route — 3 strany (titulní + 2× zpráva), každá zpráva má vlastní QR kód, správné zalomení stránek, česká diakritika v pořádku.

## [1.43.0] - Feature: QR kód v PDF exportu
První položka z druhé vlny feature backlogu. Titulní strana PDF exportu (viz 1.36.0) teď má QR kód odkazující na živou online verzi zprávy (`/arca/[hash]`) — kdokoliv najde fyzický výtisk za roky, může ho naskenovat a zobrazit aktuální stav.

### Přidáno
- `qrcode` balíček — generuje PNG jako data URL čistě v JS, bez závislosti na nativním `canvas` modulu (ověřeno, důležité pro serverless).
- `lib/pdf/LegacyBookDocument.tsx` — nový volitelný `qrCodeDataUrl`/`qrCodeLabel` v datech, vykreslí se na titulní straně pod metadaty. Komponenta zůstává čistě prezentační — negeneruje QR kód sama, jen ho vykreslí, pokud dostane.
- `app/api/arca/[id]/export-pdf/route.tsx` — generuje QR kód vždy, bez ohledu na aktuální stav zprávy (DRAFT/ACTIVE/TRIGGERED...) — smysl QR kódu je ukázat **budoucí** stav v momentě, kdy ho někdo naskenuje, ne stav při exportu. Pokud generování QR kódu selže, export PDF pokračuje bez něj (nikdy neblokuje hlavní funkci).

### Ověřeno
- Živě vygenerováno PDF s reálným QR kódem přes dočasnou debug route — QR kód se vykresluje čistě, správně umístěný pod titulkem a metadaty, s popiskem "Naskenuj pro zobrazení online".

## [1.42.0] - Feature: hromadný import příjemců z CSV
Sedmá a poslední položka ze schváleného feature backlogu. V kroku "příjemci" v Compose wizardu přibylo tlačítko "Importovat CSV" vedle ručního přidávání jednoho kontaktu — nahraje všechny řádky ze souboru najednou jako nové příjemce rozepsané zprávy.

### Důležité zjištění o architektuře
Appka nemá samostatnou tabulku/adresář kontaktů — `Recipient` existuje jen jako vedlejší produkt přidání do konkrétní zprávy, "seznam kontaktů" ve Vault je jen deduplikace napříč existujícími zprávami. Po diskuzi s uživatelem (AskUserQuestion) zvolen jednodušší, k architektuře appky konzistentní rozsah: CSV se importuje jako hromadné přidání příjemců do PRÁVĚ rozepsané zprávy (ne jako nový trvalý adresář, který by vyžadoval nový Prisma model a migraci).

### Přidáno
- `lib/csv.ts` — malý, cílený CSV parser (ne obecná knihovna). Očekává sloupce `name,email` v libovolném pořadí (email identifikován přítomností `@`), toleruje quotované pole s čárkami, automaticky detekuje a přeskočí hlavičkový řádek, deduplikuje podle e-mailu (case-insensitive).
- `lib/csv.test.ts` — 8 jednotkových testů (hlavička, obrácené pořadí sloupců, quotované pole, chybějící jméno/e-mail, duplicity, prázdný vstup, extra sloupce navíc).
- UI v `ComposeWizard.tsx` — skrytý file input + tlačítko, parsování proběhne čistě v prohlížeči (appka samotná CSV nikam neposílá). Import přeskočí kontakty, co jsou už vybrané/přidané (podle e-mailu), a ukáže toast se zprávou, kolik se přidalo / přeskočilo.

### Ověřeno
- Čistě deterministická klientská logika bez závislosti na externím API — pokryto 8 jednotkovými testy místo živého debug-route testu (na rozdíl od AI funkcí tady není co ověřovat živě).

## [1.41.0] - Feature: AI "rozhovor" pro psaní zprávy (guided interview)
Šestá a největší položka z feature backlogu. V AI panelu editoru přibyl přepínač "Rychlé generování" / "Rozhovor s AI" — druhá varianta je skutečný víceturnový chat: AI postupně klade až 4 konkrétní otázky, adaptivně navazující na předchozí odpovědi, a z celého rozhovoru pak sestaví návrh zprávy.

### Přidáno
- `app/api/arca/ai-interview/route.ts` — sdílí rate limit s ostatními AI features (`"ai-assist"` prefix; rozhovor přirozeně stojí víc volání, takže si logicky bere víc ze stejné hodinové kvóty). Server (ne model) rozhoduje, kdy přejít z kladení otázek na finální návrh — po 4 odpovědích, nebo dřív, pokud uživatel klikne "To stačí — napiš to teď". To drží náklady a délku rozhovoru předvídatelné.
- UI v `AiAssistPanel` (`components/arca/ArcaRichEditor.tsx`): mode přepínač, transkript rozhovoru, pole na odpověď, tlačítka "Další" / "To stačí — napiš to teď". Finální návrh se zobrazí přes stejnou sdílenou komponentu jako u ostatních AI funkcí ("Use this text" vloží do editoru).

### Ověřeno
- Živě otestován celý 2kolový rozhovor + finální návrh přes dočasnou debug route (reálná OpenRouter volání, ne mock). AI prokazatelně navazuje na předchozí odpověď (po "pekla mi bábovku v neděli" se zeptala na konkrétní chvíli předávání/vůni), a finální návrh čerpá výhradně ze skutečně řečených detailů (bábovka, vanilková vůně, úsměv ve dveřích) — nic si nevymýšlí.

## [1.40.0] - Feature: AI shrnutí pro strážce + oprava skutečné bezpečnostní díry
Pátá položka z feature backlogu. Při zkoumání se ukázalo, že původní zadání ("AI shrne strážci, co se spustí, než potvrdí") narazí na reálný problém: appka dosud neměla žádný potvrzovací mezikrok vůbec — odkaz v e-mailu (GET) spouštěl nevratnou akci okamžitě při kliknutí, bez jakéhokoli "opravdu chceš?" kroku.

### Opraveno — bezpečnostní díra
- **GET odkaz s vedlejším efektem = zranitelnost vůči e-mailovým skenerům.** Outlook Safe Links, Gmail a další bezpečnostní skenery běžně navštěvují (prefetchují) všechny odkazy v e-mailu kvůli kontrole na malware — to mohlo spustit **nevratné doručení Archy** samo, aniž by strážce cokoliv klikl.
- Mutující logika (`CONFIRM_ALIVE`/`RELEASE`) přesunuta z `GET /api/guardians/action` do nového Server Action `confirmGuardianAction` (`app/actions/guardian.ts`) — spouští se jen z reálného kliknutí na potvrzovací tlačítko (POST, Next.js Server Action, originem chráněný frameworkem).
- `GET /api/guardians/action` teď jen bezpečně přesměruje na novou potvrzovací stránku — zachovává zpětnou kompatibilitu s odkazy v už odeslaných e-mailech (72h okno platnosti tokenu).

### Přidáno
- `app/guardian/action/page.tsx` — nová potvrzovací stránka. Čistě read-only GET lookup (`getGuardianActionPreview`, bezpečný pro prefetch), zobrazí **deterministické, vždy správné** fakty (vlastník, název zprávy, příjemci, typ akce) a teprve pak AI shrnutí jako doplněk.
- `lib/ai/guardian-summary.ts` — AI vygeneruje jednu větu lidsky shrnující, co se stane. **Záměrně nikdy není jediným zdrojem pravdy** — fakta na stránce jsou vždy natvrdo vyrenderovaná appkou, AI je jen doplňková parafráze s fallbackem na nic (když AI selže, sekce se jednoduše nezobrazí, stránka zůstává plně funkční).
- `GuardianAction` překladový namespace (cs/en), parametrizovaný jmény vlastníka/příjemců.

### Ověřeno
- Živě otestováno: stránka bez tokenu správně zobrazí "Neplatný odkaz". AI shrnutí živě ověřeno pro obě akce (`CONFIRM_ALIVE`/`RELEASE`) v obou jazycích přes dočasnou debug route — výstup správně zachovává jména příjemců a nevymýšlí si fakta.
- Netestováno end-to-end s reálným tokenem z DB (lokální `DATABASE_URL` stále rozbité) — Server Action logika je 1:1 přenesená z už fungující staré GET route, jen přesunutá za potvrzovací krok.

## [1.39.0] - Feature: AI kontrola kompletnosti Blueprintu
Čtvrtá položka z feature backlogu. Na stránce "Manuál k životu" (Blueprint) přibylo tlačítko "Zkontrolovat přes AI" — AI navrhne až 5 běžně opomíjených položek (banka, pojištění, mazlíček, přístup k e-mailu...), co uživatel pravděpodobně zapomněl přidat.

### Přidáno
- `app/api/arca/ai-blueprint-check/route.ts` — nová route, sdílí rate limit s ostatními AI features (`"ai-assist"` prefix). **Důležité pro soukromí**: appka posílá AI jen `category` + `title` existujících položek, nikdy `content` — tam jsou hesla, čísla účtů apod. Server navíc filtruje přijatý payload (`isCategory` + typeof check), takže i kdyby klient poslal víc, nic jiného než kategorie+název se nikdy nedostane do promptu.
- UI v `app/dashboard/blueprint/BlueprintClient.tsx` — karta s tlačítkem, seznam návrhů s krátkým "proč" u každého, tlačítko "Přidat" rovnou otevře formulář s předvyplněnou kategorií a názvem (obsah nechá na uživateli — AI nikdy nevymýšlí skutečný obsah položky).
- `lib/ai/openrouter.ts` — zobecněn na `requestJsonFromOpenRouter<T>()` (dřív jen `requestVersionsFromOpenRouter`, specifické pro `{versions: ...}` tvar), ať se dá použít i pro jiný JSON tvar (`{suggestions: ...}`). `requestVersionsFromOpenRouter` teď jen volá ten obecný a validuje tvar — beze změny chování pro `ai-assist`/`ai-rewrite`.

### Ověřeno
- Živé volání na OpenRouter (ne jen typecheck) přes dočasnou neautentizovanou debug route — se 2 existujícími položkami (rodný list, Netflix) vrátila AI 5 smysluplných, nekolidujících návrhů (vůle, bankovní účty, pojištění, přístup k e-mailu, mazlíček).

## [1.38.0] - Feature: chytré e-mailové připomínky neaktivním uživatelům
Třetí položka z feature backlogu. Nový týdenní cron pošle přátelskou připomínku lidem, co se v appce dlouho neukázali, ať si projdou svou schránku — bez AI, čistě na existující Resend + cron infrastruktuře.

### Přidáno
- `app/api/cron/reminders/route.ts` — nový cron (pondělí 10:00 UTC, `vercel.json`). Cílí na uživatele s `lastActiveAt` staré 90+ dní, co mají aspoň jednu zprávu (prázdný účet nemá co "revidovat"), a gatuje opakované odesílání cooldownem 30 dní přes nové pole `User.lastReminderSentAt` (hand-written migrace, lokální `DATABASE_URL` je stále rozbité).
- `emails/InactivityReminderEmail.tsx` — nová, záměrně neutrální šablona (není to bezpečnostní upozornění jako `GracePeriodWarningEmail`, jen pozvánka mrknout se zpátky).
- `lib/cron-auth.ts` — vytažená sdílená constant-time Bearer-token kontrola (dřív kopírovaná zvlášť v `pulse` a `process-triggers`, teď potřetí — stálo za to to sjednotit alespoň pro nový kód, staré dvě route nechány beze změny mimo rozsah). **Nové**: `lib/cron-auth.test.ts`, první automatizovaný test pro cron auth logiku v appce (5 testů — chybějící header, špatný token, špatné schéma, správný token, fail-closed když `CRON_SECRET` není nastavený).

### Poznámka
- Netestováno živě proti produkční DB (lokální `DATABASE_URL`/`CRON_SECRET` jsou stále rozbité) — ověřeno typecheckem, buildem a jednotkovými testy auth logiky; dotazovací/e-mailová logika je strukturně identická s už prověřenými `pulse`/`process-triggers` routami.

## [1.37.0] - Feature: AI varianty tónu zprávy (formálněji / vřeleji / stručněji)
Druhá položka z feature backlogu. V AI panelu editoru (ten, co dřív jen generoval zprávu od nuly) teď přibyla sekce "Už máš koncept? Zkus jiný tón" — pokud je v editoru už nějaký text, nabídne tři tlačítka, co ho jedním klikem přepíšou.

### Přidáno
- `app/api/arca/ai-rewrite/route.ts` — nová route, sdílí rate limit frontu s `ai-assist` (stejný `"ai-assist"` Redis prefix — stejná nákladová položka, stejná zneužitelnost, nemá smysl mít dvě oddělené kvóty). Bere HTML obsah editoru, převede na odstavce (`htmlToParagraphs` z PDF exportu — recyklace), sestaví prompt podle tónu (`formal`/`warm`/`short`), vrátí jednu přepsanou verzi ve stejném `{ versions: [...] }` formátu jako `ai-assist`, takže frontend mohl použít už existující UI pro zobrazení výsledků beze změny.
- `lib/ai/openrouter.ts` — vytažená sdílená logika volání OpenRouter + parsování JSON odpovědi, použitá jak v `ai-assist`, tak v `ai-rewrite`, ať se netahá to samé dvakrát.
- Nové tlačítko/sekce v `ArcaRichEditor.tsx`'s `AiAssistPanel`, nové překladové klíče `RichEditor.aiPanel.rewrite.*`.

### Ověřeno
- Živé volání na OpenRouter (ne jen typecheck) přes dočasnou neautentizovanou debug route — ověřeno pro `formal` i `short` tón na reálném textu, výsledek dává smysl a zachovává fakta/jméno příjemce.

## [1.36.0] - Feature: export zprávy do PDF ("kniha odkazu")
První položka z nového feature backlogu (víc hodnoty pro uživatele, víc AI). Majitel teď může jedním kliknutím stáhnout svou zprávu (hlavní text + všechny kapitoly) jako PDF — fyzická záloha pro případ, že appka/účet/cloud někdy přestane existovat.

### Přidáno
- `app/api/arca/[id]/export-pdf/route.tsx` — nová API route, generuje PDF přes `@react-pdf/renderer`. Auth + ownership check (`findFirst({ where: { id, ownerId: user.id } })`) — stejný vzor jako zbytek appky, 404 (ne 403) když zpráva neexistuje nebo není uživatelova, aby se neprozrazovalo který případ nastal.
- `lib/pdf/LegacyBookDocument.tsx` — čistě prezentační PDF šablona (titulní strana + hlavní zpráva + kapitoly s info o odemčení).
- `lib/pdf/html-to-text.ts` — převod HTML z rich-text editoru (`Chapter.content`, `MessageContent.textBody`) na prosté odstavce — react-pdf neumí renderovat libovolné HTML. Lossy záměrně (formátování/odkazy/obrázky se ztratí), jen odstavcové zalomení se zachová.
- `lib/pdf/fonts/NotoSans-{Regular,Bold}.ttf` — PDF built-in fonty (Helvetica apod.) neumí českou diakritiku, musel se zaregistrovat Unicode font. Stažen přímo ze stabilní gstatic URL (Google Fonts garantuje zpětnou kompatibilitu existujících URL) a commitnut do repa — žádná závislost na externím fetchi za běhu generování PDF.
- Tlačítko "Exportovat do PDF" v `ArcaEditorNew.tsx` (edit screen), nové překladové klíče v `cs.json`/`en.json`.

### Ověřeno
- Živý smoke test přes dočasnou neautentizovanou debug route (smazána před commitem) proti produkčnímu buildu (`npm run build && npm start`) — PDF se reálně vygenerovalo, 2 strany, čeština se všemi háčky/čárkami (č, ř, ž, ě, š, ť, ů) se vykreslila správně. Opravena jedna vizuální chyba nalezená při testu: dlouhý nadpis na titulní straně se zalamoval na 2 řádky a přesahoval do řádku "Pro: ..." pod ním — doplněn `lineHeight`/`marginBottom`.

## [1.35.0] - Accessibility: aria-label na icon-only tlačítkách
Appka měla `aria-*` atributy jen ve 14 ze 82 `.tsx` souborů. Prošel jsem appku skriptem (regex sken `<button>` bloků bez viditelného textu a bez `aria-label`/`title`), manuálně ověřil každý nález a opravil ty skutečné — vyfiltroval jsem false positivy (tlačítka s viditelným textem/ikonou vedle textu, kde to regex nerozpoznal kvůli JSX výrazům).

### Opraveno — icon-only tlačítka bez přístupného jména
- `RecipientProfileEditor.tsx` — dvě zavírací tlačítka sheetů (profil, vzpomínka).
- `ComposeWizard.tsx` — dvě tlačítka na odebrání vybraného příjemce z chipů, + "eye" tlačítko v náhledu doručení (bez `onClick` — vypadá jako nedokončená funkce, ale aspoň má teď přístupné jméno).
- `ArcaEditorNew.tsx` — tlačítko na odebrání příjemce.
- `VaultClient.tsx` — zavírací tlačítko modálu úpravy skupiny.
- `CalendarClient.tsx` — zavírací tlačítko denního detailu.
- `EmojiPicker.tsx` — hlavní trigger tlačítko (mělo `title`, doplněno i `aria-label` pro robustnost).
- Nové překladové klíče (`Vault.close`, `Calendar.close`, `Vault.detail.close`, `Compose.recipient.remove`, `Compose.preview.toggle`, `ArcaEditorNew.removeRecipient`) v `cs.json` i `en.json`, většina parametrizovaná jménem příjemce (`"Remove {name}"`).

### Co zůstává — vědomě mimo rozsah
- **Formulářové inputy** (74 výskytů `<input>` v appce) — nekontroloval jsem všechny jednotlivě, jde o mnohem větší sken a riziko falešných oprav bez vizuálního testu.
- **Ruční modály/sheety bez Radix Dialog** (`VaultClient.tsx`, `RecipientProfileEditor.tsx`, `GuardianListClient.tsx` potvrzovací dialogy) — postrádají `role="dialog"`/`aria-modal`/focus trap, na rozdíl od sdíleného `components/ui/sheet.tsx`, který Radix Dialog používá a má to vyřešené. Oprava by znamenala měnit chování (focus management), ne jen přidávat atributy — větší riziko bez možnosti to vizuálně odzkoušet (lokální přihlášení je stále rozbité). Navrhuju jako samostatný následný úkol.

## [1.34.0] - Úklid: .env.example, untrack .env.production, poslední lint warningy
Dokončení zbylého nízko-prioritního backlogu z auditu.

### Přidáno
- `.env.example` — seznam všech env proměnných, které appka reálně čte z kódu (`DATABASE_URL`, Supabase, Resend, OpenRouter, Stripe, Upstash Redis, Sentry, `CRON_SECRET`, URL proměnné), bez hodnot. Vercel-injected proměnné (`VERCEL_*`, `KV_URL`, `TURBO_*`) vynechány — ty se nikdy nenastavují ručně.

### Opraveno
- `.env.production` byl trackovaný v gitu (obsahoval jen `NEXT_PUBLIC_*` public klíče — Supabase URL + publishable key, žádný leak, ale špatná praxe). Untrackováno (`git rm --cached`), `.gitignore` rozšířen o `.env.production` + explicitní `!.env.example` výjimku. **Důležité**: tyhle dva Supabase klíče byly na Vercelu nastavené jen pro Production, ne Preview — preview deploymenty se dosud spoléhaly právě na ten trackovaný soubor při buildu. Před untrackováním jsem oba klíče doplnil na Vercel i pro Preview target (`create_project_env`, `upsert`), ať se preview buildy nerozbijou.
- `ArcaEditorNew.tsx`'s `handleSave` — `bgColor`/`txtColor` chyběly v `useCallback` deps, i když se používají v těle (`upsertContent(..., { backgroundColor: bgColor, textColor: txtColor })`). Tohle byl reálný bug, ne false positive: po změně barvy bez změny jiné dependency by se při uložení mohla použít zastaralá barva ze starého closure. Doplněno do deps.
- `RecipientProfileEditor.tsx`'s `handleCoverFile`/`handleAvatarFile` — chyběla `t` (next-intl `useTranslations`) v deps. `t` je stabilní mezi rendery, takže šlo o neškodný false positive, ale doplnění je levné a správné — raději bez `eslint-disable`.
- `npm run lint` je teď úplně čistý — 0 errorů, 0 warningů.

## [1.33.0] - Skeleton loading stavy pro dashboard
Appka měla skoro žádné `loading.tsx`/Suspense pokrytí (1 výskyt v celé appce) — navigace mezi dashboard podstránkami dřív jen "visela" na bílé/prázdné obrazovce, než doběhl datový fetch.

### Přidáno
- `components/ui/Skeleton.tsx` — sdílený `Skeleton` primitiv + dva generické shellové layouty (`PageSkeleton` pro karty/grid, `FormSkeleton` pro formuláře), napojené na nový `.arca-skeleton` shimmer styl v `globals.css` (využívá existující, dosud nepoužitý `@keyframes arca-shimmer`).
- `loading.tsx` pro všech 10 dashboard rout (`/dashboard`, `/dashboard/vault`, `/dashboard/vault/[personId]`, `/dashboard/calendar`, `/dashboard/guardians`, `/dashboard/blueprint`, `/dashboard/billing`, `/dashboard/settings`, `/dashboard/arca/new`, `/dashboard/arca/[id]/edit`).

### Důležité omezení
- Skeletony jsou **záměrně obecné** (hlavička + grid karet / stack polí), ne pixel-přesné kopie každé stránky — jde o to zabránit prázdné obrazovce a posunu layoutu, ne o 1:1 vizuální shodu. Nemohl jsem to ověřit v prohlížeči — lokální `DATABASE_URL`/Supabase auth je stále rozbité z incidentu s `vercel env pull`, takže nejde se přihlásit a projít dashboard naživo. Stojí za to zkontrolovat na Vercel preview deploymentu před mergem.
- **`app/dashboard/layout.tsx` sám dělá blokující DB dotazy** (user, počty, recipients, skupiny) před vykreslením — `loading.tsx` na první (plné) načtení stránky nepomůže, protože layout se renderuje mimo Suspense hranici, kterou `loading.tsx` vytváří. Hlavní přínos je při **navigaci mezi podstránkami uvnitř dashboardu** (layout zůstává při životě, mění se jen `children`) — tam `loading.tsx` reálně naskočí. Zrychlení prvního načtení by vyžadovalo přesunout ty dotazy do vlastní streamované Suspense hranice v layoutu — mimo rozsah tohohle PR.

## [1.32.0] - Vercel Analytics + Speed Insights
Appka dosud neměla žádnou viditelnost do reálného používání — nulová analytika, žádný přehled o Core Web Vitals v produkci.

### Přidáno
- `@vercel/analytics` a `@vercel/speed-insights`, oba vykresleny v `app/layout.tsx` (`<Analytics />` + `<SpeedInsights />` vedle sebe, mimo providery — nepotřebují žádný kontext).
- **Pozor, nutný ruční krok**: samotné přidání komponent neaktivuje sběr dat — ve Vercel dashboardu (`arca` projekt → záložka Analytics / Speed Insights) je potřeba jednou kliknout "Enable". Nenašel jsem API endpoint, který by tohle přepnul programaticky.

## [1.31.0] - AI-assist přesunut na OpenRouter, oprava neplatného model ID
`app/api/arca/ai-assist/route.ts` volalo Anthropic API s `model: "claude-sonnet-4-6"` — tohle ID nikdy neexistovalo, takže každé volání skončilo chybou API (zachycenou jako `aiConnectionFailed`). Místo opravy na přímé Anthropic API přepnuto na OpenRouter (`anthropic/claude-sonnet-5.5`) — účtuje se proti existujícímu OpenRouter kreditu, žádný samostatný Anthropic účet není potřeba.

### Opraveno
- Odstraněn `@anthropic-ai/sdk` (nikde jinde v appce nepoužívaný) a nahrazen přímým `fetch` na OpenRouter's OpenAI-kompatibilní `/chat/completions` endpoint — pro jediné volání nedávalo smysl tahat si další SDK závislost.
- Nová env proměnná `OPENROUTER_API_KEY` (sensitive, Production+Preview na Vercelu).
- Ověřeno živým voláním proti OpenRouter API (model slug + klíč potvrzeny přes `curl`), ne jen typecheck/build.

## [1.30.0] - AUDIT.md: implementován přechod TRIGGERED → DELIVERED
Poslední dva otevřené nálezy z `AUDIT.md`. Dva ze čtyř bodů (duplicitní stránka, anglický text) už byly vyřešeny dřívější i18n prací — `AUDIT.md` aktualizováno, ať to odráží.

### Přidáno
- `app/arca/[livingLinkHash]/page.tsx` — zapisuje `MessagePack.status = DELIVERED` při prvním skutečném zobrazení obsahu příjemci (po challenge gate, idempotentně — jen při přechodu z `TRIGGERED`). UI na to čekalo připravené už od dřívějška (`RecipientTimeline`, `VaultClient`, `ArcaEditorNew`, dashboard karty — všechny už měly `DELIVERED` label/chip hotový, nikdy se ale nezobrazil).

### Opraveno
- Tři místa, co kontrolovala přesně `pack.status === "TRIGGERED"` (a po mé změně by po prvním zobrazení omylem appku "zapečetily" znovu) — opraveno, ať berou `TRIGGERED`/`DELIVERED` jako stejný "odemčený" stav: `VaultSealed.tsx`/gate v `page.tsx`, `app/actions/sanctuary.ts` (`/s/[token]` simulátor), `app/actions/journal.ts` (GriefJournal na doručené stránce).
- `VaultSealed.tsx` a `app/(sanctuary)/s/[token]/page.tsx`'s `SanctuarySealed` měly připravený `DELIVERED` label, co se nikdy nezobrazil (ani předtím, ani teď — po mé změně je `DELIVERED` nově explicitně "odemčený" stav, takže se k těmhle komponentám vůbec nedostane). Odstraněno jako mrtvý kód, se zdůvodněním v komentáři.

### Nástroje
- `scripts/fix-stuck-trigger-conditions.sql` — jednorázový úklid dat pro `TriggerCondition` řádky zaseknuté na `PENDING`, i když jejich `MessagePack` je dávno `TRIGGERED`/`DELIVERED` (pozůstatek starší, dnes už opravené cron logiky — `process-triggers/route.ts` teď zapisuje oba stavy atomicky ve stejné transakci). SELECT pro náhled + UPDATE pro opravu. Nemohl jsem to spustit sám — lokální `DATABASE_URL` je od incidentu s `vercel env pull` pořád nefunkční — potřebuje se spustit ručně přes Supabase SQL editor.

## [1.29.0] - next/image migrace (hardening #5, dokončení)
Dokončuje bod #5 z hardening roadmapy, odložený při PR #36 (favicon/OG/robots). 9 z 10 skutečných míst s obrázky migrováno na `next/image`, zbylé vědomě ponechané jako `<img>` s vysvětlujícím komentářem — žádné holé `eslint-disable` bez důvodu.

### Migrováno na next/image
- **`components/arca/Avatar.tsx`** — sdílený avatar (Supabase signed URL). Velikost appka řídí přes CSS třídy (`sm`/`lg`/`xl`/default), `next/image` ale potřebuje explicitní `width`/`height` — doplněna mapa `SIZE_PX` podle skutečných pixelových hodnot z `globals.css` (`.arca-avatar{,.sm,.lg,.xl}`).
- **`components/arca/GifPicker.tsx`** — GIF náhledy v gridu (`fill`, kontejner už měl `position: relative` + `aspect-square`). **Záměrně `unoptimized`** — GIPHY už posílá vhodně zmenšený webp náhled a optimalizace přes `next/image` by animaci zploštila na jeden statický snímek.
- **`components/arca/MediaGalleryClient.tsx`** — galerie nahraných médií v editoru zprávy (`fill`, pevný `aspect-[4/3]` kontejner).
- **`app/(sanctuary)/s/[token]/SanctuaryClient.tsx`** — čtvercové náhledy vzpomínek (`MemoryPhoto`, `fill`, pevný poměr stran 1:1).
- **`components/arca/RecipientProfileEditor.tsx`** — karta vzpomínky s fotkou (`fill`, pevný `aspectRatio: "4/3"`).
- **`next.config.ts`** — `images.remotePatterns` pro `**.supabase.co/storage/v1/object/**` (signed URLs pro avatary/cover/vzpomínky/media) a `*.giphy.com` (GIF náhledy).

### Vědomě ponecháno jako `<img>` (s komentářem proč)
- **`ArcaRichEditor.tsx`** (vložený obrázek v rich-textu) — `src` může být `blob:` URL během nahrávání, libovolná externí URL (nástroj "Vložit z URL" pouští jakoukoliv doménu), nebo signed URL; navíc drag-resize/ořez logika potřebuje přímý `ref` a DOM queries na neobalený `<img>`.
- **`RecipientProfileEditor.tsx`** (náhled před uploadem), **`ComposeWizard.tsx`** (2× — náhled fotek v albu + lightbox) — `blob:` object URL z `URL.createObjectURL()`, `next/image` je fundamentálně nedokáže načíst.
- **`SanctuaryClient.tsx`** (obsah zprávy), **`ArcaReveal.tsx`** (obsah zprávy) — fotky vložené do textu zprávy na celou šířku v jejich přirozeném poměru stran; appka neukládá rozměry nahraných obrázků do DB, takže `next/image` nemá, čím by si spočítal layout bez zploštění/ořezání fotky do vynuceného poměru stran.

## [1.28.0] - React Compiler-readiness cleanup (PR #42 follow-up)
PR #42 (ESLint setup) stáhlo `react-hooks/set-state-in-effect`/`purity`/`static-components` na `warn`, protože nálezy byly rozsáhlé a různorodé. Po rozboru šlo o dvě různé kategorie — tahle PR obě dořešila a vrátila pravidla zpátky na `error` v `eslint.config.mjs`.

### Opraveno (skutečná oprava, ne jen umlčení)
- **`components/dashboard/ModeFilterSection.tsx`** — `FilterTab` byla komponenta definovaná uvnitř render těla rodiče (nová instance na každý render). Vytažena ven, `active`/`onClick` teď jdou přes props místo closure nad `filter`/`setFilter`.
- **`components/arca/TriggerSettings.tsx`, `sheets/ChapterSheet.tsx`** — `Date.now()` volané přímo v render těle (pro "zítřek" jako min. datum) je nepurity. `useMemo(() => Date.now(), [])` pravidlo NEuspokojí (purity kontrola platí i uvnitř `useMemo` callbacků) — funguje jen lazy `useState(() => Date.now())` inicializér, protože ten běží jen jednou za instanci komponenty. Přepsáno na `useState` lazy init.
- **`app/dashboard/settings/SettingsClient.tsx` + `page.tsx`** — `daysSinceActive` (stejná nepurity, ale závislá na `user.lastActiveAt` z propu, takže lazy `useState` by zastaralo). Přesunuto na server — `page.tsx` ho teď počítá a posílá jako prop, stejný vzor jako `dashboard/page.tsx` už dřív dělal pro `ModeFilterSection`. (Mimochodem: `new Date()` tohle pravidlo neřeší, jen explicitní `Date.now()` — i server-side varianta musela přejít na `new Date().getTime()`.)
- **`components/layout/DashboardShell.tsx`** — "zavřít mobilní drawer při změně route" byl `useEffect` reagující na `pathname`. Přepsáno na Reactem doporučený vzor "uprav stav během renderu" (track `prevPathname`, `setDrawerOpen(false)` přímo v těle komponenty při změně) — drawer se teď zavře ve stejném renderu jako navigace, ne o snímek později.

### Umlčeno cíleně, s komentářem (ne přes blanket rule downgrade)
Zbylých 9 nálezů napříč `ComposeWizard.tsx` (6×), `RecipientManager.tsx`, `GifPicker.tsx`, `AppearanceButton.tsx`, `vibe-context.tsx`, `BlueprintClient.tsx` jsou legitimní vzory, co pravidlo nerozpozná:
- **Object-URL lifecycle** (nahrávání hlasu/videa/fotek v `ComposeWizard.tsx`) — `useEffect` synchronizující state s externím zdrojem (blob → `URL.createObjectURL` → cleanup `revokeObjectURL`), přesně to, co pravidlo samo označuje za platné použití efektu.
- **localStorage čtení po mountu** (`AppearanceButton.tsx`, `vibe-context.tsx`) — appka má flash-prevention inline script v `app/layout.tsx`, co nastaví DOM přímo před prvním vykreslením; React state to musí dohnat až po mountu, protože `localStorage` na serveru neexistuje (lazy initializer by při SSR spadl).
- **Sync z URL parametru / Server Component re-fetch** (`ComposeWizard.tsx`'s `prefilledDate`, `RecipientManager.tsx`) — hodnota se může změnit i po prvním mountu (App Router component reuse, `router.refresh()`), takže lazy initializer nestačí.
- **Data fetch při otevření** (`GifPicker.tsx`) — "načti GIFy, když se picker otevře" je učebnicový platný efekt.
- **Auto-korekce neplatného výchozího věku + zavření lightboxu při smazané fotce** (`ComposeWizard.tsx`) — defensive, ne load-bearing (render guard už stejně stav ošetří), ale přepis bez možnosti to vizuálně otestovat (dashboard vyžaduje login, lokální DB je rozbitá) by byl zbytečné riziko.
- **Reset formuláře + focus inputu při otevření sheetu** (`BlueprintClient.tsx`) — focus skutečně potřebuje efekt (DOM musí být připravený), smícháno se state resetem.

Každé umlčení je `eslint-disable-next-line`/`eslint-disable`-`eslint-enable` pár přímo u řádku, co pravidlo hlásí (ne u `useEffect(` o řádek výš — na tom pravidlo trvá přesně, jinak hlásí "unused directive"), s komentářem vysvětlujícím proč.

## [1.27.0] - Security: 5 nálezů z IDOR auditu
Prošel jsem všech 26 souborů v `app/actions/` a `app/api/` (server actions + API routy) a zkontroloval, že každá operace nad konkrétním záznamem (podle ID z klienta) má odpovídající `ownerId`/`userId` filtr. Drtivá většina kódu to má správně (dobrý, konzistentní vzor napříč appkou) — ale našlo se 5 skutečných mezer:

### Opraveno
- **`app/actions/recipients.ts::uploadRecipientCover`** (moderate) — na rozdíl od sousední `uploadRecipientAvatar` o pár řádků výš vůbec neověřovala, že `recipientId` patří přihlášenému uživateli, než zapsala `coverUrl`. Kdokoliv přihlášený mohl nastavit cover obrázek cizímu příjemci, kdyby znal/uhodl jeho `recipientId`. Doplněn stejný `findFirst({ messagePack: { ownerId: user.id } })` check jako u avataru.
- **`app/actions/recipients.ts::getSignedAvatarUrl`/`getSignedCoverUrl`/`getSignedMemoryUrl`** (moderate, defense-in-depth) — žádná autentizace ani kontrola, že `path` patří volajícímu. Aktuálně nejsou volané z žádné Client Component (jen ze Server Components), takže jejich Server Action ID se neobjevuje v client bundlu — ale `"use server"` dělá z každé exportované funkce v souboru samostatně volatelný endpoint, takže je to křehký předpoklad, ne skutečná ochrana. Doplněno `requireUser()` + `path.startsWith(\`${user.id}/\`)`, stejný vzor jako `addMediaContent` v `arca.ts`.
- **`app/actions/categories.ts::assignCategory`** (nízká závažnost) — přiřadila `categoryId` k vlastnímu packu bez ověření, že ta kategorie patří přihlášenému uživateli (cross-tenant reference na cizí kategorii — menší únik jména/barvy kategorie). `groups.ts` má pro `assignPersonGroup`/`assignGuardianGroup` správný vzor (ověří `groupId` patří uživateli) — `assignCategory` byla jediná výjimka. Sjednoceno.
- **`app/api/auth/sync-user/route.ts`** (moderate — open redirect) — `GET` handler přesměrovával na `next` query parametr přes `new URL(next, request.url)` bez validace. Pokud je `next` absolutní URL (`https://evil.example`), `new URL()` basi úplně ignoruje a přesměruje mimo appku — klasický phishing vektor přes důvěryhodnou doménu. `app/api/auth/callback/route.ts` to dělá správně (`${origin}${next}`, string spojení, nejde obejít) — `sync-user` byl jediný, co to dělal přes `new URL()`. Doplněna kontrola, že `next` začíná `/` a ne `//` (protocol-relative URL je taky útok).
- **`lib/unlock-token.ts`** (nízká závažnost, ale fail-open) — HMAC klíč pro podpis "unlock" cookie (challenge-question gate na `/arca/[hash]`) měl fallback na hardcoded string `"dev-signing-key-replace-in-prod"`, pokud `CRON_SECRET` chybí. Ten string je veřejně čitelný v tomhle (public) repozitáři — kdyby `CRON_SECRET` někdy v produkci chyběl (což se v rámci týhle session už jednou reálně stalo, viz incident v [1.16.0]), kdokoliv by si mohl podepsat platný unlock token pro libovolný pack. Fallback teď platí jen mimo `NODE_ENV=production` — v produkci bez `CRON_SECRET` funkce rovnou vyhodí chybu (fail-closed, ne tiše nebezpečný fallback). Ověřeno, že `npm run build` s chybějícím `CRON_SECRET` lokálně stále projde (dotčené routy jsou `force-dynamic`, `key()` se nevolá za build time).

### Zkontrolováno, beze změny (správně implementováno)
`activity.ts`, `blueprint.ts`, `chapters.ts`, `contacts.ts`, `delivery.ts`, `groups.ts`, `guardians.ts`, `journal.ts` (vědomě public — recipient journal je otevřený komukoliv po `TRIGGERED` stavu packu), `locale.ts`, `arca.ts` (obzvlášť důkladné — defense-in-depth komentáře přímo v kódu), `recipients.ts` zbytek, `settings.ts`, `unlock.ts`, `sanctuary.ts`, `api/arca/calendar-events`, `api/auth/callback`, `api/cron/pulse` (fail-closed na chybějící `CRON_SECRET`, správný vzor oproti `unlock-token.ts` před opravou), `api/stripe/checkout`.

## [1.26.0] - ESLint setup
### Přidáno
- `eslint.config.mjs` (flat config) + `eslint-config-next` — appka dosud neměla vůbec nakonfigurovaný lint. Next.js 16 vlastní `next lint` příkaz zrušil, takže přímo přes `eslint-config-next`'s nativní flat-config export (žádný `FlatCompat`/legacy most potřeba — `eslint-config-next@16` ho sám exportuje jako pole).
- `npm run lint` (`eslint .`) doplněn do `.github/workflows/ci.yml` jako čtvrtý krok CI gatu (#37), vedle typecheck/build/testů.

### Opraveno
- Prvních ~15 nálezů: neescapované uvozovky v JSX textu (`react/no-unescaped-entities`, mechanická oprava), 4 mrtvé `eslint-disable` komentáře pro pravidlo, co se v nové konfiguraci vůbec nespouští (`jsx-a11y/media-has-caption`), a jeden skutečný `rules-of-hooks` nález — `VaultClient.tsx` mělo funkci `usePreset()`, kterou ESLint podezíral z Reactího hooku jen kvůli jménu (false positive z pojmenovací kolize, ne `useState`/`useEffect` uvnitř). Přejmenováno na `applyPreset`.

### Vědomě ponecháno jako warning, ne error
- `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/static-components` — nová pravidla v `eslint-config-next@16` připravující na React Compiler. Odhalila reálný, ale rozšířený vzor napříč ~14 soubory (`AppearanceButton.tsx`, `DashboardShell.tsx`, `vibe-context.tsx`, `ComposeWizard.tsx`, …): čtení z `localStorage` uvnitř `useEffect` + synchronní `setState`, a komponenty definované uvnitř render těla rodiče. Skutečné nálezy, ne false positives — ale oprava každého znamená restrukturalizaci (lazy `useState` inicializéry, vytažení inline komponent ven), což potřebuje individuální review a test, ne hromadný commit v rámci "zapoj lint" úkolu. Staženo na `warn` (vidět v `npm run lint`, nerozbíjí CI), dokud se na to nedojde jako na samostatný kus práce.

## [1.25.0] - i18n: dokončen celý zbývající rozsah (e-maily + metadata layoutu)
### Opraveno
- `emails/SanctuaryInvitation.tsx` — jediná ze 4 transakčních e-mailových šablon, která byla celá hardcoded česky (`lang="cs"`), zatímco zbylé 3 (`ArcaDeliveryEmail`/`GracePeriodWarningEmail`/`GuardianAlertEmail`) už byly plně anglicky (recipient-facing, stejná konvence jako `/arca/[hash]`). Navíc tenhle e-mail vede přímo na `/(sanctuary)/s/[token]`, kterou PR #39 právě přeložil na angličtinu — česky psaný e-mail vedoucí na anglickou stránku by byl nová nekonzistence. Přeloženo (`lang="en"`), stejně tak e-mailový `subject` v `app/actions/delivery.ts`.
- `app/layout.tsx` — `metadata` (statický `export const`) nahrazeno `generateMetadata()`, které čte nový namespace `App.meta` (next-intl, server-side). Předtím byl titulek/popisek v záložce prohlížeče natvrdo anglicky na každé stránce, co nemá vlastní `generateMetadata` override (většina dashboardu, `/guardian/confirmed`, …) — `/` (Landing) a `/login` (Auth) už svůj vlastní override měly, ty beze změny.

### Zkontrolováno beze změny
- `ArcaDeliveryEmail.tsx`, `GracePeriodWarningEmail.tsx`, `GuardianAlertEmail.tsx` — všechny tři už byly plně anglicky, žádný zásah potřeba.

**Tímto je dokončený celý "remaining i18n scope" seznam ze zbytku auditu: `/guardian/confirmed` + `/(sanctuary)/s/[token]` (PR #39), `ArcaEditorNew`/`ArcaRichEditor` (PR #40), transakční e-maily a metadata layoutu (tato PR).**

## [1.24.0] - i18n: ArcaEditorNew + sdílený ArcaRichEditor
### Přidáno
- `components/arca/ArcaRichEditor.tsx` — celý toolbar, AI Pomoc panel, crop overlay a resize úchyty přeloženy přes nový sdílený namespace `RichEditor` (next-intl). Protože je komponenta sdílená mezi `ComposeWizard` (nová zpráva) a `ArcaEditorNew` (editace existující zprávy), oprava se projeví na obou místech najednou — žádné prop-drillování, komponenta si bere `useTranslations("RichEditor")` sama.
  - AI Pomoc: nabídka příležitostí (narozeniny/poděkování/omluva/…) se teď generuje z překladů, takže hodnota posílaná do `/api/arca/ai-assist` promptu je ve správném jazyce (ten endpoint sám sleduje aktivní locale od PR #34).
  - Barevná témata (Motiv): štítky "Výchozí"/"Pergamen" přeloženy, zbytek (Midnight/Slate/Forest/Wine) zůstal jako vlastní jména beze změny.
- `components/arca/ArcaEditorNew.tsx` (editace existující zprávy — poslední netknutá velká plocha z i18n rozsahu) — plně přeloženo přes nový namespace `ArcaEditorNew`: breadcrumb, kroky 01–04 (příjemci/forma/obsah/spouštěč), náhled doručení, akce (uložit/aktivovat/zrušit), stavové chipy (`PackStatus` enum), AI CTA panel. Formátování data v náhledu teď sleduje aktivní locale (`cs-CZ`/`en-GB`) stejným vzorem jako `ComposeWizard.tsx`, místo natvrdo `cs-CZ`.

## [1.23.0] - i18n: /guardian/confirmed + sjednocení /(sanctuary)/s/[token] s /arca/[hash]
### Přidáno
- `/guardian/confirmed` (stránka, na kterou strážce přistane po potvrzení/uvolnění) nově plně v next-intl — nový namespace `GuardianConfirmed` v `messages/cs.json`/`en.json` pro všech 5 stavů (`confirmed_alive`/`released`/`already_used`/`expired`/`invalid`).

### Opraveno — architektonické zjištění cestou
- `AUDIT.md` popisoval `/arca/[hash]` a `/(sanctuary)/s/[token]` jako duplicitní implementace stejné doručovací stránky a doporučoval buď sloučit, nebo aspoň sjednotit SELF/LEGACY tón. Při bližším zkoumání šlo o neaktuální popis: obě stránky se reálně používají pro různé věci — `/arca/[hash]` je automatická cesta z cronu/guardian akce, `/(sanctuary)/s/[token]` je interní **test/simulační nástroj** (`components/arca/DeliverySimulator.tsx`, UI label "Simulovat doručení" s badge "TEST") pro majitele, který chce před ostrým spuštěním zkontrolovat, jak doručení vypadá, nebo poslat "cinematic invitation" e-mail navíc. Nejde tedy o sloučení, ale o dorovnání kvality — `/(sanctuary)/s/[token]` byla celá hardcoded česky a bez SELF/LEGACY rozlišení, zatímco `/arca/[hash]` je vědomě (viz [1.4.0]) hardcoded anglicky s plným SELF/LEGACY tónem (recipient-facing stránky v appce vědomě nejedou přes next-intl — příjemce může být kdokoliv).
- `app/(sanctuary)/s/[token]/SanctuaryClient.tsx`, `SanctiaryChallengeGate.tsx`, `page.tsx` — veškerý hardcoded český text přeložen na angličtinu, datum přepnuto z `cs-CZ` na `en-GB` (stejná konvence jako `ArcaReveal.tsx`).
- `app/actions/sanctuary.ts` — `getSanctuaryContent` teď vrací `isSelf` (`messageMode === "SELF"`, stejně jako `/arca/[hash]/page.tsx`), prochází přes `SanctuaryClient` do hero textu ("A letter from your past self is ready" vs. "This message is waiting for you") — stejné SELF/LEGACY rozlišení jako `ArcaReveal`. Chybové hlášky challenge-gate ("Prosím vyplň odpověď."/"Odpověď nesedí...") sjednoceny s anglickým zněním z `app/actions/unlock.ts` (ekvivalentní flow pro `/arca/[hash]`).

## [1.22.0] - npm audit: 97 → 47 zranitelností
### Opraveno
- Celá rodina `@tiptap/*` (31 balíčků) povýšena z `^3.23.6` na `^3.31.4` — opravuje **high-severity ReDoS** v parsování Markdown atributů a **moderate XSS/prototype-pollution** v `mergeAttributes()` (vlastní `__proto__` klíč se dal proměnit ve vykonatelné DOM atributy). Tiptap je živě používaný rich-text editor appky (`ArcaRichEditor`/`ArcaEditorNew`/`ComposeWizard`), takže šlo o reálně dosažitelnou zranitelnost z uživatelského vstupu, ne jen dev-tooling.
- `npm audit fix` (bez `--force`) po čisté reinstalaci (`rm -rf node_modules package-lock.json && npm install`) smazal zbytek: kritickou **next** zranitelnost (SDK byl v rámci stávajícího `^16.2.4` rozsahu zastaralý), kritickou **tar** path-traversal, high **ws**/**sharp**/**postcss**/**form-data**/**prosemirror-view**/**js-yaml**/**hono** a moderate **uuid**/**svix**/**supabase**/**resend** — všechno v rámci existujících `^` rozsahů v `package.json`, žádná verze v `package.json` se neměnila krom tiptapu (lockfile byl prostě zastaralý).
- Vedlejší efekt čisté reinstalace: `stripe` SDK (`^22.1.0`, rozsah beze změny) se refreshnul na novější patch, jehož typy vyžadují novější `apiVersion` literal — `lib/stripe.ts` aktualizováno z `"2026-04-22.dahlia"` na `"2026-08-26.dahlia"` (stejná "dahlia" release řada, jen novější datované vydání — odpovídá tomu, co SDK teď typově očekává).

### Vědomě nedořešeno — zbývá 47 zranitelností (1 low, 5 moderate, 40 high, 1 critical)
Všechny zbylé jsou výhradně v **`vercel`** (deploy CLI) a **`prisma`**/**`@tailwindcss/typography`** build-tooling řetězcích — nic z toho se neshippuje do produkčního bundlu, běží to jen lokálně/v CI pod kontrolou vývojáře. Oprava by vyžadovala skutečný **downgrade** (`npm audit fix --force` chce nainstalovat `vercel@50.41.0` místo současné `^53.1.1` a `prisma@6.19.3` místo současné `^7.8.0`) — u Prisma by to rozbilo appku rovnou (`prisma.config.ts` vyžaduje Prisma 7+ formát konfigurace), u Vercel CLI by to byl reálný krok zpět ve funkcích bez odpovídajícího přínosu. Necháno beze změny, dokud tyto nástroje samy nevydají opravenou verzi v rámci svých současných major verzí.

## [1.21.0] - Odstraněn nepoužívaný model Executor (hardening #3)
### Odstraněno
- Prisma model `Executor` + enum `ExecutorStatus` + relace `User.ownedExecutors`/`User.assignedExecutors` — z auditu vyšlo, že na tento model nikde v `app`/`components`/`lib` neexistuje jediná reference (jen v automaticky generovaném Prisma klientovi). Odstranění nic funkčně neubírá.
- Migrace `prisma/migrations/20261012131835_remove_executor_model/` (`DROP TABLE "Executor"` + `DROP TYPE "ExecutorStatus"`) — napsaná ručně, ne vygenerovaná přes `prisma migrate dev`, protože `DATABASE_URL` je od incidentu s `vercel env pull` (viz [1.16.0]/[1.17.0] Sentry) lokálně nefunkční. **Je potřeba pustit `npx prisma migrate deploy` proti produkční DB po mergnutí, migrace se nikde automaticky nespouští** (build skript dělá jen `prisma generate`).
- README upraveno — netvrdí už "password vaults" jako samostatnou funkci. Reálně existující ekvivalent je `PackType.PRACTICAL` (praktické/pozůstalostní informace jako součást běžného message packu), beze zvláštního přístupového modelu — to zůstává nezměněné, jen popis teď odpovídá realitě.
- `TriggerType.MANUAL_EMERGENCY` (funkce "sealed" spouštěče) a `PackType.PRACTICAL` zůstávají nedotčené — jsou reálně používané, nezávisí na Executor modelu, jen komentář u `MANUAL_EMERGENCY` upraven, aby neodkazoval na neexistující Executor roli.

## [1.20.0] - SEO základy: favicon, OG obrázek, robots.txt, sitemap.xml (hardening #5, část 1)
### Přidáno
- `app/icon.tsx` / `app/apple-icon.tsx` / `app/opengraph-image.tsx` — vygenerované přes `next/og` (`ImageResponse`), žádný externí asset soubor (appka dosud neměla `public/` adresář vůbec). Jednoduché "A" / "Arca" wordmark na tmavém pozadí v barvě brandu (`--clay` accent).
- `app/robots.ts` + `app/sitemap.ts` — povoluje indexaci jen veřejných marketingových stránek (`/`, `/login`), explicitně zakazuje `/dashboard`, `/api`, `/arca`, `/s`, `/guardian` (auth-gated nebo privátní per-token odkazy, co nemají co dělat ve výsledcích vyhledávání).
- `lib/site-url.ts` — sdílený `SITE_URL` fallback (`NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_APP_URL` → `localhost:3000`), použitý v robots/sitemap/metadataBase. **Použito `||`, ne `??`** — narazil jsem na to, že `NEXT_PUBLIC_APP_URL` je v tomhle prostředí nastavená na prázdný string (ne `undefined`, viz incident v [1.16.0]), takže `??` ji vzala jako platnou hodnotu a `new URL("")` spadl hned při buildu. Stejný vzorec (`??` misto `||`) je i v `app/actions/settings.ts:117` pro reset-password redirect — nedotčeno (mimo scope týhle PR), ale stejná potenciální chyba by se tam projevila za stejných podmínek.
- `app/layout.tsx` — přidán `metadataBase`, potřeba pro resolvování relativních URL v generovaných OG/ikonách.
- `/icon`, `/apple-icon`, `/opengraph-image`, `/robots.txt`, `/sitemap.xml` doplněny do `PUBLIC_PREFIXES` v `proxy.ts` (stejný důvod jako `/monitoring` dřív) — crawlerům/scraperům se tak nezbytečně nevolá Supabase auth lookup.
- Ověřeno lokálně (`npm run build` + `npm run start`, curl na všech 5 nových routách) — 200, správné `content-type`, obrázky vizuálně zkontrolované.

### Zbývá (hardening #5, část 2)
- Migrace 8 míst s `<img>` na `next/image` zatím neudělaná — vyžaduje case-by-case rozhodnutí (blob: object URL náhledy před uploadem next/image fundamentálně nepodporuje, zůstanou jako `<img>`; zbytek potřebuje `remotePatterns` pro Supabase storage doménu a případně GIF picker API). Odloženo jako samostatný krok, ať se neriskuje vizuální regrese bez možnosti to tady vizuálně ověřit proti reálným datům.

## [1.19.0] - AI-assist respektuje jazyk appky (hardening #4)
### Opraveno
- `app/api/arca/ai-assist/route.ts` měl natvrdo česky psaný prompt ("Píšeš výhradně v češtině") i chybové hlášky bez ohledu na to, v jakém jazyce uživatel appku používá — anglicky mluvící uživatel tak dostával česky napsané AI návrhy zprávy.
- Endpoint teď zjišťuje aktivní jazyk stejně jako `i18n/request.ts` (pořadí: uložená `User.locale` → `arca_locale` cookie → výchozí `cs`) a podle toho vybere prompt, výchozí hodnoty (`recipientName`/`occasion`) i chybové hlášky z malého `COPY` slovníku (cs/en).
- `Unauthorized` (401) zůstává beze změny — stejná anglická konvence jako ve všech ostatních API routách v appce, nejde o uživatelsky čitelnou hlášku.

### Vědomě mimo scope
- Model id `claude-sonnet-4-6` v témže souboru zůstává nezměněný — samostatné zjištění z auditu (neodpovídá žádnému současnému modelu), netýká se lokalizace.

## [1.18.0] - Sentry error monitoring (hardening #2, část 2 — dokončeno)
### Přidáno
- `@sentry/nextjs` (v11) nainstalován a zapojen přes `instrumentation.ts` (server + edge runtime), `instrumentation-client.ts` (browser) a `sentry.server.config.ts`/`sentry.edge.config.ts`. `next.config.ts` obalen přes `withSentryConfig` (z `@sentry/nextjs/config`, aktuální subpath pro SDK v11+).
- DSN projektu `vii-universe/javascript-nextjs` natvrdo v configu (DSN nejsou tajné — jsou veřejná, bezpečně viditelná i v browser bundlu).
- `tunnelRoute: "/monitoring"` — client-side chyby jdou přes vlastní Next.js server (obchází ad-blockery). `/monitoring` doplněno do `PUBLIC_PREFIXES` v `proxy.ts`, aby tunelované requesty neprocházely zbytečně Supabase auth kontrolou.
- `tracesSampleRate: 1` (performance monitoring zapnuto na 100 %, lze snížit později podle objemu provozu).
- `npx @sentry/wizard` se v tomto neinteraktivním prostředí opakovaně tiše zasekával na promptu "routovat přes server?" (clack prompt bez TTY → tichý `process.exit(0)` bez zápisu souborů) — zjištěno ze zdrojového kódu wizardu v npx cache. Soubory napsány ručně podle stejných šablon, které wizard generuje.

### Zbývá
- ~~`SENTRY_AUTH_TOKEN` není nikde nastavený~~ — doplněno (Vercel env Production+Preview i `.env.local`), ověřeno lokálně s `CI=true npm run build`: `Successfully uploaded source maps to Sentry`.
- Hardening roadmapa #2 (Sentry + rate limiting) je tímto hotová celá.

## [1.17.0] - CI gate (hardening #6 — poslední bod roadmapy)
### Přidáno
- `.github/workflows/ci.yml` — na každý PR (a push do `main`) spustí `npx tsc --noEmit`, `npm run build` a `npm test`. Dřív běžel na PR jen Telegram notifikátor (`pr-notify.yml`), žádná skutečná kontrola.
- Build krok běží s dummy `DATABASE_URL`/Supabase proměnnými — appka se k DB za buildu nepřipojuje (všechny routy jsou `ƒ` dynamic, Prisma codegen taky nepotřebuje živé spojení), takže nejsou potřeba žádné reálné secrets v GitHub Actions.
- `npm test` (Vitest) v CI běží bez `KV_REST_API_URL`/`TOKEN` — živé Upstash testy v `lib/rate-limit.test.ts` se díky `describe.skipIf` samy přeskočí, nespadnou.
- Ověřeno lokálně: `npm ci --dry-run` (lockfile v pořádku) + build se stejnými dummy proměnnými, jaké použije CI.

### Opraveno
- `app/actions/settings.ts:117` — stejný `??` vs. prázdný string bug jako v [1.20.0] SEO PR (`SITE_URL`), tentokrát v reset-password redirect URL. Opraveno na `||`.

### Vědomě mimo scope
- Lint krok vynechán — appka nemá vůbec nakonfigurovaný ESLint/lint script (samostatné zjištění z auditu, netýká se zadání tohohle kroku).

## [1.16.0] - Rate limiting (hardening #2, část 1)
### Přidáno
- `lib/rate-limit.ts` — sdílený rate limiter nad Upstash Redis (`@upstash/redis` + `@upstash/ratelimit`, sliding window). **Fail-open design**: když Redis není nakonfigurovaný nebo kontrola selže, požadavek se propustí (nechráněný provoz je lepší než plný výpadek celé appky).
- Nasazeno na tři endpointy:
  - `POST /api/arca/ai-assist` — 10 požadavků / hodinu, klíčováno podle `user.id` (reálné peníze za Anthropic API, hrozba je nechtěná smyčka nebo zneužití přihlášeným uživatelem).
  - `POST/GET /api/heartbeat/[webhookSecret]` — 30 požadavků / minutu, klíčováno podle IP (hrozba je brute-force hádání `webhookSecret`, kde každý pokus je jiný klíč — limit podle IP, ne podle hádané hodnoty).
  - `GET /api/guardians/action` — 20 požadavků / minutu, klíčováno podle IP (stejná logika — brute-force `token`).
- `lib/rate-limit.test.ts` — integrační test proti reálnému Upstash store (ne mock): ověřuje, že se po N požadavcích skutečně zablokuje a že různé identifikátory se sledují nezávisle.
- `vitest.config.mts` teď načítá `.env.local` (Vitest na rozdíl od Next.js nedělá automaticky) — potřeba, aby `lib/rate-limit.test.ts` viděl reálné `KV_REST_API_URL`/`KV_REST_API_TOKEN`.

### Incident při instalaci Upstash integrace (zapsáno do pamětí, bez dopadu na produkci)
- `vercel integration add upstash/upstash-kv` bez `--no-env-pull` automaticky spustil `vercel env pull` pro Development prostředí, které přepsalo funkční lokální `.env.local` a vymazalo `DATABASE_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`. Pokus o obnovu přes `vercel env pull --environment=production` vrátil jen prázdné hodnoty — tyto proměnné jsou na Vercelu typu "Sensitive" (write-only, nelze je zpětně přečíst přes CLI ani UI).
- Produkce samotná nebyla zasažena (jen lokální soubor). Lokální e2e testy z PR #31, které potřebují DB/Supabase/Resend, teď nemůžou běžně běžet, dokud uživatel tyto hodnoty manuálně nedoplní (ze Supabase dashboardu, Resend dashboardu, nebo vygeneruje nový `CRON_SECRET`). Rozhodnuto: další ověřování se dělá přes reálné Vercel nasazení, ne lokální build.

### Zbývá (hardening #2, část 2)
- Sentry error monitoring — čeká se, až uživatel založí účet a dodá DSN.

## [1.15.0] - Testy na kritickou cestu (začátek hardeningu)
### Přidáno
- **Vitest** pro čisté funkce — `lib/triggers/milestone.test.ts` (15 testů): výpočet věkového milníku a relativního posunu data, přechodné roky, hranice "future date", `nextValidTargetAge`. Žádná DB/env proměnná potřeba, běží okamžitě.
- **Playwright e2e** pro kritickou cestu compose → trigger → delivery:
  - `e2e/compose-flow.spec.ts` — přihlášení, celý ComposeWizard (výběr režimu SELF, vyplnění editoru, nastavení spouštěče), ověření přes Prisma, že pack skutečně vznikl se správným `messageMode`/obsahem/příjemcem.
  - `e2e/cron-trigger.spec.ts` — zasadí pack s už splatným `SPECIFIC_DATE` spouštěčem a zavolá skutečný `/api/cron/process-triggers` endpoint (stejně jako Vercel Cron), ověří přechod `ACTIVE → TRIGGERED` a `TriggerCondition.status → EXECUTED`; druhý test ověřuje, že špatný `CRON_SECRET` dostane 401.
  - `e2e/stripe-webhook.spec.ts` — `checkout.session.completed` podepsaný lokálně přes `stripe.webhooks.generateTestHeaderString` (bez nutnosti volat Stripe API), ověří `User.isPremium → true`; druhý test ověřuje, že podvržený podpis dostane 400. **Zatím se přeskakuje** — v tomhle prostředí chybí `STRIPE_WEBHOOK_SECRET` (viz níže).
  - `e2e/helpers/test-user.ts` — sdílený throwaway-účet helper (stejný vzor jako ruční ověřování při i18n práci), teď jednou napsaný a znovupoužitelný napříč testy.
- `npm test` (Vitest) a `npm run test:e2e` (Playwright) nahrazují dřívější `"test": "echo ... && exit 1"` stub.
- `README.md` — krátká sekce Testing s instrukcemi a varováním, že e2e testy běží proti reálné projektové DB (žádná vyhrazená testovací Supabase instance zatím neexistuje — vědomé rozhodnutí z debaty před touhle PR).

### Zjištěno při práci (mimo scope týhle PR, zapsáno do pamětí/roadmapy)
- **Produkční Vercel projekt je `arca` (arca-taupe.vercel.app), ne `arca-main`** — `vercel link` se bez `--project` napojí jen podle názvu složky na jiný/zastaralý projekt. Důležité pro cokoliv příště, co bude sahat na Vercel env.
- **`arca` nemá v produkci ani preview nastavené žádné Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`) ani `ANTHROPIC_API_KEY` proměnné** — platby (ARCA Pro) i AI-assist jsou v produkci momentálně nefunkční, bez ohledu na to, že kód je hotový. Uživatel řekl, že klíče doplní sám.
- `npm audit` hlásí ~99 zranitelností (2 kritické, 52 high) už na `main` před přidáním testovacích balíčků — nesouvisí s touhle prací, založeno jako samostatná položka roadmapy.
- `.env.production` je omylem trackovaný v gitu (jen `NEXT_PUBLIC_*` klíče, žádný skutečný leak, ale špatná praxe).

### Zbývá (další krok v hardening roadmapě)
- CI gate (spustit `tsc`/`build`/testy automaticky na každý PR).
- Jakmile budou Stripe klíče doplněné, ověřit `stripe-webhook.spec.ts` doopravdy proběhne (teď jen ověřeno, že se správně přeskakuje).

## [1.14.0] - i18n: Nová zpráva (výběr režimu + celý ComposeWizard)
### Přidáno
- **Celý průvodce tvorbou zprávy plně přeložen** do češtiny a angličtiny (`app/dashboard/arca/new/ComposeWizard.tsx`, `app/dashboard/arca/new/page.tsx`) — nový namespace `Compose` v `messages/cs.json`/`messages/en.json`: úvodní obrazovka výběru režimu (Fáze 0 — „Sobě do budoucna“ vs. „Odkaz pro blízké“), všechny 4 kroky průvodce (Pro koho / Forma / Obsah / Kdy se otevře), nahrávání hlasu a videa, výběr fotek, náhled doručení, chybové hlášky.
- Formát data (věkový milník, relativní doba, konkrétní datum) respektuje aktivní jazyk (`cs-CZ`/`en-GB`) místo natvrdo `cs-CZ`.
- Počet fotek přes ICU plural, konzistentně se Schránkou/Manuálem.
- Drobná oprava konzistence na `/arca/[livingLinkHash]` (ArcaReveal — SELF tón, Fáze 1.5/2): dvě poslední zbylé česky psané věty („Napsat odpověď“, „Odpověz sám sobě…“) přepsány na angličtinu, aby odpovídaly zbytku téhle stránky, která byla už od Fáze 1.5 vědomě celá anglicky (recipient-facing stránka, viz CHANGELOG [1.4.0]). Nejde o zavedení next-intl na tuhle stránku — jen sjednocení jazyka v rámci existujícího vzoru.

### Vědomě mimo scope (další PR)
- `components/arca/ArcaEditorNew.tsx` (610 řádků, ~41 řádků česky) — editor pro **úpravu** už existující zprávy (`/dashboard/arca/[id]/edit`), samostatná komponenta od `ComposeWizard.tsx`. Necháno na vlastní menší PR.
- `components/arca/ArcaRichEditor.tsx` — samotný rich-text editor (toolbar „Motiv“, počítadlo znaků atd.) vložený do kroku 03 — viditelné na screenshotech jako poslední česky psaná část průvodce. Sdílený mezi `ComposeWizard` i `ArcaEditorNew`, dává smysl přeložit spolu s `ArcaEditorNew` v příští PR.
- `app/dashboard/arca/new/NewArcaForm.tsx` — nalezeno, ale nikde v appce nepoužívané (mrtvý kód, stejně jako dřív `GuardianManager.tsx`). Nepřekládáno.
- `/guardian/confirmed` a transakční e-maily zůstávají v poslední fázi beze změny.

### Zbývá (další PR)
- `ArcaEditorNew.tsx` + `ArcaRichEditor.tsx` (úprava existující zprávy).
- Transakční e-maily (Resend šablony) + `/guardian/confirmed`.

## [1.13.0] - i18n: Nastavení + přepínač jazyka v appce
### Přidáno
- **Nastavení plně přeloženo** do češtiny a angličtiny (`app/dashboard/settings/page.tsx`, `SettingsClient.tsx`) — nový namespace `Settings`: záložky Profil/Bezpečnost/Spouštěcí mechanismus, osobní údaje, přehled účtu, reset hesla, Heartbeat webhook, celá konfigurace spouštěcího mechanismu (stav, podmínka, živý monitor).
- **`AppearanceButton.tsx` plně přeloženo** (dřív vědomě odloženo z Dashboard PR #23) — nový namespace `Appearance`: režim/akcent/podsvícení/pozadí, včetně předvoleb scén a barevných akcentů.
- **`LanguageSwitcher` přidán do Dashboard chrome** (`SidebarContent.tsx`, pod tlačítkem Vzhled) — druhé odložené položka z PR #23. Appka teď nabízí přepínání jazyka na třech místech: landing page, login a napříč celým dashboardem (sidebar), plus nově navíc přímo v Nastavení → Profil, kde je nejpřirozenější to hledat.
- Formát data u spouštěcího mechanismu (v popisu "Schránky se odešlou dne…") respektuje aktivní jazyk (`cs-CZ`/`en-GB`) místo natvrdo `cs-CZ`.
- „Poslední přihlášení" přes ICU plural (`Před 1 dnem` / `Před 2 dny`), oprava stejné třídy chyby jako u Strážců/Manuálu — původní kód nikdy nerozlišoval `1` od zbytku (`Před 1 dny` bylo gramaticky špatně).

### Zbývá (další PR)
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony) + `/guardian/confirmed`.

Tímhle je vyřešený i bod 1) ze zadání ohledně výběru/uložení jazyka — appka teď nabízí přepínač jazyka viditelně a dostupně z každé části appky, ne jen na landing/login stránce.

## [1.12.0] - i18n: Manuál k životu
### Přidáno
- **Manuál k životu plně přeložen** do češtiny a angličtiny (`app/dashboard/blueprint/page.tsx`, `app/dashboard/blueprint/BlueprintClient.tsx`) — nový namespace `Blueprint` v `messages/cs.json`/`messages/en.json`: hlavička, statistické štítky, banner s kritickými položkami, čtyři kategorie (Předplatné/Dokumenty/Majetek/Instrukce) s popisky a placeholdery pro název i obsah, editační panel, karty položek, prázdný stav, ujišťovací blok.
- `CATEGORIES` (dřív modulová konstanta s natvrdo psaným `label`/`sub`) rozdělena na neutrální `CATEGORY_META` (jen `id`/`color`/`icon`, beze změny) + nový `useCategories()` hook, který popisky dotahuje z překladů — stejný vzor jako u skupinových předvoleb ve Schránce/Strážcích.
- Placeholdery v editačním panelu (název i instrukce) se teď mění podle zvolené kategorie a jazyka místo jedné natvrdo psané řady ternárních výrazů.

### Opraveno po review
- Banner s kritickými položkami (`{count} urgentní {položka vyžaduje/položky vyžadují} okamžitou pozornost`) měl v originále stejnou gramatickou mezeru jako `GuardianListClient.tsx` z PR #27 — binární `count === 1` bez zvláštního tvaru pro 2–4 (`"položky vyžadují"` i pro 5+, správně by mělo být `"položek vyžaduje"`). Protože soubor stejně celý přepisujeme kvůli i18n, opraveno rovnou na plnohodnotný ICU plural (`1 položka vyžaduje` / `2 položky vyžadují` / `5 položek vyžaduje`) místo zakonzervování chyby v překladu — stejné rozhodnutí, jaké padlo pro "1 strážci" v předchozí PR.

### Zbývá (další PR)
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony) + `/guardian/confirmed`.
- Settings stránka + `AppearanceButton.tsx` + přepínač jazyka v Dashboard chrome.

Tímhle je hotový celý původní rozsah "Dashboard/Schránka/Kalendář/Strážci/Manuál k životu" z bodu 2) zadání.

## [1.11.0] - i18n: Strážci
### Přidáno
- **Strážci plně přeloženi** do češtiny a angličtiny (`app/dashboard/guardians/page.tsx`, `components/arca/GuardianListClient.tsx`, `components/dashboard/CheckInButton.tsx`, `components/dashboard/HeartbeatWidget.tsx`) — nový namespace `Guardians` v `messages/cs.json`/`messages/en.json`: hlavička, karta pravidla „Tichý strážce", seznam strážců se skupinami (přidání/úprava/smazání, přiřazení do skupiny), formulář pro pozvání strážce, karta Přítomnost (check-in), Heartbeat webhook, tři kroky jemného kontaktování, ujišťovací blok.
- Relativní časy (naposledy zde, check-in) přes vlastní překladové řetězce místo natvrdo psaných jednotek — `CheckInButton.tsx` teď bere fallback formát data (`cs-CZ`/`en-GB`) podle aktivního jazyka místo napevno `cs-CZ`.
- Počet strážců ve skupině přes ICU plural (`1 strážce` / `2 strážci` / `5 strážců`). Původní kód (`items.length < 5 ? "strážci" : "strážců"`) nikdy nerozlišoval `1` od `2–4`, takže se v originále chybně zobrazovalo "1 strážci" místo "1 strážce" — jelikož jsme soubor stejně celý přepisovali kvůli i18n, opravili jsme rovnou i tenhle drobný gramatický bug (žádná jiná část appky se na přesný text tohohle štítku nespoléhala).
- Rychlé předvolby skupin (Rodina, Přátelé, Kolegové) se ukládají v jazyce aktuálního UI — stejný princip jako v předchozích PR (#24, #25).

### Zjištěno, mimo scope
- `components/dashboard/GuardianManager.tsx` (135 řádků) není nikde v appce importovaný — mrtvý kód, zřejmě nahrazený `GuardianListClient.tsx`. Neupravováno (překládat nepoužívaný soubor by nemělo smysl); ponecháno beze změny pro případ, že bude potřeba ho někdy smazat samostatně.
- `app/guardian/confirmed/page.tsx` (stránka, na kterou kliká **strážce** z e-mailového odkazu, ne majitel účtu) záměrně nepřeložena v tomto PR — jazyk téhle stránky by měl navazovat na jazyk transakčních e-mailů, ne na `arca_locale` cookie přihlášeného uživatele, takže patří spíš do poslední fáze (e-maily), ne do "Strážci" sekce dashboardu.

### Zbývá (další PR)
- Manuál k životu.
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony) + `/guardian/confirmed` (viz výše).
- Settings stránka + `AppearanceButton.tsx` + přepínač jazyka v Dashboard chrome.

## [1.10.0] - i18n: Kalendář
### Přidáno
- **Kalendář plně přeložen** do češtiny a angličtiny (`app/dashboard/calendar/page.tsx`, `components/arca/CalendarClient.tsx`) — nový namespace `Calendar` v `messages/cs.json`/`messages/en.json`: nadpis/podtitul, měsíční mřížka, výběr měsíce/roku, denní modal (existující události, přidání narozeninové/výroční/jednorázové zprávy), postranní panel (souhrn dne/měsíce, nadcházející zprávy).
- Názvy dnů a měsíců (krátké i celé, včetně české genitivní podoby pro data typu „24. září") jsou teď součástí překladových souborů místo natvrdo napsaných polí v komponentě — `t.raw(...)` stejně jako u polí na landing page z PR #22.
- Formát „Dnes · den. měsíc" respektuje slovosled podle jazyka (čeština: den před měsícem s tečkou; angličtina: měsíc před dnem, bez tečky) — vyřešeno tím, že celý vzorec žije v překladovém řetězci, ne jako pevná konkatenace v kódu.
- Počet událostí v měsíci přes ICU plural (`1 událost` / `2 události` / `5 událostí` vs. `1 event` / `5 events`).
- Datum u nadcházejících zpráv v postranním panelu se teď formátuje podle aktivního jazyka (`cs-CZ`/`en-GB`) místo natvrdo `cs-CZ`.

### Zbývá (další PR)
- Strážci, Manuál k životu.
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony).
- Settings stránka + `AppearanceButton.tsx` + přepínač jazyka v Dashboard chrome.

## [1.9.0] - i18n: Schránka (detail příjemce)
### Přidáno
- **Detail příjemce plně přeložen** do češtiny a angličtiny (`app/dashboard/vault/[personId]/page.tsx`, `RecipientTimeline.tsx`, `RecipientProfileEditor.tsx`, `DeliverySimulator.tsx`) — rozšíření `Vault.detail` v `messages/cs.json`/`messages/en.json`: hlavička s počtem zpráv, stavové štítky (Návrh/Naplánováno/Doručeno/Lhůta/Strážci/Archiv), časová osa zpráv s filtrem podle typu obsahu, panel „O příjemci", přehled obsahu, simulátor doručení, návrh od ARCA, editor profilu (vztah, narozeniny, výročí, poznámky), milníky, galerie okamžiků a přidávání vzpomínek.
- Datumy (narozeniny/výročí, datum vzpomínky, datum doručení zprávy) se teď formátují podle aktivního jazyka (`cs-CZ`/`en-GB`).
- Počty zpráv a dnů do milníku přes ICU plural, konzistentně s Dashboardem a Schránkou.
- **Rychlé předvolby vztahu** (máma, táta, partner/partnerka, kamarád/kamarádka…) se teď při výběru ukládají v jazyce aktuálního uživatelského rozhraní — stejný princip jako u předvoleb skupin v přehledu Schránky (PR #24): kliknutí na anglickou předvolbu "mom" uloží "mom", ne "máma". Existující, dříve uložené hodnoty v jiném jazyce než aktuální UI se zobrazí ve volném poli „vlastní popis vztahu" (stejné chování jako předtím pro jakoukoli hodnotu neodpovídající žádné předvolbě) — ověřeno ručně na testovacím účtu.
- Opravena drobná potenciální kolize: `triggerLabel()` a blok se souhrnem typů obsahu ve `vault/[personId]/page.tsx` používaly lokální proměnnou/parametr jménem `t`, což by po zavedení `useTranslations`/`getTranslations` (taky `t`) stínilo překladovou funkci — přejmenováno na `trig`/`item`.

### Zbývá (další PR)
- Kalendář, Strážci, Manuál k životu.
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony).
- Settings stránka + `AppearanceButton.tsx` + přepínač jazyka v Dashboard chrome.

## [1.8.0] - i18n: Schránka (přehled)
### Přidáno
- **Přehled Schránky přeložen** do češtiny a angličtiny (`app/dashboard/vault/page.tsx`, `components/arca/VaultClient.tsx`) — nový namespace `Vault` v `messages/cs.json`/`messages/en.json`: nadpis/podtitul, tip pro psaní, filtr skupin (vytvoření/úprava/smazání skupiny, přiřazení lidí), formulář pro přidání osoby (včetně rozbalovacích sekcí kontaktů/sociálních sítí/adresy/osobních údajů), karta osoby (počet zpráv, aktivní zprávy, doručeno-otevřít odkaz), prázdné stavy.
- Datum nejbližší naplánované zprávy na kartě osoby se teď formátuje podle aktivního jazyka (`cs-CZ`/`en-GB`).
- Pluralizace počtu zpráv přes ICU (`1 zpráva` / `2 zprávy` / `5 zpráv` vs. `1 message` / `2 messages`).
- Barevné názvy skupin (Terra/Sage/Sky/Ink) záměrně ponechány beze změny — jde o vizuální/designové tokeny stejně jako v pricing pills na landing page, ne běžná prosa.

### Vědomě mimo scope (další PR)
- Detail příjemce `app/dashboard/vault/[personId]/page.tsx` a jeho podkomponenty (`RecipientTimeline.tsx`, `RecipientProfileEditor.tsx`, `DeliverySimulator.tsx`) — dohromady ~1360 řádků, výrazně větší než zbytek přehledu Schránky. Necháno na samostatnou PR, aby zůstala menší a snáz reviewovatelná (ověřeno ručně — stránka detailu zůstává plně česky, appka se nerozbije, jen zatím nereaguje na přepnutí jazyka).

### Zbývá (další PR)
- Detail příjemce ve Schránce (viz výše).
- Kalendář, Strážci, Manuál k životu.
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony).
- Settings stránka + `AppearanceButton.tsx` + přepínač jazyka v Dashboard chrome.

## [1.7.0] - i18n: Dashboard
### Přidáno
- **Dashboard plně přeložen** do češtiny a angličtiny (`app/dashboard/page.tsx`, `components/dashboard/ModeFilterSection.tsx`) — dva nové namespaces v `messages/cs.json`/`messages/en.json`: `Dashboard` (uvítání, hero karta, upozornění na připravené/doručené zprávy, grace period, připomínky narozenin/výročí, statistiky, nejbližší okamžiky, karta Tichý strážce, karta Týdenní rituál, naposledy uložené) a `Nav` (postranní menu, spodní mobilní navigace).
- **Sdílená navigace přeložena** — `components/layout/SidebarContent.tsx` a `components/layout/DashboardShell.tsx` (desktopová i mobilní postranní lišta, spodní tab bar, vyhledávání, štítky rolí/plánu).
- Datumy na Dashboardu (dnešní datum v hlavičce, "naposledy zde" u strážce, data u naposledy uložených/nejbližších zpráv) se teď formátují podle aktivního jazyka (`cs-CZ` vs. `en-GB`), ne napevno česky.
- Množná čísla (počet zpráv, dní, lidí, aktivních strážců...) přes ICU `plural` syntaxi — včetně vědomého zachování původních jazykových zvláštností kódu (např. `daysSinceActive === 1 ? "dnem" : "dny"` bylo binární bez "few" tvaru, `{guardians.length} aktivních` se nikdy neskloňovalo) — beze změny byznys logiky, jen věrný přepis do překladového systému.

### Vědomě mimo scope (další PR)
- `components/AppearanceButton.tsx` (výběr vzhledu/tématu) — necháno pro budoucí PR se Settings stránkou, kde přirozeně patří.
- Přepínač jazyka (`LanguageSwitcher`) zatím není nikde v Dashboard chrome — zůstává jen na landing page a login stránce z PR #22. Otestováno ručně nastavením cookie `arca_locale`, appka na ni Dashboard správně reaguje; UI přepínač do Dashboardu přidáme spolu se Settings PR.

### Zbývá (další PR)
- Schránka, Kalendář, Strážci, Manuál k životu.
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál mimo Dashboard).
- Transakční e-maily (Resend šablony).
- Settings stránka + `AppearanceButton.tsx` + přepínač jazyka v Dashboard chrome.

## [1.6.0] - i18n: infrastruktura + landing page a auth flow
### Přidáno
- **i18n infrastruktura (next-intl, "without i18n routing"):** appka teď má jeden systém pro čeština/angličtina místo napevno psaného textu. URL zůstávají beze změny (`/dashboard`, `/login`, ...) — žádný `[locale]` prefix, žádné přesouvání existujících routes. Jazyk se určuje: uložená volba na `User.locale` (přihlášený uživatel, nové nepovinné DB pole) → cookie `arca_locale` → `Accept-Language` hlavička při první návštěvě (nastaví ji `proxy.ts`).
- **Přepínač jazyka** (`components/LanguageSwitcher.tsx`) — zapojený na landing page a login stránce. Zápis přes server action `setLocale`, která nastaví cookie vždy a `User.locale` navíc, pokud je uživatel přihlášený (preference pak jede napříč zařízeními).
- **Landing page** (`app/page.tsx`) a **auth flow** (`app/login/page.tsx`, `LoginForm.tsx`) plně přeloženy do češtiny a angličtiny — `messages/cs.json` a `messages/en.json`, namespaces `Landing` a `Auth`.

### Datový model
- `User.locale` (`String?`, `null` = řiď se cookie/prohlížečem) — migrace `20260923143755_add_user_locale`, aplikována na produkční DB.

### Technická poznámka
- Objevili jsme, že projekt už má `proxy.ts` (Next.js 16 přejmenoval `middleware.ts` → `proxy.ts`) s existující Supabase auth-session logikou — i18n detekce jazyka z `Accept-Language` byla sloučena do něj, ne vytvořena jako konfliktní samostatný `middleware.ts`.
- `cookies()` použité pro čtení locale vynucuje dynamické renderování na stránkách, které dřív mohly být statické (landing page, login) — vědomý kompromis za jednotný mechanismus, jak jsme se domluvili.

### Zbývá (další PR)
- Dashboard, Schránka, Kalendář, Strážci, Manuál k životu.
- Texty z Fází 0–2 (výběr režimu, SELF/LEGACY tón v ArcaReveal, karta roční rituál).
- Transakční e-maily (Resend šablony).

## [1.5.0] - Fáze 2: Roční rituál + "Odpověz svému minulému já"
### Přidáno
- **Odpovědi na doručené SELF zprávy:** nové volitelné pole `MessagePack.replyToMessageId` (self-relace, `onDelete: SetNull`) — odpověď je obyčejná nová zpráva, jen propojená s tou, na kterou reaguje. Žádný nový trigger typ ani samostatná "roční rituál" logika — je to jeden a ten samý mechanismus.
- **Tlačítko "Napsat odpověď"** v `ArcaReveal` u doručených SELF zpráv (LEGACY beze změny). Otevře ComposeWizard rovnou v SELF režimu (přeskočí ModeSelect), s předvyplněným příjemcem podle původní zprávy a triggerem "Relativní doba" na výchozí 1 rok — obojí zůstává editovatelné.
- **Karta "Týdenní rituál" na Dashboardu** teď rozeznává druhý stav: pokud má uživatel doručenou SELF zprávu bez odpovědi, nabídne rovnou "Napsat odpověď" na nejstarší takovou zprávu místo obecné výzvy k psaní — žádná nová komponenta, jen rozšíření té existující.
- **Zobrazení vlákna** na `/arca/[livingLinkHash]`: krátký seznam odkazů na předchozí a navazující zprávu (pokud existují), s daty a odkazy na jejich vlastní stránky.

### Datový model
- Migrace `20260923133250_add_reply_to_message` aplikována na produkční DB — nepovinný sloupec `replyToMessageId` + index + FK s `ON DELETE SET NULL`, beze změny pro existující řádky.

## [1.4.0] - Fáze 1.5: SELF doručovací zážitek
### Přidáno
- **Výchozí příjemce pro "Sobě do budoucna":** volba SELF režimu teď automaticky přidá vlastníka účtu jako příjemce (dřív to vyžadovalo ruční kliknutí na "Přidat sebe jako příjemce"). Zůstává to jen default — chip má svoje "×" a "Pro koho" krok je pořád neomezený, takže lze vědomě zvolit jiného adresáta.
- **Klikatelný "Otevřít" odkaz** vedle "Doručeno" u zprávy, kde je přihlášený uživatel příjemcem: na detailu příjemce (`RecipientTimeline`) i v kartě osoby ve Schránce (`VaultClient`) — vede přímo na existující `/arca/[livingLinkHash]` stránku, žádná nová obrazovka.
- **Notifikační karta na Dashboardu** nad "Grace period alert" pro packy ve stavu `TRIGGERED`, kde je přihlášený uživatel příjemcem — rozlišuje SELF ("Tvůj dopis „…" je připraven k otevření") od LEGACY ("Jedna z tvých zpráv byla doručena" — obecná formulace bez zmínky strážců, protože LEGACY pack může být `TRIGGERED` i přes `SPECIFIC_DATE` bez guardianů).
- **SELF tón na `/arca/[livingLinkHash]`:** hlavička, "Od koho" blok, meta title/description a prázdný stav teď mají podmíněný text podle `messageMode` — SELF zpráva se rámuje jako "dopis od tebe samotného v minulosti", ne obecné LEGACY "From {jméno}".
- **Server-side pojistka:** `createPackFull` teď odmítne uložit ne-konceptovou zprávu s aktivním triggerem, pokud by skončila s nulou příjemců (ověřeno i proti podvrženým/neplatným recipient ID, ne jen proti prázdnému poli) — bez příjemce by ji nikdy nikdo neotevřel.

### Nedořešeno (zapsáno do `AUDIT.md`, vědomě mimo scope)
- Duplicitní implementace `/arca/[hash]` a `/s/[token]` (stejný `livingLinkHash` pod dvěma UI) — SELF/LEGACY tón zapojen jen do `/arca/[hash]`.
- `PackStatus.DELIVERED` zůstává mrtvá větev — cron nikdy nezapisuje nic dál než `TRIGGERED`.
- Anglický text celé doručovací stránky (nekonzistentní se zbytkem česky psané appky).
- Nově objevená nekonzistence: `TriggerCondition.status` u některých starších packů zůstal `PENDING` i po doručení (`MessagePack.status = TRIGGERED`) — nesouvisí s touhle fází, nalezeno náhodou při ověřování na produkční DB.

## [1.3.0] - Fáze 1: Věkové a milníkové triggery
### Přidáno
- **Dva nové spouštěče pro "Sobě do budoucna":** vedle "V daný den" teď krok "Kdy se otevře" nabízí **"Až mu/jí bude X let"** (vypočítá se z data narození příjemce + cílového věku) a **"Za X let / měsíců"** (relativně od dnešního dne). Obojí se při ukládání dopočítá na konkrétní datum a chová se v Kalendáři/Schránce/Nejbližších okamžicích úplně stejně jako "V daný den" — beze změny v jejich dotazech.
- Pokud příjemce zvolený pro "Až mu/jí bude X let" ještě nemá vyplněné datum narození, appka nabídne jeho rychlé doplnění přímo v tomhle kroku (bez opuštění průvodce).
- Náhled doručení vpravo vždy zobrazuje dopočítané konkrétní datum ("12. června 2038"), nikdy vágní "za 10 let".
- `Recipient.birthday` (existující nepovinné pole) se teď může vyplnit i v kroku "Kdy se otevře" — uloží se na nově vytvořeného příjemce dané zprávy spolu se zbytkem konceptu.
- Přepočet po opravě narozenin: pokud úprava narozenin příjemce posune datum věkového milníku zpět do budoucna, appka ho potichu přepočítá. Pokud by úprava poslala datum do minulosti, appka `executeAtDate` NEZMĚNÍ a místo toho zobrazí varovný toast ("...zpráva s věkovým milníkem teď míří do minulosti...") — nikdy se to nestane tiše.
- Validace při vytváření: appka odmítne uložit "Až mu/jí bude X let", pokud by vypočtené datum vyšlo v minulosti hned teď (cílový věk už příjemce překročil) — inline chyba, client-side i server-side.

### Datový model
- Nový enum `TriggerBasis` (`EXACT_DATE` | `AGE_MILESTONE` | `RELATIVE_OFFSET`) na `TriggerCondition.basis` — zaznamenává, jak bylo `executeAtDate` odvozeno, čistě pro zobrazení/přepočet. `TriggerType` zůstává beze změny (`SPECIFIC_DATE`/`INACTIVITY`/`MANUAL_EMERGENCY`), takže cron pipeline i všechny existující dotazy na `executeAtDate` fungují bez úprav.
- Nová pole na `TriggerCondition`: `ageBasisRecipientId` + `targetAge` (pro `AGE_MILESTONE`), `relativeYears` + `relativeMonths` (pro `RELATIVE_OFFSET`) — všechna nepovinná, výchozí `basis = EXACT_DATE` pro všechny existující řádky.
- Migrace `20260923091122_add_trigger_basis` aplikována na produkční DB — všech 11 existujících `TriggerCondition` záznamů zpětně označeno `EXACT_DATE`.

### Opraveno
- Oprava skryté regrese z Fáze 0: `createPackFull` obsahoval "defense in depth" guard, který u `messageMode=SELF` vždy tiše přepsal `trigger` na `"date"` bez ohledu na to, co klient poslal — nový věkový/relativní trigger by se tak nikdy neuložil (zpráva by potichu skončila jako `DRAFT` bez spouštěče). Guard teď povoluje `"date"|"age"|"relative"` a pořád odmítá cokoliv jiného.

## [1.2.0] - Fáze 0: Sobě do budoucna
### Přidáno
- **Dva režimy zpráv:** Nová zpráva teď začíná výběrem mezi **"Sobě do budoucna"** (zpráva sama sobě nebo komukoliv blízkému, doručí se v konkrétní den, bez Strážců) a **"Odkaz pro blízké"** (stávající flow — Tichý strážce, guardians, doručení po nedostupnosti). Volba se ukládá do nového pole `MessagePack.messageMode` (`SELF` | `LEGACY`).
- V režimu "Sobě do budoucna" krok "Kdy se otevře" nabízí jen relevantní možnost ("V daný den") — "Při události" a "Zapečetit" (Guardian-ověřené triggery) se v tomhle režimu vůbec nezobrazují, ani zašedlé.
- Rychlé tlačítko "Přidat sebe jako příjemce" v kroku "Pro koho" pro režim "Sobě do budoucna" — žádné omezení na to, kdo smí být příjemcem (kdokoliv ze seznamu).
- Tón textu (nadpisy, mikrocopy) se v "Sobě do budoucna" liší od "Odkaz pro blízké" — hravější, bez zmínky o "odkazu" nebo "nedostupnosti".

### Změněno
- `createPackFull` teď vrací `packId` a validuje `messageMode` server-side (trigger je u `SELF` vynucený na `SPECIFIC_DATE` bez ohledu na to, co pošle klient).
- Všech 27 existujících zpráv v produkci bylo migrací automaticky zpětně označeno jako `LEGACY` (výchozí hodnota sloupce) — žádný ruční backfill, žádná ztráta dat.

### Opraveno (jako součást přípravy)
- Historie migrací `main` byla dosynchronizovaná se skutečným stavem produkční DB (chybějící migrace pro `Recipient.coverUrl`/`coverPositionY`/`ContactGroup.vibeImageUrl` existovala jen na neslouené branch) — čistě bookkeeping, žádné SQL proti datům.
- Celá "photo-personalization" větev (20 commitů — nahrávání hlasu/videa/fotek, AI asistent, kontrast, paleta pro urgentní stavy) byla poprvé sloučena do `main` a nasazena; do teď existovala jen na preview odkazech.

## [1.1.0] - Photographic Personalization
### Přidáno
- **Fotky příjemců (Avatary):** Nahrazeny gradientové avatary iniciálami za skutečné fotky (s fallbackem na iniciály), nahrávatelné v detailu příjemce.
- **Úvodní fotky (Covery):** Nová možnost nahrát banner přes fialový gradient v detailu schránky příjemce s možností uložit jeho pozici a nastavit "glass" gradientový překryv (scrim overlay).
- **Fotografie u událostí:** Kalendář a Nejbližší okamžiky na Přehledu nyní automaticky vyzvednou a zobrazí náhled (`thumbnail`) z první fotografie, videa nebo dokumentu ve zprávě, případně použijí avatar příjemce.
- **Vlastní Vibes / Pozadí:** Uživatelé si nyní mohou k přednastaveným Vibe themes nahrát také vlastní pozadí (přímo z disku, s uložením do Storage) buď globálně pro celou aplikaci, nebo specificky per kontakt.

### Změněno
- Schránka (grid karet i levý boční panel) nyní podporuje obrázkové avatary a promíchaný stav s fallback iniciálami.
- Optimalizace backendu (`app/actions/recipients.ts`, `app/actions/settings.ts`, `app/actions/groups.ts`) s logikou pro generování podepsaných URL, odstraňování starých a bezpečné ukládání nových médií do specifických privátních Supabase bucketů pro splnění bezpečnostních požadavků (Strážci a cizí návštěvníci k originálům fotek neautorizovaně nepřistoupí).
