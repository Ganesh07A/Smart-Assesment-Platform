/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `inputFormat` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `maxMarks` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `outputFormat` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `problemDescription` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `questionType` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `sampleInput` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `sampleOutput` on the `Question` table. All the data in the column will be lost.
  - The `options` column on the `Question` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `text` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Made the column `marks` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_examId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "createdAt",
DROP COLUMN "inputFormat",
DROP COLUMN "maxMarks",
DROP COLUMN "outputFormat",
DROP COLUMN "problemDescription",
DROP COLUMN "questionType",
DROP COLUMN "sampleInput",
DROP COLUMN "sampleOutput",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MCQ',
ALTER COLUMN "text" SET NOT NULL,
ALTER COLUMN "marks" SET NOT NULL,
ALTER COLUMN "marks" SET DEFAULT 1,
DROP COLUMN "options",
ADD COLUMN     "options" TEXT[];

-- DropEnum
DROP TYPE "QuestionType";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
