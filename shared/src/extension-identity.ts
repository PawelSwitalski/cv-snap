/**
 * Fixed development identity of the extension. The public key goes into the manifest `key`, so
 * the unpacked extension always gets the same ID and the native host manifest can allow only it.
 * The private key was not kept: it is only needed to pack a .crx (the Chrome Web Store assigns its
 * own key at publication).
 */
export const EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuSdAxPOaO9T1Ru6USjmuvIVUoDzN24CdiV8qwaq34q5NPFJFhINf3JZRpsq30ScPKxzW/xoD2kx2KJ42roQDGpqrjOohpOPCyE8mEn+zP1kJ6jfJ8Euyzch/RJHKTk2f6SPTSHwGxQg+xCCmXUMsUU60+MHFwY4NS9lR9gdHyJPBxIxzgdeAS30TJWR9I1pkFkVSrV3JyBMFaxR1I9LqOPM//FxyRtc+cePxDODdYfYOzRYh4+fhfzPH0iTAE9TxjgehZEPqhFrxAYB3OYELdSmEj1HSHkKng9ueqJqCZd776O5CKhQYU87j2hVX5/Hc5/x40sgXSF/pSotVFlg4DwIDAQAB";

/** Derived from `EXTENSION_PUBLIC_KEY` (SHA-256 of the DER key, first 32 hex digits mapped to a–p). */
export const EXTENSION_ID = "mmchmbhcfcoeopinlclfbgaekeocdmnf";

/** Origin allowed to talk to the native host (`allowed_origins` in the host manifest). */
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}/`;
