import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { App } from "./App";

describe("App", () => {
  it("renders the empty side panel shell", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<App />);
    });

    expect(container.querySelector("h1")?.textContent).toBe("cv-snap");
    act(() => {
      root.unmount();
    });
  });
});
