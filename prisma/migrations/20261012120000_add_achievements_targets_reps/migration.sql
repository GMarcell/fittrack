-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "estimatedOneRep" DOUBLE PRECISION,
ADD COLUMN     "reps" INTEGER;

-- AlterTable
ALTER TABLE "PersonalBest" ADD COLUMN     "targetDate" TIMESTAMP(3),
ADD COLUMN     "targetValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personalBestId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Achievement_userId_date_idx" ON "Achievement"("userId", "date");

-- CreateIndex
CREATE INDEX "Achievement_personalBestId_date_idx" ON "Achievement"("personalBestId", "date");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_personalBestId_fkey" FOREIGN KEY ("personalBestId") REFERENCES "PersonalBest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

