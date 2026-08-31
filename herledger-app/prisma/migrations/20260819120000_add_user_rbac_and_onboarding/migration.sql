-- Add application roles and an explicit onboarding state.
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "users"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Existing owners have already completed the business-registration step.
UPDATE "users" AS "user"
SET "onboardingCompleted" = true
FROM "business_profiles" AS "profile"
WHERE "profile"."userId" = "user"."id";
