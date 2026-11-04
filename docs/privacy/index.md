---
title: cv-snap privacy policy
---

# cv-snap privacy policy

**Version 2**, effective 3 November 2026; text updated 4 November 2026. [Polski](pl)

cv-snap is a Chrome extension with a small helper program (`cv-snap-host`) on your computer. It
tailors your CV to a job ad using **your own Claude Code**. This policy covers both parts.

## Summary

These are the points cv-snap shows before you start (the in-app privacy notice, version 2):

- When you generate a CV, your CV profile and the job ad are sent to Anthropic through your own Claude Code, under your Claude account terms.
- cv-snap has no server. Nothing is sent to cv-snap or anyone else.
- Your CV, profile and settings are stored only in this Chrome profile on this computer.
- The CVs you download or save, a copy of each job-ad page and the dates you sent them are kept only in this Chrome profile, for as long as you choose in Settings. You can delete them in History or Settings.
- Logs never contain your CV or job-ad text.

## What goes to Anthropic

To create your profile and to tailor a CV, cv-snap starts **Claude Code** on your computer, logged
in with your own Claude account. Claude Code sends to Anthropic:

- the **text of your CV**, once, when the profile is created from it;
- your **reviewed CV profile** and the **text of the job ad**, each time you generate a CV.

Anthropic processes this under the terms of **your** Claude account (for example the Consumer
Terms or your organisation's agreement), not under an agreement with cv-snap. cv-snap starts Claude
Code with session persistence off, so these runs are not saved as Claude Code sessions on your
computer.

## What cv-snap doesn't do

- cv-snap has **no server**. Nothing is sent to the cv-snap author or to anyone except Anthropic,
  as described above.
- **No telemetry, no analytics, no tracking, no ads.** cv-snap makes no network requests of its
  own.
- cv-snap doesn't sell or share your data, and doesn't use it for anything other than tailoring
  your CV.

## Which pages cv-snap reads

cv-snap reads web pages only on sites you add with **Add this site**; Chrome asks for your
permission for each one. On those sites it checks, on your computer, whether the page is a job ad,
and reads the ad text when you click **Generate CV** or **Save my CV to history**. You can remove a
site in the extension settings or in Chrome's extension details.

## Using cv-snap without the helper

If you choose **Use without the helper**, cv-snap only keeps a history of your applications with
your own CV. It doesn't use the helper program or Claude Code, so **nothing is sent to Anthropic**
or anywhere else: your CV file, the job ads and your history stay in this Chrome profile. CV
tailoring is off until you set up the helper.

## What is stored, and where

In **this Chrome profile** (extension storage, on your computer only):

- your uploaded CV file, the profile created from it, and your settings (language, model, GDPR
  clause, allowed sites);
- a cache of job requirements read from ads, so the same ad isn't analysed twice;
- the last generated CV, in session storage only: it is gone when Chrome closes;
- your **history**: each CV you download, or your own CV when you choose **Save my CV to
  history** (the PDF file), the text of its job ad, a copy of the job-ad page as it was when you
  generated or saved the CV (with its scripts removed; images and styles
  still load from the job board when you open it), and the date you marked it as sent. It is
  kept for as long as you choose in Settings (forever, or 1 to 24 months after the last
  download) and is never sent anywhere.

A **backup file** you export in Settings contains your profile and, if you choose, your photo and
your history. Without a profile (when you use cv-snap without the helper), it contains your history
only. It is saved where you choose and is never sent anywhere by cv-snap.

On **your computer**, by the helper program:

- the installed helper itself, and logs of what it did. Logs never contain your CV or job-ad text;
- short-lived working files for a Claude Code run, removed when the run ends.

Locations: `%LOCALAPPDATA%\cv-snap` on Windows, `~/Library/Application Support/cv-snap` on macOS,
`~/.local/share/cv-snap` on Linux.

## How to delete your data

- Delete single CVs in **History**, or everything with **Delete all history** in Settings.
  Settings also lets the history delete old CVs automatically.

1. Remove the extension in `chrome://extensions`. Chrome deletes everything the extension stored.
2. Run `npx cv-snap-host uninstall --purge` to remove the helper together with its logs.

What Anthropic keeps is governed by your Claude account; see Anthropic's privacy policy and your
Claude settings.

## Changes

When this policy changes in a way that affects you, its version number goes up together with the
in-app privacy notice, and cv-snap shows the notice again before you continue.

## Contact

Questions or concerns: open an issue at
[github.com/PawelSwitalski/cv-snap/issues](https://github.com/PawelSwitalski/cv-snap/issues).
