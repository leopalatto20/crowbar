CREATE TABLE `workout_edit` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`routine_exercise_id` text,
	`exercise_id` text,
	`workout_exercise_id` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`routine_exercise_id`) REFERENCES `routine_exercise`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercise`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workout_edit_kind" CHECK("workout_edit"."kind" in ('swap', 'add', 'remove', 'move')),
	CONSTRAINT "workout_edit_swap" CHECK(("workout_edit"."kind" = 'swap') = ("workout_edit"."exercise_id" is not null)),
	CONSTRAINT "workout_edit_add" CHECK(("workout_edit"."kind" = 'add') = ("workout_edit"."workout_exercise_id" is not null))
);
--> statement-breakpoint
CREATE INDEX `workout_edit_workout_id` ON `workout_edit` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_edit_routine_exercise_id` ON `workout_edit` (`routine_exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_edit_exercise_id` ON `workout_edit` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_edit_workout_exercise_id` ON `workout_edit` (`workout_exercise_id`);--> statement-breakpoint
ALTER TABLE `workout_exercise` ADD `routine_exercise_id` text REFERENCES routine_exercise(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `workout_exercise_routine_exercise_id` ON `workout_exercise` (`routine_exercise_id`);