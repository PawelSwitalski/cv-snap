# Chrome Web Store listing: cv-snap

Texts to paste into the Chrome Web Store developer dashboard. Checked by
`extension/src/build/store-listing.test.ts`:

- each short description equals the manifest's `extDescription` and is ≤ 132 characters;
- the permission table lists exactly the manifest's permissions.

- **Category**: Productivity (the closest one the dashboard offers)
- **Languages**: English (default), Polish
- **Homepage**: https://github.com/PawelSwitalski/cv-snap
- **Support**: https://github.com/PawelSwitalski/cv-snap/issues
- **Privacy policy**: https://pawelswitalski.github.io/cv-snap/privacy/

## English

### Name

cv-snap

### Short description

Tailor your CV to the job ad in the current tab with one click.

### Full description

cv-snap tailors your CV to the job ad you are looking at, with one click, and checks that nothing
in it is invented.

How it works:

- Upload your CV once. cv-snap turns it into a profile that you review and confirm.
- Open a job ad and click Generate CV. cv-snap reads the requirements, picks and rephrases what
  matches from your profile, and lays out a clean PDF.
- Every line is checked against your confirmed profile before you see it. Anything that can't be
  verified is marked, never silently added.
- Edit any line in the preview, then download the PDF.

Your data stays yours:

- cv-snap uses Claude Code on your own computer, logged in with your own Claude account. There is
  no cv-snap server, no account and no telemetry.
- Your CV, profile and settings are stored only in your Chrome profile.
- cv-snap reads pages only on sites you add, one by one.

Requirements: Chrome on Windows, macOS or Linux; Node.js 24+; Claude Code, logged in. After
installing the extension, run `npx cv-snap-host install` once in a terminal. The extension's setup
check walks you through it.

Polish and English, for the interface and for the generated CV.

## Polski

### Nazwa

cv-snap

### Krótki opis

Dopasuj CV do ogłoszenia w bieżącej karcie jednym kliknięciem.

### Pełny opis

cv-snap jednym kliknięciem dopasowuje Twoje CV do oglądanego ogłoszenia o pracę i sprawdza, że nic w
nim nie jest zmyślone.

Jak to działa:

- Wgraj CV raz. cv-snap zamienia je w profil, który przeglądasz i zatwierdzasz.
- Otwórz ogłoszenie i kliknij Generuj CV. cv-snap odczytuje wymagania, wybiera i przeredagowuje
  to, co pasuje z Twojego profilu, i składa czytelny PDF.
- Każda linia jest sprawdzana z zatwierdzonym profilem, zanim ją zobaczysz. To, czego nie da się
  potwierdzić, jest oznaczone, a nie dodawane po cichu.
- Popraw dowolną linię w podglądzie i pobierz PDF.

Twoje dane zostają Twoje:

- cv-snap korzysta z Claude Code na Twoim komputerze, zalogowanego na Twoje własne konto Claude.
  Nie ma serwera cv-snap, konta ani telemetrii.
- Twoje CV, profil i ustawienia są przechowywane tylko w Twoim profilu Chrome.
- cv-snap czyta strony tylko w serwisach dodanych przez Ciebie, pojedynczo.

Wymagania: Chrome w Windows, macOS lub Linuksie; Node.js 24+; zalogowany Claude Code. Po instalacji
rozszerzenia uruchom raz w terminalu `npx cv-snap-host install`. Sprawdzenie konfiguracji w
rozszerzeniu przeprowadzi Cię przez to.

Interfejs i generowane CV po polsku i po angielsku.

## Single purpose

cv-snap has one purpose: tailoring the user's CV to the job ad open in the current tab and
producing it as a PDF. Every feature (profile from the CV, job-ad reading, tailoring, verification,
preview and download) serves that purpose.

## Permission justifications

| Permission               | Justification                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                | Saves the user's CV profile, settings and the list of allowed sites in the extension's local storage, and keeps the last generated CV in session storage until Chrome closes.              |
| `unlimitedStorage`       | Stores the uploaded CV PDF, the profile and the job-requirements cache locally; together they can exceed the default storage quota.                                                        |
| `nativeMessaging`        | Connects to the cv-snap helper program (`cv-snap-host`) that the user installs, which runs the user's own Claude Code on their computer. This is how a CV is generated without any server. |
| `scripting`              | Registers content scripts only on the sites the user has added, to detect job ads and read the ad text when the user clicks Generate CV.                                                   |
| `sidePanel`              | The whole user interface (onboarding, profile, preview, settings) is a side panel next to the job ad.                                                                                      |
| `activeTab`              | Lets the user add the site of the current tab with one click ("Add this site") and read the ad on it, without broad host permissions.                                                      |
| `https://*/*` (optional) | Requested at runtime for one site at a time, only when the user clicks "Add this site". No site is accessible until the user grants it, and the user can remove it again.                  |

Remote code: **No**, the extension runs no remote code. All code is in the package; the helper
program is a separate, user-installed npm package.

## Data use (Privacy practices tab)

What the extension handles:

- [x] **Personally identifiable information**: name and contact details in the user's CV.
- [x] **Website content**: the text of job ads on sites the user added.
- [ ] Personal communications, health, financial and payment, authentication, location, web
      history, user activity: **not collected**.

Certifications (all three are true):

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
      (Data goes only to Anthropic, through the user's own Claude Code, to generate the CV the user
      asked for.)
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single
      purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

These answers match the [privacy policy](../docs/privacy/index.md), version 1.

## Screenshots

Five screenshots, 1280×800, PNG, English UI (repeat with the Polish UI for the Polish listing):

1. **Job ad with the side panel**: a job ad on an added site, the cv-snap badge on the toolbar
   icon, the side panel showing **Generate CV**.
2. **Profile review**: the profile created from the uploaded CV, ready to confirm.
3. **Preview**: the tailored CV with matched requirements and gaps, one line being edited.
4. **Verification**: the summary showing every line verified against the profile, and an
   unverified line marked.
5. **Setup check and privacy**: the setup check passing (host, Claude Code, login), with the
   privacy notice summary.

Use the synthetic test persona, never a real CV.
