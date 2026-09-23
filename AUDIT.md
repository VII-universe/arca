# AUDIT — otevřené technické otázky

Poznámky k věcem, které jsme při práci objevili, ale vědomě neřešili — ne bugy k okamžité opravě, spíš dluh/otázky pro některou z příštích fází.

## Duplicitní implementace doručovací stránky (od Fáze 1.5)

`app/arca/[livingLinkHash]/page.tsx` a `app/(sanctuary)/s/[token]/page.tsx` jsou dvě nezávislé implementace téhož zobrazení doručené zprávy. `token` v `/s/[token]` je ve skutečnosti tentýž `MessagePack.livingLinkHash` — `getSanctuaryContent` (`app/actions/sanctuary.ts`) ho vyhledává přesně stejně jako `/arca/[hash]`. Není to oddělený flow (např. "guardian-confirmed" vs. "osobní odkaz"), jak by názvy mohly naznačovat, jen dvě různá UI nad stejnými daty.

V rámci Fáze 1.5 jsme SELF/LEGACY tón i "Otevřít" odkazy zapojili jen do `/arca/[hash]` (podle zadání) — `/s/[token]` zůstává beze změny a bude mít starý, mode-agnostic anglický text. Než na `/s/[token]` cíleně odkážeme odjinud v appce, stojí za zvážení buď sjednotit na jednu implementaci, nebo aspoň replikovat stejné SELF/LEGACY větvení tam.

## `PackStatus.DELIVERED` — mrtvá větev (od Fáze 1.5)

Enum `PackStatus` má hodnotu `DELIVERED`, ale nikde v kódu se na ni nezapisuje — cron (`app/api/cron/process-triggers/route.ts`) přepíná jen do `TRIGGERED`, dál už nikam. `VaultSealed.tsx` i `RecipientTimeline`/`ArcaEditorNew`/nová "ready to open" karta na Dashboardu mají pro `DELIVERED` připravený label/text, ale ten se reálně nikdy nezobrazí.

Fáze 1.5 do tohohle vědomě nezasahuje — všechny nové "Otevřít" odkazy/karty reagují na `TRIGGERED` (a mimochodem i na `DELIVERED`, kdyby k němu jednou došlo). Otevřená otázka pro později: má appka přechod `TRIGGERED → DELIVERED` vůbec potřebovat (např. při prvním otevření odkazu), nebo je `TRIGGERED` jako finální stav dostatečné?

## Anglický text v `/arca/[livingLinkHash]` (od Fáze 1.5)

Celá stránka `ArcaReveal.tsx` (a `/s/[token]`) je psaná anglicky, zatímco zbytek appky je česky. Fáze 1.5 přidala SELF/LEGACY větvení textu, ale zachovala angličtinu — lokalizace celé doručovací stránky do češtiny je mimo scope týhle fáze a nebyla řešena.

## `TriggerCondition.status` zůstává `PENDING` i po doručení — cron nekonzistence (od Fáze 1.5)

Při ověřování Fáze 1.5 na produkční DB jsme narazili na existující packy (`calvin hariss — Text`, `narozky`), kde `MessagePack.status` je `TRIGGERED` (u `narozky` dokonce jen `DRAFT`), ale příslušný `TriggerCondition.status` zůstal `PENDING` — nikdy se nepřepnul na `EXECUTED`. Cron sweep A (`app/api/cron/process-triggers/route.ts`) hledá kandidáty přes `TriggerCondition.status = PENDING AND executeAtDate <= now`, takže tyhle řádky by teoreticky mohly být "found" znovu při každém běhu cronu, i když pack samotný už dávno `TRIGGERED` je (sweep je ale správně chrání přes `MessagePack.status = ACTIVE` v tom samém where — takže reálně re-triggered nejsou, jen zůstávají v nekonzistentním datovém stavu).

Nesouvisí s prací Fáze 1.5 — nalezeno náhodou při ručním testu cron endpointu, vědomě neřešeno teď. Otevřená otázka pro později: proč se `TriggerCondition.status` u těchto řádků nikdy nezapsal jako `EXECUTED` (chyba v nějaké starší verzi cron logiky? Ruční zásah do DB?), a jestli má appka tyhle osiřelé `PENDING` triggery nějak dodatečně vyčistit/opravit.
