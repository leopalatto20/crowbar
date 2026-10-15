CREATE TABLE `rest` (
	`id` integer PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "rest_single_row" CHECK("rest"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX `rest_set_id` ON `rest` (`set_id`);