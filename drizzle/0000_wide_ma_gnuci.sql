CREATE TABLE `gyms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_home` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`primary_muscle_group_id` integer NOT NULL,
	`default_equipment_class` text NOT NULL,
	`unit` text DEFAULT 'kg' NOT NULL,
	`instructions` text,
	`archived` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`primary_muscle_group_id`) REFERENCES `muscle_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `muscle_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`volume_min` integer DEFAULT 4 NOT NULL,
	`volume_max` integer DEFAULT 8 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `muscle_groups_name_unique` ON `muscle_groups` (`name`);--> statement-breakpoint
CREATE TABLE `routine_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`position` integer NOT NULL,
	`movement_id` integer NOT NULL,
	`working_set_count` integer,
	`rep_min` integer,
	`rep_max` integer,
	`proximity_value` real,
	`proximity_scale` text,
	`tempo` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movement_id`) REFERENCES `movements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_entries_routine_idx` ON `routine_entries` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`position` integer NOT NULL,
	`movement_id` integer NOT NULL,
	`equipment_class` text NOT NULL,
	`skipped` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movement_id`) REFERENCES `movements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_entries_session_idx` ON `session_entries` (`session_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gym_id` integer NOT NULL,
	`sub_routine_id` integer,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_routine_id`) REFERENCES `sub_routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_gym_idx` ON `sessions` (`gym_id`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_entry_id` integer NOT NULL,
	`load_lb` real NOT NULL,
	`reps` integer NOT NULL,
	`proximity_value` real,
	`proximity_scale` text,
	`equipment_class` text NOT NULL,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`session_entry_id`) REFERENCES `session_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sets_session_entry_idx` ON `sets` (`session_entry_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sub_routine_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sub_routine_id` integer NOT NULL,
	`position` integer NOT NULL,
	`movement_id` integer NOT NULL,
	`equipment_class` text NOT NULL,
	FOREIGN KEY (`sub_routine_id`) REFERENCES `sub_routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movement_id`) REFERENCES `movements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sub_routine_entries_subroutine_idx` ON `sub_routine_entries` (`sub_routine_id`);--> statement-breakpoint
CREATE TABLE `sub_routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`gym_id` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sub_routines_routine_gym_uk` ON `sub_routines` (`routine_id`,`gym_id`);--> statement-breakpoint
INSERT INTO `muscle_groups` (`name`, `volume_min`, `volume_max`) VALUES
	('Chest', 4, 8),
	('Back', 4, 8),
	('Shoulders', 4, 8),
	('Biceps', 4, 8),
	('Triceps', 4, 8),
	('Forearms', 4, 8),
	('Core', 4, 8),
	('Obliques', 4, 8),
	('Traps', 4, 8),
	('Quads', 4, 8),
	('Hamstrings', 4, 8),
	('Glutes', 4, 8),
	('Calves', 4, 8);
--> statement-breakpoint
INSERT INTO `gyms` (`name`, `is_home`, `archived`) VALUES ('Home', 1, 0);
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`) VALUES
	('recording_scale', 'rpe'),
	('default_unit', 'kg');
