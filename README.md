# crowbar

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React Native, Expo, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Husky** - Git hooks for code quality

## Getting Started

First, install the dependencies:

```bash
bun install
```

Then, run the development server:

```bash
bun run dev
```

Use the Expo Go app to run the mobile application.

## Installing on an iPhone

To install a standalone Release build (no Metro needed) on a connected iPhone with a free Apple ID:

```bash
cd apps/native && APPLE_PERSONAL_TEAM=1 bunx expo run:ios --device --configuration Release
```

- On first install, trust the developer certificate in **Settings > General > VPN & Device Management**.
- Free Apple ID builds expire after 7 days. Run the same command to reinstall; data is kept unless the app is deleted.
- `APPLE_PERSONAL_TEAM=1` drops the Time Sensitive Notifications entitlement, which personal teams can't sign. Omit it with a paid developer account.

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Run checks: `bun run check`

## Project Structure

```
crowbar/
├── apps/
│   ├── native/      # Mobile application (React Native, Expo)
```

## Available Scripts

- `bun run dev`: Start the Expo development server
- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run check`: Run Oxlint and Oxfmt
