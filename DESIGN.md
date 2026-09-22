# DESIGN.md - Personalizace pomocí fotek (Glassmorphism & Avatars)

Tento dokument slouží jako návrh UI pro implementaci personalizace pomocí fotografií, než dojde k samotné úpravě kódu.

## 1) FOTKY PŘÍJEMCŮ (Avatar & Cover)

**Detail příjemce (`/dashboard/vault/[personId]`)**
- Původní fialový gradientový banner bude nahrazen `coverUrl` (pokud je nahrána). Přes fotografii bude zachován tmavý (nebo gradientový) *scrim overlay* (glass vrstva směrem dolů), aby texty (jméno, e-mail) a horní navigace zůstaly čitelné.
- Avatar, který doposud ukazoval iniciály, bude mít `img` tag (object-fit: cover, zaoblený), s možností uploadu po kliknutí (ikona foťáčku v pravém dolním rohu avataru). Pokud avatar není k dispozici, zůstane fallback na gradientový kruh s iniciálami.
- Vpravo nahoře v banneru nebo přímo na něm přidáme malé nenápadné tlačítko pro "Změnit úvodní fotku".

**Schránka (Vault Grid) a Sidebar**
- Karty příjemců v gridu (ve Schránce) a malé náhledy v bočním menu (Sidebar) zobrazí nahraný avatar. Změna se dotkne i výběru adresáta při tvorbě nové zprávy (New Message).
- Gradient/iniciály se použijí pouze jako fallback pro lidi bez nahrané fotky. Různé stavy se mohou volně míchat.

## 2) FOTKY U UDÁLOSTÍ / OKAMŽIKŮ (Kalendář a Přehled)

**Dashboard (Přehled) - "Nejbližší okamžiky"**
- V současnosti má událost velké číslo data a název. Vedle názvu se přidá malý thumbnail (zaoblený roh, např. 32x32 nebo 40x40), ideálně pod "glass" kartičkou nebo jako inline avatar fotka.
- Thumbnail bude automaticky brán z prvního média ve zprávě (případně fotka příjemce).

**Kalendář**
- Podobný thumbnail se ukáže v sidebaru kalendáře (Upcoming list) a v detailu dne.

## 3) OBECNÉ BANNERY / POZADÍ NA MÍRU (Vibes)

**Vlastní pozadí aplikace (Themes/Vibes)**
- V sekci "Appearance" (Dropdown) u "Custom image URL" přibude tlačítko / ikona pro nahrání souboru z disku přes Storage. Po nahrání se vygeneruje URL, které se nastaví do inputu a aktivuje.
- Přidáme podporu pro "per-skupina" vibe pozadí. Když uživatel otevře `/dashboard/vault?group=ID`, appka zkontroluje, zda má skupina nastaveno specifické pozadí a změní globální Vibe Background.

Prosím o zpětnou vazbu k tomuto návrhu, jestli s ním takto souhlasíš nebo jestli mám něco upravit.
