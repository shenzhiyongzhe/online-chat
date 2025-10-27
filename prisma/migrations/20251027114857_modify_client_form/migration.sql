/*
  Warnings:

  - You are about to drop the column `description` on the `client_forms` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `client_forms` DROP COLUMN `description`,
    ADD COLUMN `end_of_id` VARCHAR(191) NULL;
