---
title: Polityka prywatności cv-snap
---

# Polityka prywatności cv-snap

**Wersja 1**, obowiązuje od 29 października 2026. [English](./)

cv-snap to rozszerzenie Chrome z małym programem pomocniczym (`cv-snap-host`) na Twoim komputerze.
Dopasowuje Twoje CV do ogłoszenia o pracę za pomocą **Twojego własnego Claude Code**. Ta polityka
obejmuje obie części.

## W skrócie

Te punkty cv-snap pokazuje przed rozpoczęciem (informacja o prywatności w aplikacji, wersja 1):

- Podczas generowania CV Twój profil i ogłoszenie są wysyłane do Anthropic przez Twój Claude Code, na warunkach Twojego konta Claude.
- cv-snap nie ma serwera. Nic nie trafia do cv-snap ani nikogo innego.
- Twoje CV, profil i ustawienia są przechowywane tylko w tym profilu Chrome na tym komputerze.
- Logi nigdy nie zawierają treści CV ani ogłoszeń.

## Co trafia do Anthropic

Aby utworzyć profil i dopasować CV, cv-snap uruchamia na Twoim komputerze **Claude Code**,
zalogowany na Twoje własne konto Claude. Claude Code wysyła do Anthropic:

- **tekst Twojego CV**, jednorazowo, przy tworzeniu z niego profilu;
- Twój **zatwierdzony profil CV** i **tekst ogłoszenia**, za każdym razem, gdy generujesz CV.

Anthropic przetwarza te dane na warunkach **Twojego** konta Claude (np. warunków dla klientów
indywidualnych lub umowy Twojej organizacji), a nie umowy z cv-snap. cv-snap uruchamia Claude Code
z wyłączonym zapisywaniem sesji, więc te uruchomienia nie są zapisywane jako sesje Claude Code na
Twoim komputerze.

## Czego cv-snap nie robi

- cv-snap **nie ma serwera**. Nic nie trafia do autora cv-snap ani do nikogo poza Anthropic, jak
  opisano wyżej.
- **Brak telemetrii, analityki, śledzenia i reklam.** cv-snap nie wykonuje własnych żądań
  sieciowych.
- cv-snap nie sprzedaje ani nie udostępnia Twoich danych i nie używa ich do niczego poza
  dopasowaniem Twojego CV.

## Które strony cv-snap czyta

cv-snap czyta strony tylko w serwisach dodanych przez Ciebie przyciskiem **Dodaj tę stronę**;
Chrome prosi o zgodę dla każdego z nich. Na tych stronach sprawdza, na Twoim komputerze, czy strona
jest ogłoszeniem, i czyta tekst ogłoszenia, gdy klikniesz **Generuj CV**. Serwis możesz usunąć w
ustawieniach rozszerzenia albo w szczegółach rozszerzenia w Chrome.

## Co jest przechowywane i gdzie

W **tym profilu Chrome** (pamięć rozszerzenia, tylko na Twoim komputerze):

- wgrany plik CV, utworzony z niego profil i Twoje ustawienia (język, model, klauzula RODO,
  dozwolone serwisy);
- pamięć podręczna wymagań odczytanych z ogłoszeń, aby to samo ogłoszenie nie było analizowane
  dwa razy;
- ostatnio wygenerowane CV, tylko w pamięci sesji: znika po zamknięciu Chrome.

Na **Twoim komputerze**, przez program pomocniczy:

- sam zainstalowany program i logi jego działania. Logi nigdy nie zawierają treści CV ani
  ogłoszeń;
- krótkotrwałe pliki robocze uruchomienia Claude Code, usuwane po jego zakończeniu.

Lokalizacje: `%LOCALAPPDATA%\cv-snap` w Windows, `~/Library/Application Support/cv-snap` w macOS,
`~/.local/share/cv-snap` w Linuksie.

## Jak usunąć swoje dane

1. Usuń rozszerzenie w `chrome://extensions`. Chrome kasuje wszystko, co rozszerzenie zapisało.
2. Uruchom `npx cv-snap-host uninstall --purge`, aby usunąć program pomocniczy razem z logami.

To, co przechowuje Anthropic, zależy od Twojego konta Claude; zobacz politykę prywatności
Anthropic i ustawienia Claude.

## Zmiany

Gdy ta polityka zmieni się w sposób, który Cię dotyczy, jej numer wersji rośnie razem z
informacją o prywatności w aplikacji, a cv-snap pokaże tę informację ponownie, zanim przejdziesz
dalej.

## Kontakt

Pytania lub uwagi: zgłoś je na
[github.com/PawelSwitalski/cv-snap/issues](https://github.com/PawelSwitalski/cv-snap/issues).
