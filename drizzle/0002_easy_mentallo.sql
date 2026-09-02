ALTER TABLE `fitness_profiles` ADD `kcalBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `kcalSpent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `equipment` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `activeDate` varchar(10) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `currentWeekKey` varchar(10) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `lastSettledWeek` varchar(10);--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `weeklyChestCount` int DEFAULT 0 NOT NULL;