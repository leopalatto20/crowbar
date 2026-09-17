Decisions

- Mobile-only v1: iOS and Android.
- Keep a single Expo app, not a monorepo yet.
- Use expo-sqlite with stable Drizzle ORM.
- Install React Hook Form, Zod, and @hookform/resolvers immediately.
- Support multiple languages from the foundation using existing i18next, plus react-i18next and expo-localization.
- Add Victory Native and Expo-compatible Skia after reporting queries exist.
- Keep Zustand limited to drafts, timers, and transient UI state.
- Add explicit backup/restore before wider distribution.

Implementation Order
1. Define training vocabulary, supported locales, fallback locale, and one UI approach.
2. Create src/domain, src/data, src/features, and src/i18n boundaries.
3. Add SQLite, Drizzle schema, generated migrations, repositories, WAL, and foreign keys.
4. Build one vertical workout flow using React Hook Form and localized Zod validation.
5. Add reporting queries, then validate Victory Native on iOS and Android.
6. Add versioned export and transactional restore using Expo FileSystem, Sharing, and Document Picker.
