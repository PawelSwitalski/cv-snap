/**
 * Fixed development identity of the extension. The public key goes into the manifest `key` of dev
 * and production builds, so the unpacked extension always gets the same ID. The private key was not
 * kept: it is only needed to pack a .crx. Store (release) builds leave the key out and get the ID
 * the Chrome Web Store assigns (bolt 013).
 */
export const EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuSdAxPOaO9T1Ru6USjmuvIVUoDzN24CdiV8qwaq34q5NPFJFhINf3JZRpsq30ScPKxzW/xoD2kx2KJ42roQDGpqrjOohpOPCyE8mEn+zP1kJ6jfJ8Euyzch/RJHKTk2f6SPTSHwGxQg+xCCmXUMsUU60+MHFwY4NS9lR9gdHyJPBxIxzgdeAS30TJWR9I1pkFkVSrV3JyBMFaxR1I9LqOPM//FxyRtc+cePxDODdYfYOzRYh4+fhfzPH0iTAE9TxjgehZEPqhFrxAYB3OYELdSmEj1HSHkKng9ueqJqCZd776O5CKhQYU87j2hVX5/Hc5/x40sgXSF/pSotVFlg4DwIDAQAB";

/** Derived from `EXTENSION_PUBLIC_KEY` (SHA-256 of the DER key, first 32 hex digits mapped to a–p). */
export const DEV_EXTENSION_ID = "mmchmbhcfcoeopinlclfbgaekeocdmnf";

/**
 * ID the Chrome Web Store assigned to cv-snap. Empty until the store item is created (Operations);
 * then set here once. `release:pack` refuses to pack the host while it is empty.
 */
export const STORE_EXTENSION_ID: string = "";

/** Chrome extension IDs are 32 letters a–p. */
export const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

export const originOf = (extensionId: string) => `chrome-extension://${extensionId}/`;

export function isStoreIdSet(storeId: string = STORE_EXTENSION_ID): boolean {
  return storeId !== "";
}

/**
 * Origins allowed to talk to the native host (`allowed_origins` in the host manifest): the dev
 * build, and the store build once its ID is known. Nothing else.
 */
export function allowedExtensionOrigins(storeId: string = STORE_EXTENSION_ID): string[] {
  return isStoreIdSet(storeId)
    ? [originOf(DEV_EXTENSION_ID), originOf(storeId)]
    : [originOf(DEV_EXTENSION_ID)];
}
