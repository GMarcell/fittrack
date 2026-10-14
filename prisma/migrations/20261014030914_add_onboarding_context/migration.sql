-- AlterTable
ALTER TABLE "User" ADD COLUMN     "equipment" TEXT DEFAULT 'bodyweight',
ADD COLUMN     "experienceLevel" TEXT DEFAULT 'intermediate',
ADD COLUMN     "fitnessGoal" TEXT DEFAULT 'general_fitness',
ADD COLUMN     "injuries" TEXT;
