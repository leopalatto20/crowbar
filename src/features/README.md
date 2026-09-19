# Features

Stateful user workflows belong in one directory per feature. A feature owns its screens, forms, feature-specific UI, hooks, and transient stores.

Start each feature directory flat. Add internal `components`, `hooks`, or `stores` directories only when the number of files makes the flat layout difficult to navigate.

Features may depend on domain rules, repositories, localization, and shared UI. Keep reusable business rules in `src/domain` and shared presentational UI in `src/components/ui` rather than exposing another feature's internals.
