/*
  Warnings:

  - The `options` column on the `Question` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'CODE');

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_examId_fkey";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inputFormat" TEXT,
ADD COLUMN     "maxMarks" INTEGER,
ADD COLUMN     "outputFormat" TEXT,
ADD COLUMN     "problemDescription" TEXT,
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'MCQ',
ADD COLUMN     "sampleInput" TEXT,
ADD COLUMN     "sampleOutput" TEXT,
ADD COLUMN     "testCases" JSONB,
ALTER COLUMN "text" DROP NOT NULL,
ALTER COLUMN "correctOption" DROP NOT NULL,
ALTER COLUMN "marks" DROP NOT NULL,
ALTER COLUMN "marks" DROP DEFAULT,
DROP COLUMN "options",
ADD COLUMN     "options" JSONB;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
