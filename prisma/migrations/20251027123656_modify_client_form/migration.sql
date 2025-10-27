/*
  Warnings:

  - You are about to drop the column `age_gender` on the `client_forms` table. All the data in the column will be lost.
  - You are about to alter the column `loan_amount` on the `client_forms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `monthly_income` on the `client_forms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `rent` on the `client_forms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `client_forms` DROP COLUMN `age_gender`,
    ADD COLUMN `age` INTEGER NULL DEFAULT 0,
    ADD COLUMN `gender` ENUM('male', 'female') NOT NULL DEFAULT 'male',
    MODIFY `loan_amount` INTEGER NULL DEFAULT 0,
    MODIFY `monthly_income` INTEGER NULL DEFAULT 0,
    MODIFY `rent` INTEGER NULL DEFAULT 0;
