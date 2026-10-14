ALTER TABLE `workout` ADD `routine_id` text REFERENCES routine(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `workout` ADD `routine_name` text;--> statement-breakpoint
CREATE INDEX `workout_routine_id_started_at` ON `workout` (`routine_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `sets` integer;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `rep_min` integer;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `rep_max` integer;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `rir_min` integer;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `rir_max` integer;--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `rest_seconds` integer;