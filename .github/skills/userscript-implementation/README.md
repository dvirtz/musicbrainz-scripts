# Userscript Implementation Skill

Guidance for implementing MusicBrainz userscripts with consistent structure, tests, and reuse across the monorepo.

## What It Enforces

- Test driven development.
- Minimal `index.ts` files with UI in `.tsx` modules.
- Single responsibility, modular design.
- Reuse of shared components and libraries.
- Extraction of shared logic to common libraries when applicable.
- Mount UI using the toolbox module to keep a common appearance.
- Mimic the website UI when adding new UI elements.
- Lint-clean code.

## When To Apply

Use this skill for any new userscript feature work or refactors of existing userscripts.

## Related Libraries

- `@repo/common`
- `@repo/common-ui`
- `@repo/fetch`
- `@repo/musicbrainz-ext`
- `@repo/rxjs-ext`
