CREATE TABLE `fitness_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`performedAt` timestamp NOT NULL,
	`localDate` varchar(10) NOT NULL,
	`kcal` int NOT NULL,
	`xp` int NOT NULL,
	`coins` int NOT NULL,
	`actions` text NOT NULL,
	CONSTRAINT `fitness_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fitness_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyGoal` int NOT NULL DEFAULT 10,
	`kcalPerCycle` int NOT NULL DEFAULT 30,
	`difficulty` enum('easy','standard','hard') NOT NULL DEFAULT 'standard',
	`actions` text NOT NULL,
	`soundEnabled` boolean NOT NULL DEFAULT true,
	`reminderEnabled` boolean NOT NULL DEFAULT false,
	`reminderTime` varchar(5) NOT NULL DEFAULT '20:00',
	`totalCount` int NOT NULL DEFAULT 0,
	`xp` int NOT NULL DEFAULT 0,
	`coins` int NOT NULL DEFAULT 0,
	`streak` int NOT NULL DEFAULT 0,
	`currentChapter` int NOT NULL DEFAULT 1,
	`unlockedAchievements` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fitness_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `fitness_profiles_user_id_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `fitness_cycles_user_date_idx` ON `fitness_cycles` (`userId`,`localDate`);--> statement-breakpoint
CREATE INDEX `fitness_cycles_user_performed_idx` ON `fitness_cycles` (`userId`,`performedAt`);