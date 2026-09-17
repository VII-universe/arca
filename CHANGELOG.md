# Changelog

## [1.1.0] - Photographic Personalization
### Přidáno
- **Fotky příjemců (Avatary):** Nahrazeny gradientové avatary iniciálami za skutečné fotky (s fallbackem na iniciály), nahrávatelné v detailu příjemce.
- **Úvodní fotky (Covery):** Nová možnost nahrát banner přes fialový gradient v detailu schránky příjemce s možností uložit jeho pozici a nastavit "glass" gradientový překryv (scrim overlay).
- **Fotografie u událostí:** Kalendář a Nejbližší okamžiky na Přehledu nyní automaticky vyzvednou a zobrazí náhled (`thumbnail`) z první fotografie, videa nebo dokumentu ve zprávě, případně použijí avatar příjemce.
- **Vlastní Vibes / Pozadí:** Uživatelé si nyní mohou k přednastaveným Vibe themes nahrát také vlastní pozadí (přímo z disku, s uložením do Storage) buď globálně pro celou aplikaci, nebo specificky per kontakt.

### Změněno
- Schránka (grid karet i levý boční panel) nyní podporuje obrázkové avatary a promíchaný stav s fallback iniciálami.
- Optimalizace backendu (`app/actions/recipients.ts`, `app/actions/settings.ts`, `app/actions/groups.ts`) s logikou pro generování podepsaných URL, odstraňování starých a bezpečné ukládání nových médií do specifických privátních Supabase bucketů pro splnění bezpečnostních požadavků (Strážci a cizí návštěvníci k originálům fotek neautorizovaně nepřistoupí).
