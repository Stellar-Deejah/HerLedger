-- CreateTable
CREATE TABLE "data_migrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_migrations_name_key" ON "data_migrations"("name");
