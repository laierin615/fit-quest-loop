CREATE TABLE `fitness_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`localId` varchar(80) NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`localDate` varchar(10) NOT NULL,
	`resource` enum('kcal','coins') NOT NULL,
	`kind` enum('cycle','trail','combat','equipment','milestone','study') NOT NULL,
	`amountDelta` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` varchar(160) NOT NULL,
	CONSTRAINT `fitness_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `fitness_transactions_user_local_id_unique` UNIQUE(`userId`,`localId`)
);
--> statement-breakpoint
CREATE INDEX `fitness_transactions_user_date_idx` ON `fitness_transactions` (`userId`,`localDate`);