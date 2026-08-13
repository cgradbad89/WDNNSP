import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest.config.ts does not enable `test.globals`, so testing-library's
// built-in auto-cleanup (which detects a global `afterEach`) never registers.
// Unmount rendered components after every test explicitly instead, or DOM
// from one component test leaks into the next.
afterEach(() => {
  cleanup();
});
