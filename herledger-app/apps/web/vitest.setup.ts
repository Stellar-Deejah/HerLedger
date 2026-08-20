import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/matchers";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";

// Adds `toHaveNoViolations()` for the axe-core accessibility tests
// (apps/web/components/business/__tests__/business-registration-form.a11y.test.tsx).
expect.extend(matchers);

// vitest.config.ts does not set `test.globals: true`, so RTL's own
// auto-cleanup (which detects a global `afterEach`) never fires and every
// test's render() output piles up in the same jsdom `document` for the rest
// of the file — the cause of "Found multiple elements" failures across
// unrelated `it()` blocks. Unmount explicitly after every test instead.
afterEach(() => {
  cleanup();
});
