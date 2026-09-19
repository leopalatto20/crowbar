CREATE TABLE `effort_metrics` (
	`code` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gyms` (
	`id` text PRIMARY KEY NOT NULL,
	`trainee_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`trainee_id`) REFERENCES `trainees`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `gyms_by_trainee` ON `gyms` (`trainee_id`,`archived_at`,`name`);--> statement-breakpoint
CREATE TABLE `load_representations` (
	`code` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `machines` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`name` text NOT NULL,
	`load_representation_code` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`load_representation_code`) REFERENCES `load_representations`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `machines_by_gym` ON `machines` (`gym_id`,`archived_at`,`name`);--> statement-breakpoint
CREATE TABLE `movement_prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`movement_id` text NOT NULL,
	`position` integer NOT NULL,
	`instructions` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movement_id`) REFERENCES `movements`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "movement_prescriptions_position_check" CHECK("movement_prescriptions"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movement_prescriptions_routine_id_position_unique` ON `movement_prescriptions` (`routine_id`,`position`);--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`trainee_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`trainee_id`) REFERENCES `trainees`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `movements_by_trainee` ON `movements` (`trainee_id`,`archived_at`,`name`);--> statement-breakpoint
CREATE TABLE `performed_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_movement_prescription_id` text NOT NULL,
	`workout_prescribed_set_id` text,
	`machine_id` text NOT NULL,
	`position` integer NOT NULL,
	`repetitions` integer NOT NULL,
	`load_value` real NOT NULL,
	`effort_value` real,
	`performed_at` integer NOT NULL,
	FOREIGN KEY (`workout_movement_prescription_id`) REFERENCES `workout_movement_prescriptions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`machine_id`) REFERENCES `machines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workout_prescribed_set_id`,`workout_movement_prescription_id`) REFERENCES `workout_prescribed_sets`(`id`,`workout_movement_prescription_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "performed_sets_position_check" CHECK("performed_sets"."position" >= 0),
	CONSTRAINT "performed_sets_repetitions_check" CHECK("performed_sets"."repetitions" >= 0),
	CONSTRAINT "performed_sets_load_value_check" CHECK("performed_sets"."load_value" >= 0)
);
--> statement-breakpoint
CREATE INDEX `performed_sets_by_machine` ON `performed_sets` (`machine_id`,"performed_at" desc);--> statement-breakpoint
CREATE UNIQUE INDEX `performed_sets_workout_movement_prescription_id_position_unique` ON `performed_sets` (`workout_movement_prescription_id`,`position`);--> statement-breakpoint
CREATE TABLE `prescribed_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`movement_prescription_id` text NOT NULL,
	`position` integer NOT NULL,
	`target_repetitions_min` integer,
	`target_repetitions_max` integer,
	`target_effort_metric_code` text,
	`target_effort_min` real,
	`target_effort_max` real,
	FOREIGN KEY (`movement_prescription_id`) REFERENCES `movement_prescriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_effort_metric_code`) REFERENCES `effort_metrics`(`code`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "prescribed_sets_position_check" CHECK("prescribed_sets"."position" >= 0),
	CONSTRAINT "prescribed_sets_target_repetitions_min_check" CHECK("prescribed_sets"."target_repetitions_min" IS NULL OR "prescribed_sets"."target_repetitions_min" >= 0),
	CONSTRAINT "prescribed_sets_target_repetitions_max_check" CHECK("prescribed_sets"."target_repetitions_max" IS NULL OR "prescribed_sets"."target_repetitions_max" >= 0),
	CONSTRAINT "prescribed_sets_target_repetitions_order_check" CHECK("prescribed_sets"."target_repetitions_min" IS NULL OR "prescribed_sets"."target_repetitions_max" IS NULL OR "prescribed_sets"."target_repetitions_max" >= "prescribed_sets"."target_repetitions_min"),
	CONSTRAINT "prescribed_sets_target_effort_presence_check" CHECK((
        ("prescribed_sets"."target_effort_metric_code" IS NULL AND "prescribed_sets"."target_effort_min" IS NULL AND "prescribed_sets"."target_effort_max" IS NULL)
        OR
        ("prescribed_sets"."target_effort_metric_code" IS NOT NULL AND ("prescribed_sets"."target_effort_min" IS NOT NULL OR "prescribed_sets"."target_effort_max" IS NOT NULL))
      )),
	CONSTRAINT "prescribed_sets_target_effort_order_check" CHECK("prescribed_sets"."target_effort_min" IS NULL OR "prescribed_sets"."target_effort_max" IS NULL OR "prescribed_sets"."target_effort_max" >= "prescribed_sets"."target_effort_min")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prescribed_sets_movement_prescription_id_position_unique` ON `prescribed_sets` (`movement_prescription_id`,`position`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`trainee_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`trainee_id`) REFERENCES `trainees`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `routines_by_trainee` ON `routines` (`trainee_id`,`archived_at`,`name`);--> statement-breakpoint
CREATE TABLE `trainees` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`current_effort_metric_code` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`current_effort_metric_code`) REFERENCES `effort_metrics`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `workout_movement_prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`movement_id` text NOT NULL,
	`movement_name_snapshot` text NOT NULL,
	`position` integer NOT NULL,
	`instructions_snapshot` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`movement_id`) REFERENCES `movements`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "workout_movement_prescriptions_position_check" CHECK("workout_movement_prescriptions"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX `workout_prescriptions_by_movement` ON `workout_movement_prescriptions` (`movement_id`,`workout_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_movement_prescriptions_workout_id_position_unique` ON `workout_movement_prescriptions` (`workout_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_movement_prescriptions_id_workout_id_unique` ON `workout_movement_prescriptions` (`id`,`workout_id`);--> statement-breakpoint
CREATE TABLE `workout_prescribed_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_movement_prescription_id` text NOT NULL,
	`position` integer NOT NULL,
	`target_repetitions_min` integer,
	`target_repetitions_max` integer,
	`target_effort_min` real,
	`target_effort_max` real,
	FOREIGN KEY (`workout_movement_prescription_id`) REFERENCES `workout_movement_prescriptions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "workout_prescribed_sets_position_check" CHECK("workout_prescribed_sets"."position" >= 0),
	CONSTRAINT "workout_prescribed_sets_target_repetitions_min_check" CHECK("workout_prescribed_sets"."target_repetitions_min" IS NULL OR "workout_prescribed_sets"."target_repetitions_min" >= 0),
	CONSTRAINT "workout_prescribed_sets_target_repetitions_max_check" CHECK("workout_prescribed_sets"."target_repetitions_max" IS NULL OR "workout_prescribed_sets"."target_repetitions_max" >= 0),
	CONSTRAINT "workout_prescribed_sets_target_repetitions_order_check" CHECK("workout_prescribed_sets"."target_repetitions_min" IS NULL OR "workout_prescribed_sets"."target_repetitions_max" IS NULL OR "workout_prescribed_sets"."target_repetitions_max" >= "workout_prescribed_sets"."target_repetitions_min"),
	CONSTRAINT "workout_prescribed_sets_target_effort_order_check" CHECK("workout_prescribed_sets"."target_effort_min" IS NULL OR "workout_prescribed_sets"."target_effort_max" IS NULL OR "workout_prescribed_sets"."target_effort_max" >= "workout_prescribed_sets"."target_effort_min")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_prescribed_sets_workout_movement_prescription_id_position_unique` ON `workout_prescribed_sets` (`workout_movement_prescription_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_prescribed_sets_id_workout_movement_prescription_id_unique` ON `workout_prescribed_sets` (`id`,`workout_movement_prescription_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`gym_id` text NOT NULL,
	`routine_name_snapshot` text NOT NULL,
	`effort_metric_code` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`effort_metric_code`) REFERENCES `effort_metrics`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `workouts_by_gym` ON `workouts` (`gym_id`,"started_at" desc);--> statement-breakpoint
CREATE INDEX `workouts_by_routine` ON `workouts` (`routine_id`,"started_at" desc);