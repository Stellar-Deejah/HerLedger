import { describe, it, expect } from "vitest";

import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { routing } from "../routing";

type MessageTree = Record<string, unknown>;

function flattenKeys(obj: MessageTree, prefix = ""): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      entries.push(...flattenKeys(value as MessageTree, fullKey));
    } else {
      entries.push([fullKey, String(value)]);
    }
  }
  return entries;
}

describe("i18n message catalogs", () => {
  it("configures en as the default locale with es as an alternate", () => {
    expect(routing.defaultLocale).toBe("en");
    expect(routing.locales).toContain("en");
    expect(routing.locales).toContain("es");
  });

  it("defines at least 50 translated keys in both en and es", () => {
    expect(flattenKeys(en).length).toBeGreaterThanOrEqual(50);
    expect(flattenKeys(es).length).toBeGreaterThanOrEqual(50);
  });

  it("keeps the en and es catalogs structurally identical", () => {
    const enKeys = flattenKeys(en).map(([k]) => k);
    const esKeys = flattenKeys(es).map(([k]) => k);
    expect(esKeys).toEqual(enKeys);
  });

  it("leaves no empty translation values in either locale", () => {
    for (const [key, value] of flattenKeys(en)) {
      expect(value.trim(), `en.${key}`).not.toBe("");
    }
    for (const [key, value] of flattenKeys(es)) {
      expect(value.trim(), `es.${key}`).not.toBe("");
    }
  });

  it("localizes a representative sample of user-facing strings", () => {
    const enKeys = new Map(flattenKeys(en));
    const esKeys = new Map(flattenKeys(es));

    // en baseline values
    expect(enKeys.get("auth.signIn")).toBe("Sign in");
    expect(enKeys.get("nav.overview")).toBe("Overview");
    expect(enKeys.get("ui.status.Verified")).toBe("Verified");

    // es provides genuinely translated (not identical) values for these
    for (const key of ["auth.signIn", "nav.overview", "ui.status.Verified"]) {
      expect(esKeys.get(key), `es.${key}`).toBeTruthy();
      expect(esKeys.get(key), `es.${key}`).not.toBe(enKeys.get(key));
    }
  });
});
