export interface MutableFlag {
  current: boolean;
}

/**
 * Runs `fn` only if `flag.current` is false, setting it synchronously
 * before `fn` starts. Pair with `useRef(false)` in a form's submit handler:
 * `setState`-based loading flags are async and batched, so two submits in
 * the same tick (e.g. a double Enter-press before React re-renders and
 * disables the submit button) can both read `loading === false` and both
 * fire the request. A ref is mutated synchronously, so the second call
 * sees the guard already closed and is skipped — returning `null` instead
 * of a result.
 *
 * `flag.current` is always reset in a `finally`, including when `fn`
 * throws, so a failed submission doesn't permanently lock the form.
 */
export async function runExclusive<T>(flag: MutableFlag, fn: () => Promise<T>): Promise<T | null> {
  if (flag.current) return null;
  flag.current = true;
  try {
    return await fn();
  } finally {
    flag.current = false;
  }
}
