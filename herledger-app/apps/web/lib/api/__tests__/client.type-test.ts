import { expectTypeOf, test } from "vitest";

import type { ActivityRecentData } from "@/app/api/activity/recent/schema";
import type { AttestationsData } from "@/app/api/attestations/schema";
import type { BusinessRegisterData } from "@/app/api/business/register/schema";
import type { HealthData } from "@/app/api/health/schema";
import type { ActivitySummaryData } from "@/app/api/v1/activity/summary/schema";
import { apiClient } from "@/lib/api/client";

// These assert that apiClient's method return types exactly match the Zod
// inferred success-data types from each route's schema.ts. If a route's
// schema changes and the client isn't updated to match, these fail
// `vitest typecheck` — independent of, and in addition to, the ordinary
// `tsc --noEmit` build catching it via the explicit Promise<...> annotations
// on each apiClient method.

test("apiClient.activity.recent matches ActivityRecentData", () => {
  expectTypeOf(apiClient.activity.recent).returns.resolves.toEqualTypeOf<ActivityRecentData>();
});

test("apiClient.activity.summary matches ActivitySummaryData", () => {
  expectTypeOf(apiClient.activity.summary).returns.resolves.toEqualTypeOf<ActivitySummaryData>();
});

test("apiClient.attestations.list matches AttestationsData", () => {
  expectTypeOf(apiClient.attestations.list).returns.resolves.toEqualTypeOf<AttestationsData>();
});

test("apiClient.business.register matches BusinessRegisterData", () => {
  expectTypeOf(apiClient.business.register).returns.resolves.toEqualTypeOf<BusinessRegisterData>();
});

test("apiClient.health.check matches HealthData", () => {
  expectTypeOf(apiClient.health.check).returns.resolves.toEqualTypeOf<HealthData>();
});
