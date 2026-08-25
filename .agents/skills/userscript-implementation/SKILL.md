---
name: userscript-implementation
description: Guidance for implementing MusicBrainz userscripts with consistent structure, testing, and reuse across the monorepo.
license: MIT
---

# Userscript Implementation Rules

Apply this skill when implementing or modifying userscripts in this repository.

## Core Rules

- For anything test related, follow the [`userscript-testing`](../userscript-testing/SKILL.md) skill.
- Keep `index.ts` minimal. Put UI code in separate `.tsx` files.
- Use CSS modules for script-specific styling (`*.module.css`) instead of inline styles.
- Write modular code following the single responsibility principle.
- Reuse common components from repo libraries or third party packages when possible.
- When implementing new functionality, check if another project already includes similar logic. If so, extract the functionality to an appropriate common library.
- Mount UI using the toolbox module to keep a common appearance.
- Mimic the website UI when adding new UI elements.
- Ensure code passes linting by running `yarn lint` from the repo root.

## Suggested Workflow

1. Find similar behavior in existing scripts.
2. Write tests that capture the desired behavior, following the [`userscript-testing`](../userscript-testing/SKILL.md) skill.
3. Implement minimal `index.ts` orchestration.
4. Place UI components in dedicated `.tsx` files and use `*.module.css` for component styling.
5. Refactor shared logic into `lib/` packages when appropriate.
6. Run `yarn lint` from the repo root and fix any issues.
