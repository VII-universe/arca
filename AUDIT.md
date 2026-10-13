# AUDIT — otevřené technické otázky

Poznámky k věcem, které jsme při práci objevili, ale vědomě neřešili — ne bugy k okamžité opravě, spíš dluh/otázky pro některou z příštích fází.

## ~~Duplicitní implementace doručovací stránky~~ — vyřešeno

Vyřešeno v rámci i18n práce 2026-10-13 (viz CHANGELOG [1.23.0]). Ukázalo se, že `/arca/[hash]` a `/(sanctuary)/s/[token]` nejsou duplicita — `/s/[token]` je owner-facing "Simulovat doručení" test nástroj (`components/arca/DeliverySimulator.tsx`), ne druhá cesta pro stejný recipient flow. `/(sanctuary)/s/[token]` dorovnána na stejnou kvalitu jako `/arca/[hash]` (SELF/LEGACY tón, angličtina).

## ~~Anglický text v `/arca/[livingLinkHash]`~~ — vědomé rozhodnutí, ne bug

`ArcaReveal.tsx` i `/s/[token]` zůstávají vědomě anglicky — recipient-facing stránky, příjemce může být kdokoliv, next-intl se sem záměrně nezapojuje (viz CHANGELOG [1.4.0], potvrzeno znovu při [1.23.0]). Zbytek appky (dashboard) je plně dvojjazyčný od i18n práce dokončené 2026-10-13.

## ~~`PackStatus.DELIVERED` — mrtvá větev~~ — implementováno

Vyřešeno 2026-10-13 (viz CHANGELOG). `/arca/[livingLinkHash]/page.tsx` teď zapisuje `DELIVERED` při prvním skutečném zobrazení obsahu (po challenge gate, jen jednou — idempotentní). `VaultSealed.tsx`/`SanctuarySealed` (`/s/[token]`) traktují `TRIGGERED`+`DELIVERED` jako stejný "odemčený" stav, stejně jako `app/actions/journal.ts` a `app/actions/sanctuary.ts` — všechna tři místa, co dřív kontrolovala přesně `=== "TRIGGERED"`, teď přijímají oboje.

## `TriggerCondition.status` zůstává `PENDING` i po doručení — datový úklid, kód už opraven

Při ověřování na produkční DB (dávno, Fáze 1.5) jsme narazili na existující packy, kde `MessagePack.status` je `TRIGGERED`, ale příslušný `TriggerCondition.status` zůstal `PENDING` — nikdy se nepřepnul na `EXECUTED`.

**Aktuální kód (`app/api/cron/process-triggers/route.ts`) je v pořádku** — všechny 4 sweepy zapisují `MessagePack.status` i `TriggerCondition.status` atomicky ve stejné `$transaction`, takže tahle nekonzistence novými běhy cronu už vzniknout nemůže. Zaseknuté řádky jsou pozůstatek nějaké starší verze cron logiky (před touhle atomickou dvojicí zápisů), ne aktivní bug.

**Zbývá: jednorázový úklid dat na produkci.** `scripts/fix-stuck-trigger-conditions.sql` — SELECT pro náhled + UPDATE pro opravu, spustit ručně přes Supabase SQL editor (lokální `DATABASE_URL` je od incidentu s `vercel env pull` nefunkční, takže to nejde spustit z tohohle prostředí). Bezpečné spustit víckrát (po první opravě SELECT už nic nenajde).
