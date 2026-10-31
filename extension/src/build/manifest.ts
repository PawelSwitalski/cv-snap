import { EXTENSION_PUBLIC_KEY } from "@cv-snap/shared";
import type { UserManifest } from "wxt";

/** `wxt build --mode release` / `wxt zip --mode release`: the Chrome Web Store package. */
export const RELEASE_MODE = "release";

/** Icon sizes in `public/icon/<size>.png` (rendered from `assets/icon.svg`, bolt 013). */
export const ICON_SIZES = [16, 32, 48, 128] as const;

/** Extension pages may compile WebAssembly from the package's own files (react-pdf's Yoga). */
export const EXTENSION_PAGES_CSP = "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';";

const icons = Object.fromEntries(ICON_SIZES.map((size) => [size, `icon/${String(size)}.png`]));

/**
 * The extension manifest for a build mode (used by `wxt.config.ts`). Development and production
 * builds carry the dev `key`, so the unpacked extension keeps the ID the installed host trusts. The
 * release build leaves it out, so the Chrome Web Store assigns its own ID; nothing else differs.
 * See standards/system-architecture.md → Security Patterns for the permission model.
 */
export function buildManifest(mode: string): UserManifest {
  const manifest: UserManifest = {
    // Strings come from public/_locales (FR-19); English is the fallback language.
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    permissions: [
      "storage",
      "unlimitedStorage",
      "nativeMessaging",
      "scripting",
      "sidePanel",
      "activeTab",
    ],
    // activeTab only reveals the address of the tab where the icon was clicked, for "Add this site"
    // (bolt 011 decision); reading a page still needs a site the user granted.
    // No host permissions by default: sites are granted one by one by the user (FR-6).
    optional_host_permissions: ["https://*/*"],
    icons,
    action: { default_title: "__MSG_extName__", default_icon: icons },
    // The PDF library lays out pages with WebAssembly (Yoga); Chrome's default extension policy,
    // `script-src 'self'`, blocks it. `pnpm dev` hid this: WXT writes its own policy in dev mode
    // (fix bolt 019). Only WebAssembly is allowed here, not eval or remote scripts.
    content_security_policy: { extension_pages: EXTENSION_PAGES_CSP },
  };
  // Fixed dev ID so the native host can allow exactly this extension (story 003-host-install-scripts).
  return mode === RELEASE_MODE ? manifest : { ...manifest, key: EXTENSION_PUBLIC_KEY };
}
