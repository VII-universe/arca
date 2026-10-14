# Changelog

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
