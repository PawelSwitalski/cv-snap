# UX Guide

## Overview

UI/UX standards and design system choices.

cv-snap lives in a Chrome side panel next to the job ad, built with accessible shadcn/ui components and Tailwind CSS, and available in English and Polish.

## UI Surface

- **Primary UI: Chrome side panel** (`sidePanel` API). It stays open next to the job ad, so the user can compare the ad, the requirements, and the CV preview side by side.
- **Toolbar icon** opens the side panel. On allowed sites, it shows a **badge** when a job ad is detected.
- Main views: first-run onboarding (privacy notice, host install check, CV upload) → profile review/editor → generate (requirements, preview with *unverified* markers, gaps list, download) → settings (allowed sites, export/import, language).

## Design System / Component Library

**shadcn/ui** (Radix UI primitives), with components copied into `extension/src/components/ui/`.

Radix gives accessible behavior (focus management, ARIA, keyboard) by default. Prefer composing existing shadcn components over writing custom interactive widgets.

## Styling Approach

**Tailwind CSS** utility classes; design tokens via shadcn CSS variables.

- No CSS-in-JS and no separate stylesheets except the Tailwind entry and token definitions.
- **Theme:** follows the system light/dark preference (`prefers-color-scheme`).
- CV **output** templates are styled separately in `@react-pdf/renderer` and are not affected by the UI theme.

## Accessibility Standards

**WCAG 2.1 AA.**

- Every action is usable with the keyboard only; visible focus indicators.
- Text and interactive elements meet AA contrast in both themes.
- Generation progress is announced through an `aria-live="polite"` region; errors through `role="alert"`.
- *Unverified* lines and gaps are distinguished by **text/icon as well as color**.
- Form inputs in the profile editor have associated labels.

## Responsive Design Strategy

- Fluid layout for the side panel width range (~**320–600 px**); single-column by default.
- No mobile or tablet target (Chrome desktop extension only).

## Internationalization

- **UI languages:** English and Polish from the start, via `chrome.i18n` (`_locales/en`, `_locales/pl`). No hard-coded user-facing strings.
- **CV output language:** defaults to the **job ad's detected language**; the user can override it per generation.
- Translating the CV is rephrasing, not inventing: the validator must compare **language-independent facts** (numbers, dates, company names, proper nouns, skill identifiers from the profile) rather than exact wording.
