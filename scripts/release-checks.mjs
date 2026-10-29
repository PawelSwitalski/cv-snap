// Checks that must pass before a release is packed (story 006-release-pack-and-version-check).
// Pure, so every reason is unit-tested; release-pack.mjs feeds it the real values.

export const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;
export const REPOSITORY_PLACEHOLDER = "OWNER";

/**
 * @param {{ extensionVersion: string, hostVersion: string, storeExtensionId: string,
 *   repositoryUrl: string | undefined }} input
 * @returns {string[]} every reason the release can't be packed (empty: ready)
 */
export function releaseProblems({
  extensionVersion,
  hostVersion,
  storeExtensionId,
  repositoryUrl,
}) {
  const problems = [];
  if (extensionVersion !== hostVersion) {
    problems.push(
      `Versions differ: extension ${extensionVersion}, host ${hostVersion}. Set both package.json versions (and native-host/src/version.ts) to the release version.`,
    );
  }
  if (storeExtensionId === "") {
    problems.push(
      "The Chrome Web Store ID isn't set. Upload the extension once to create the store item, then set STORE_EXTENSION_ID in shared/src/extension-identity.ts.",
    );
  } else if (!EXTENSION_ID_PATTERN.test(storeExtensionId)) {
    problems.push(`The Chrome Web Store ID "${storeExtensionId}" isn't a valid extension ID.`);
  }
  if (!repositoryUrl || repositoryUrl.includes(REPOSITORY_PLACEHOLDER)) {
    problems.push(
      "native-host/package.json has no real repository URL yet (still the OWNER placeholder).",
    );
  }
  return problems;
}
