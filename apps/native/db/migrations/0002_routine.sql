CREATE TABLE `routine` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`warmups` integer DEFAULT 0 NOT NULL,
	`sets` integer,
	`rep_min` integer,
	`rep_max` integer,
	`rir_min` integer,
	`rir_max` integer,
	`rest_seconds` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "routine_exercise_warmups" CHECK("routine_exercise"."warmups" >= 0),
	CONSTRAINT "routine_exercise_sets" CHECK("routine_exercise"."sets" > 0),
	CONSTRAINT "routine_exercise_reps" CHECK(("routine_exercise"."rep_min" is null) = ("routine_exercise"."rep_max" is null)),
	CONSTRAINT "routine_exercise_rep_range" CHECK(0 < "routine_exercise"."rep_min" and "routine_exercise"."rep_min" <= "routine_exercise"."rep_max"),
	CONSTRAINT "routine_exercise_rir" CHECK(("routine_exercise"."rir_min" is null) = ("routine_exercise"."rir_max" is null)),
	CONSTRAINT "routine_exercise_rir_range" CHECK(0 <= "routine_exercise"."rir_min" and "routine_exercise"."rir_min" <= "routine_exercise"."rir_max"),
	CONSTRAINT "routine_exercise_rest_seconds" CHECK("routine_exercise"."rest_seconds" > 0)
);
--> statement-breakpoint
CREATE INDEX `routine_exercise_routine_id` ON `routine_exercise` (`routine_id`);--> statement-breakpoint
CREATE INDEX `routine_exercise_exercise_id` ON `routine_exercise` (`exercise_id`);