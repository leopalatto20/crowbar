## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for this repo, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

### Runtime errors

For bundling or on-device errors, read `apps/native/.expo/metro.log`: Metro's output from the latest `bun run dev`, with ANSI colour codes.
