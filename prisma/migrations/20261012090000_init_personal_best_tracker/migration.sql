-- CreateEnum
CREATE TYPE "PersonalBestType" AS ENUM ('EXERCISE', 'BODY_METRIC');

-- CreateEnum
CREATE TYPE "PersonalBestUnit" AS ENUM ('REPS', 'SECONDS', 'MINUTES', 'METERS', 'KM', 'KG', 'LB', 'COUNT', 'CM', 'MM', 'PERCENT');

-- CreateEnum
CREATE TYPE "PersonalBestDirection" AS ENUM ('HIGHER', 'LOWER', 'LATEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalBest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PersonalBestType" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "PersonalBestUnit" NOT NULL,
    "direction" "PersonalBestDirection" NOT NULL,
    "bestValue" DOUBLE PRECISION NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalBest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personalBestId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PersonalBest_userId_type_idx" ON "PersonalBest"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalBest_userId_type_name_key" ON "PersonalBest"("userId", "type", "name");

-- CreateIndex
CREATE INDEX "Attempt_personalBestId_date_idx" ON "Attempt"("personalBestId", "date");

-- CreateIndex
CREATE INDEX "Attempt_userId_date_idx" ON "Attempt"("userId", "date");

-- AddForeignKey
ALTER TABLE "PersonalBest" ADD CONSTRAINT "PersonalBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_personalBestId_fkey" FOREIGN KEY ("personalBestId") REFERENCES "PersonalBest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

