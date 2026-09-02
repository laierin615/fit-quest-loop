ALTER TABLE `fitness_cycles` ADD `localId` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `fitness_cycles` ADD CONSTRAINT `fitness_cycles_user_local_id_unique` UNIQUE(`userId`,`localId`);