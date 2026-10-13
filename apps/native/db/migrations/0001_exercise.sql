CREATE TABLE `exercise` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_es` text,
	`equipment_type` text DEFAULT 'other' NOT NULL,
	`load_type` text DEFAULT 'external' NOT NULL,
	`unilateral` integer DEFAULT false NOT NULL,
	`muscle_group` text,
	`built_in` integer DEFAULT false NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	CONSTRAINT "exercise_equipment_type" CHECK("exercise"."equipment_type" in ('barbell', 'dumbbell', 'machine', 'cable', 'smithMachine', 'ezBar', 'trapBar', 'kettlebell', 'band', 'bodyweight', 'other')),
	CONSTRAINT "exercise_load_type" CHECK("exercise"."load_type" in ('external', 'bodyweight', 'assisted')),
	CONSTRAINT "exercise_muscle_group" CHECK("exercise"."muscle_group" in ('chest', 'lats', 'upperBack', 'lowerBack', 'frontDelts', 'sideDelts', 'rearDelts', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves', 'other'))
);
