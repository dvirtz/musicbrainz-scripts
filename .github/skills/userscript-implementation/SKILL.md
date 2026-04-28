---
name: userscript-implementation
description: Guidance for implementing MusicBrainz userscripts with consistent structure, testing, and reuse across the monorepo.
license: MIT
---

# Userscript Implementation Rules

Apply this skill when implementing or modifying userscripts in this repository.

## Core Rules

- Use test driven development.
- Keep `index.ts` minimal. Put UI code in separate `.tsx` files.
- Use CSS modules for script-specific styling (`*.module.css`) instead of inline styles.
- Write modular code following the single responsibility principle.
- Reuse common components from repo libraries or third party packages when possible.
- When implementing new functionality, check if another project already includes similar logic. If so, extract the functionality to an appropriate common library.
- Mount UI using the toolbox module to keep a common appearance.
- Mimic the website UI when adding new UI elements.
- When running Playwright tests, use a non-HTML reporter so no browser report window opens (for example, `--reporter=line`).
- Ensure code passes linting by running `yarn lint` from the repo root.
- Prefer HAR-backed Playwright tests in CI over live website dependencies once test flows are stable.
- Record and refresh HAR files with `UPDATE_HAR=1` and commit them under `tests/fixtures/har/`.
- HAR recordings must include all live domains used by a spec (for example, `www.setlist.fm` and `nocs.acum.org.il`).

## Suggested Workflow

1. Find similar behavior in existing scripts.
2. Write tests that capture the desired behavior.
3. Implement minimal `index.ts` orchestration.
4. Place UI components in dedicated `.tsx` files and use `*.module.css` for component styling.
5. Refactor shared logic into `lib/` packages when appropriate.
6. Run tests with a non-HTML reporter (for example, `yarn workspace @dvirtz/<script-name> test --reporter=line`).
7. Refresh HARs when test data changes (for example, `UPDATE_HAR=1 yarn workspace @dvirtz/<script-name> test --reporter=line`).
8. Run `yarn lint` from the repo root and fix any issues.
