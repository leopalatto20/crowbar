CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`effort_scale` text DEFAULT 'RIR' NOT NULL,
	`default_weight_unit` text NOT NULL,
	`rest_timer_enabled` integer DEFAULT true NOT NULL,
	`default_rest_seconds` integer DEFAULT 120 NOT NULL,
	`last_exported_at` integer,
	`undo_restore_path` text,
	`undo_restore_replaced_at` integer,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1),
	CONSTRAINT "settings_effort_scale" CHECK("settings"."effort_scale" in ('RIR', 'RPE')),
	CONSTRAINT "settings_default_weight_unit" CHECK("settings"."default_weight_unit" in ('kg', 'lb', 'level')),
	CONSTRAINT "settings_default_rest_seconds" CHECK("settings"."default_rest_seconds" > 0)
);
