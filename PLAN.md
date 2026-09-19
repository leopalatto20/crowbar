Decisions

- Mobile-only v1: iOS and Android.
- Keep a single Expo app, not a monorepo yet.
- Use expo-sqlite with stable Drizzle ORM.
- Install React Hook Form, Zod, and @hookform/resolvers immediately.
- Support `en` and `es` from the foundation using existing i18next, plus react-i18next and expo-localization; fall back to `en` while using the full device locale for regional formatting.
- Treat a performed set as the atomic training record.
- Use generated Gluestack components styled with NativeWind as the single shared UI approach, adding components incrementally as features require them.
- Add Victory Native and Expo-compatible Skia after reporting queries exist.
- Keep Zustand limited to drafts, timers, and transient UI state.
- Add explicit backup/restore before wider distribution.

Implementation Order

1. [x] Define training vocabulary, supported locales, fallback locale, and one UI approach.
2. [x] Consolidate application source under `src/` and establish its responsibility seams.
   - Create `src/domain`, `src/data`, `src/features`, and `src/i18n`, each with a concise README describing what belongs there and its allowed dependencies.
   - Keep `src/app` limited to Expo Router routes, layouts, providers, navigation, and feature composition.
   - Move generated and shared UI from the root `components` directory to `src/components/ui`.
   - Organize stateful workflows under `src/features/<feature>`; start each feature directory flat and add technical subdirectories only when needed for navigation.
   - Make `@/*` resolve exclusively from `src/*` in TypeScript and Babel, and update source-path tooling such as lint-staged.
   - Keep Expo configuration, static assets, documentation, tooling scripts, and generated environment declarations at the repository root.
   - Verify the new source root with lint, TypeScript checking, tests, and iOS and Android production exports.
3. Add SQLite, Drizzle schema, generated migrations, repositories, WAL, and foreign keys.
4. Build one vertical workout flow using React Hook Form and localized Zod validation.
5. Add reporting queries, then validate Victory Native on iOS and Android.
6. Add versioned export and transactional restore using Expo FileSystem, Sharing, and Document Picker.
