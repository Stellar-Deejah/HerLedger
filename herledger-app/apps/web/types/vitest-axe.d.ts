import "vitest";

// vitest-axe's own published types don't reliably merge into vitest's
// `Assertion` interface on every version, which is what produced:
//   error TS2339: Property 'toHaveNoViolations' does not exist on type 'Assertion<AxeResults>'
// Declaring it ourselves is a small amount of duplication but doesn't
// depend on that package's type-export details staying stable.
interface AxeMatchers {
  toHaveNoViolations(): void;
}

declare module "vitest" {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
