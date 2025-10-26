-- CreateTable
CREATE TABLE `quick_templates` (
    `id` VARCHAR(191) NOT NULL,
    `agent_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT '',
    `content` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quick_templates` ADD CONSTRAINT `quick_templates_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`agent_id`) ON DELETE CASCADE ON UPDATE CASCADE;
