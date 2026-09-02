ALTER TABLE `fitness_profiles` ADD `rareChestCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_profiles` ADD `milestonesClaimed` varchar(2000) DEFAULT '[]' NOT NULL;