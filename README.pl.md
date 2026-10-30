# cv-snap

[English](README.md)

cv-snap to rozszerzenie Chrome, które jednym kliknięciem dopasowuje Twoje CV do ogłoszenia o pracę
otwartego w bieżącej karcie. Korzysta z **Twojego własnego Claude Code** na Twoim komputerze: nie ma
serwera cv-snap ani konta. Każda linia dopasowanego CV jest sprawdzana z profilem zatwierdzonym
przez Ciebie, więc nic nie jest zmyślone.

## Czego potrzebujesz

- **Google Chrome** (stabilny), na Windows 10/11, macOS 13+ lub Linuksie (np. Ubuntu 22.04+)
- **Node.js 24 lub nowszy** ([nodejs.org](https://nodejs.org)); uruchamia mały program pomocniczy,
  który łączy Chrome z Claude Code
- **Claude Code**, zainstalowany i zalogowany ([claude.com/claude-code](https://claude.com/claude-code)).
  Uruchom raz `claude` w terminalu i zaloguj się. cv-snap korzysta z Twojego planu Claude; nie
  kosztuje nic dodatkowo.

## Instalacja

1. **Dodaj rozszerzenie** z Chrome Web Store: _link pojawi się z pierwszym wydaniem_.
2. **Zainstaluj program pomocniczy** („native host”) w terminalu:

   ```sh
   npx cv-snap-host install
   ```

   Instaluje się tylko dla Twojego użytkownika (bez uprawnień administratora) i wskazuje Chrome,
   gdzie go znaleźć. Potem przeładuj rozszerzenie albo uruchom ponownie Chrome.

3. **Sprawdź konfigurację** w dowolnym momencie:

   ```sh
   npx cv-snap-host doctor
   ```

## Pierwsze uruchomienie

1. Kliknij ikonę cv-snap na pasku narzędzi, aby otworzyć panel boczny.
2. Przeczytaj informację o prywatności (skrót poniżej) i przejdź dalej.
3. Sprawdzenie konfiguracji potwierdza, że program pomocniczy i Claude Code są gotowe.
4. Wgraj CV jako PDF (z tekstem do zaznaczenia, do 10 MB). Claude tworzy z niego profil; przejrzyj
   go i zatwierdź. Tylko ten profil jest używany do dopasowania.
5. Otwórz ogłoszenie. Na stronie używanej po raz pierwszy kliknij **Dodaj tę stronę**; Chrome
   poprosi o zgodę dla tej jednej strony.
6. Kliknij **Generuj CV**. Sprawdź podgląd, w razie potrzeby popraw linie i kliknij **Pobierz PDF**.

Model, język i klauzula RODO są w **Ustawieniach**, razem z kopią zapasową i przywracaniem profilu.

## Prywatność

- Podczas generowania CV Twój profil i ogłoszenie są wysyłane do Anthropic **przez Twój własny
  Claude Code**, na warunkach Twojego konta Claude.
- cv-snap nie ma serwera, telemetrii ani analityki. Nic nie trafia do cv-snap ani nikogo innego.
- Twoje CV, profil i ustawienia zostają w tym profilu Chrome na tym komputerze. Logi programu
  pomocniczego nigdy nie zawierają treści CV ani ogłoszeń.

Przeczytaj pełną [politykę prywatności](https://pawelswitalski.github.io/cv-snap/privacy/pl).

## Odinstalowanie

1. Usuń rozszerzenie w `chrome://extensions`. To kasuje wszystko, co zapisało w Chrome.
2. Usuń program pomocniczy:

   ```sh
   npx cv-snap-host uninstall          # zostawia logi programu pomocniczego
   npx cv-snap-host uninstall --purge  # usuwa też logi
   ```

## Rozwiązywanie problemów

Zacznij od `npx cv-snap-host doctor`. Sprawdza każdy krok od Chrome do Claude Code i podaje
rozwiązanie każdego problemu.

| Panel boczny pokazuje                                  | Co zrobić                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host cv-snap nie jest zainstalowany.                   | Uruchom `npx cv-snap-host install`, potem kliknij **Sprawdź ponownie**.                                                                                                         |
| Utracono połączenie z hostem.                          | Kliknij **Połącz ponownie**. Jeśli to się powtarza, uruchom `npx cv-snap-host doctor`. Node zmienił miejsce lub wersję (nvm, fnm)? Uruchom ponownie `npx cv-snap-host install`. |
| Nie znaleziono Claude Code na tym komputerze.          | Zainstaluj Claude Code, potem kliknij **Sprawdź ponownie**.                                                                                                                     |
| Claude Code nie jest zalogowany.                       | Uruchom `claude` w terminalu i zaloguj się, potem kliknij **Sprawdź ponownie**.                                                                                                 |
| Twój Claude Code jest starszy niż testowana wersja.    | Uruchom `claude update` (w międzyczasie możesz kontynuować).                                                                                                                    |
| Wersja hosta cv-snap nie pasuje do tego rozszerzenia.  | Uruchom `npx cv-snap-host install`, aby zaktualizować program pomocniczy.                                                                                                       |
| Wybrany model nie jest dostępny w Twoim planie Claude. | Wybierz inny model w **Ustawieniach**.                                                                                                                                          |
| Ten PDF nie zawiera tekstu do zaznaczenia.             | Skanowane PDF-y nie są obsługiwane; wyeksportuj CV jako PDF z tekstem.                                                                                                          |

`install` mówi, że host działa? Zamknij panel boczny cv-snap (albo Chrome) i uruchom ponownie.

## Licencja

[MIT](LICENSE). Pytania lub problemy: [GitHub Issues](https://github.com/PawelSwitalski/cv-snap/issues).

Instrukcje dla programistów są w [README.md](README.md#development) (po angielsku).
