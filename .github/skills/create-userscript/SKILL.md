---
name: create-userscript
description: Creates a new MusicBrainz userscript from the monorepo template. Use this skill when the user asks to create a new userscript for MusicBrainz or a similar task involving userscript generation.
license: MIT
---

# Creating a New MusicBrainz Userscript

This skill guides you through creating a new userscript from the template in the musicbrainz-scripts monorepo.

## When to Use This Skill

Activate this skill when:

- The user explicitly asks to "create a new userscript"
- The user wants to "add a new script" to the repository
- The user describes building a new MusicBrainz enhancement tool

## Template System Overview

The monorepo uses a token-based template system:

**Template Location:** `scripts/_template/`

**Token Placeholders (replaced during creation):**

- `__ID__` → kebab-case script identifier (e.g., `acum-work-import`)
- `__DISPLAY_NAME__` → User-friendly display name
- `__DESCRIPTION__` → Script description
- `__VERSION__` → Initial version (defaults to 1.0.0)
- `__MATCH_ARRAY__` → Array of URL patterns the script matches
- `__BASE_URL__` → Base URL for tests (defaults to <https://test.musicbrainz.org>)
- `__RUN_AT__` → Tampermonkey run-at timing (defaults to document-end)
- `__ICON_LINE__` → Icon URL line (optional, omitted if not provided)

## Step-by-Step Instructions

## Mandatory Interaction Rule

Do not scaffold immediately from only a script name.

- If any required input is missing, ask follow-up questions first.
- Do not invent defaults for required fields without explicit user confirmation.
- Allowed auto-fill only when explicitly confirmed by the user (for example: “use defaults”).
- Before running `yarn create-script`, echo the final values and ask for a short confirmation.

Required inputs that must be explicitly provided or confirmed:

- `id`
- `display`
- `desc`
- `match`

### 1. Collect Required Information

Ask the user for the following details (if not already provided):

1. **Script ID** (kebab-case, e.g., `my-awesome-script`)
   - Validation: Must be lowercase with hyphens only, no spaces or underscores
   - Used in npm package name: `@dvirtz/{script-id}`
   - Must be unique (not already exist in `scripts/` directory)

2. **Display Name** (friendly name, e.g., "My Awesome Script")
   - Used in package.json and documentation

3. **Description** (what the script does)
   - Used in package.json and README

4. **URL Patterns** (which websites the script should run on)
   - Examples: `*://*.musicbrainz.org/*`, `*://example.com/specific-path/*`
   - Should be provided as an array of patterns
   - Required for Tampermonkey to know when to execute the script

5. **Needs UI** (optional, defaults to false)
   - Ask if unclear; do not silently assume
   - If yes, inform user that `@kobalte/core`, `solid-js`, and `@repo/common-ui` will be added as dependencies

If the user prompt is minimal (for example only `create userscript <name>`), ask this compact checklist before any scaffolding:

1. Display name
2. Description
3. Match pattern(s)
4. Include UI (`true`/`false`)

If the user says “use defaults,” use:

- `display`: title-cased `id`
- `desc`: same as display in sentence case
- `match`: `*://*.musicbrainz.org/*`
- `ui`: `false`

Then still show the final resolved values and request confirmation.

### 2. Validate Inputs

Before proceeding, verify:

- Script ID is in kebab-case (lowercase, hyphens only)
- Script ID doesn't already exist in the `scripts/` directory
- Display name is non-empty
- At least one URL pattern is provided
- URL patterns are in valid Tampermonkey format

### 3. Generate the Script

Only run this step after collecting/confirming all required inputs.

Use Copilot's terminal execution to run the existing TypeScript CLI tool:

```bash
yarn create-script --id=<script-id> --display="<display-name>" --desc="<description>" --match="<pattern1>,<pattern2>" --ui=<true|false>
```

**Example:**

```bash
yarn create-script --id=my-awesome-script --display="My Awesome Script" --desc="Adds cool features to MusicBrainz" --match="*://*.musicbrainz.org/*" --ui=false
```

**Parameters:**

- `--id` (required): kebab-case script identifier
- `--display` (required): Display name (user-friendly)
- `--desc` (required): Script description
- `--match` (required): Comma-separated URL match patterns
  - Single pattern: `"*://*.musicbrainz.org/*"`
  - Multiple patterns: `"*://*.musicbrainz.org/*,*://musicbrainz.org/*"`
- `--ui` (optional): `true` or `false`, defaults to `false` (adds Solid.js + Kobalte UI dependencies)
- `--baseUrl` (optional): Base URL for Playwright tests, defaults to `https://test.musicbrainz.org`
- `--version` (optional): Initial version, defaults to `1.0.0`
- `--runAt` (optional): Tampermonkey run-at timing, defaults to `document-end`

**Important Notes:**

- No spaces around `=` in arguments
- Match patterns are comma-separated strings, not JSON arrays
- The tool is defined in `scripts/create-script.mts`
- Command must be run from the repository root directory
- The tool automatically validates inputs and runs ESLint fixes

### 4. Report Results

After successful creation, provide the user with:

1. **Generated Files Location:** `scripts/{script-id}/`

2. **Directory Structure:**

   ```text
   scripts/{script-id}/
   ├── src/
   │   └── index.ts          ← Main script file (user will customize)
   ├── tests/
   │   └── basic.spec.ts     ← E2E tests using Playwright
   ├── assets/               ← For screenshots/resources
   ├── package.json          ← Workspace package
   ├── tsconfig.json         ← TypeScript config
   ├── vite.config.ts        ← Build configuration
   ├── playwright.config.ts  ← Test configuration
   ├── README.md             ← Documentation
   └── CHANGELOG.md          ← Version history
   ```

3. **Next Steps:**
   - Edit `scripts/{script-id}/src/index.ts` with script logic
   - Update `README.md` with detailed feature documentation
   - Add tests in `scripts/{script-id}/tests/`
   - Run `yarn workspace @dvirtz/{script-id} build` to compile
   - Run `yarn workspace @dvirtz/{script-id} test` to run tests
   - Run `yarn workspace @dvirtz/{script-id} lint` to check code style

4. **Key Shared Libraries Available:**
   - `@repo/common` → Utility functions (array operations, etc.)
   - `@repo/common-ui` → UI components for forms/settings
   - `@repo/fetch` → Fetch wrapper with error handling
   - `@repo/musicbrainz-ext` → MusicBrainz API extensions
   - `@repo/rxjs-ext` → RxJS helper functions

5. **Building and Distribution:**
   - Built output: `scripts/{script-id}/dist/{script-id}.user.js`
   - Install via Tampermonkey: Add the dist file URL to script manager
   - All scripts use Vite for bundling and support hot reload during development

### 5. Error Handling

If the script creation fails:

- Check if script ID already exists
- Validate that all required parameters are provided
- Ensure script ID follows kebab-case format
- Look at the helper script output for specific errors
- Suggest re-running with corrected parameters

## Workspace Context

**Monorepo Structure:**

- Root: `musicbrainz-scripts/`
- Scripts: `scripts/`
- Shared libraries: `lib/`
- Template: `scripts/_template/`

**Build System:**

- Uses Turbo for task orchestration
- Uses Yarn workspaces for monorepo management
- Uses Vite for bundling individual scripts
- Uses Playwright for E2E testing

**Package Naming Convention:**

- Scope: `@dvirtz`
- Package: `@dvirtz/{script-id}`
- Entry point: `src/index.ts`
- Built output: `dist/{script-id}.user.js`

## Reference Examples

Existing scripts to reference:

- `scripts/acum-work-import/` → Complex script with UI components
- `scripts/setlistfm-musicbrainz-import/` → Multi-file script with imports logic
- `scripts/single-language-tracklist/` → Simpler script without UI

Check these for patterns on:

- How to structure multi-file scripts
- How to import and use shared libraries
- How to implement UI components
- Test patterns using Playwright

## Success Criteria

The skill has succeeded when:

1. Script directory created at `scripts/{script-id}/`
2. All template files copied and token-replaced
3. `package.json` reflects correct metadata
4. User can run `yarn workspace @dvirtz/{script-id} build` without errors
5. User can run `yarn workspace @dvirtz/{script-id} lint` without errors
6. User can edit `src/index.ts` and see changes when running build
