import { ZxcvbnFactory, type Score } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

// ---------------------------------------------------------------------------
// Password strength meter, backed by @zxcvbn-ts/core rather than the
// original zxcvbn package the issue names: same estimation model (Dropbox's
// zxcvbn), rewritten in TypeScript with tree-shakeable dictionaries instead
// of one ~800KB bundled blob. Only the English dictionary is pulled in here
// (this app has no i18n yet); adding a language later means adding its
// package and merging its `dictionary`/`translations` into this factory,
// not touching the call sites in sign-up-form.tsx.
// ---------------------------------------------------------------------------

const zxcvbn = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
});

export const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;

export interface PasswordStrength {
  /** 0 (weakest) to 4 (strongest). */
  score: Score;
  label: (typeof STRENGTH_LABELS)[number];
  /** Populated only when score < 3 -- zxcvbn's own guidance for improving a weak password. */
  suggestions: string[];
}

export function scorePassword(password: string, userInputs: string[] = []): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: STRENGTH_LABELS[0], suggestions: [] };
  }

  const result = zxcvbn.check(password, userInputs);
  return {
    score: result.score,
    label: STRENGTH_LABELS[result.score],
    suggestions: result.feedback.suggestions,
  };
}
