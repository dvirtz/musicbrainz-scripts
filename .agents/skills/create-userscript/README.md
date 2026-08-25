# Create Userscript Skill

GitHub Copilot skill for creating new MusicBrainz userscripts from `scripts/_template`.

## What It Does

- Collects script metadata (`id`, `display`, `desc`, `match`, optional `ui`).
- Runs the existing TypeScript CLI tool at `scripts/create-script.mts` via `yarn create-script`.
- Scaffolds a ready-to-edit script package under `scripts/<id>/`.

## Command

```bash
yarn create-script --id=<id> --display="<display>" --desc="<description>" --match="<pattern1>,<pattern2>" --ui=<true|false>
```

## Required Inputs

- `id`: kebab-case and unique (for example `my-script`).
- `display`: human-readable name.
- `desc`: short description.
- `match`: one or more comma-separated userscript match patterns.

## Optional Inputs

- `ui=true`: adds Solid/Kobalte UI dependencies.
- `version`, `runAt`, `baseUrl`.

## Generated Structure

```text
scripts/<id>/
├── src/index.ts
├── tests/basic.spec.ts
├── assets/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── README.md
└── CHANGELOG.md
```

## Next Steps

```bash
yarn workspace @dvirtz/<id> build
yarn workspace @dvirtz/<id> lint
yarn workspace @dvirtz/<id> test
```

## Notes

- For implementation patterns, inspect:
  - `scripts/acum-work-import/`
  - `scripts/setlistfm-musicbrainz-import/`
  - `scripts/single-language-tracklist/`
