CREATE TABLE `gym` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `station` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`gym_id` text NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gym_id`) REFERENCES `gym`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "station_unit" CHECK("station"."unit" in ('kg', 'lb', 'level'))
);
--> statement-breakpoint
CREATE INDEX `station_exercise_id_gym_id` ON `station` (`exercise_id`,`gym_id`);--> statement-breakpoint
CREATE INDEX `station_gym_id` ON `station` (`gym_id`);--> statement-breakpoint
CREATE TABLE `workout` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`time_zone` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gym`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_gym_id` ON `workout` (`gym_id`);--> statement-breakpoint
CREATE TABLE `workout_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`station_id` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`station_id`) REFERENCES `station`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_exercise_workout_id` ON `workout_exercise` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercise_exercise_id` ON `workout_exercise` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_exercise_station_id` ON `workout_exercise` (`station_id`);--> statement-breakpoint
CREATE TABLE `set` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text DEFAULT 'working' NOT NULL,
	`load` real,
	`reps` integer,
	`rir` integer,
	`done` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "set_kind" CHECK("set"."kind" in ('warmup', 'working')),
	CONSTRAINT "set_logged" CHECK(not "set"."done" or ("set"."load" is not null and "set"."reps" is not null)),
	CONSTRAINT "set_warmup_effort" CHECK("set"."kind" = 'working' or "set"."rir" is null),
	CONSTRAINT "set_load" CHECK("set"."load" >= 0),
	CONSTRAINT "set_reps" CHECK("set"."reps" >= 0),
	CONSTRAINT "set_rir" CHECK("set"."rir" between 0 and 10)
);
--> statement-breakpoint
CREATE INDEX `set_workout_exercise_id` ON `set` (`workout_exercise_id`);