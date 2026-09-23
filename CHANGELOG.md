# Changelog

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
