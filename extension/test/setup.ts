import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when Vitest globals are on (they aren't): unmount after each
// test so rendered panels don't leak into the next one.
afterEach(() => {
  cleanup();
});
