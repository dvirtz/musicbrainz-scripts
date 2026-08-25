---
name: userscript-documentation
description: Documents a userscript in its README, captures and stores screenshots in assets, updates the main README summary, and removes temporary screenshot code.
license: MIT
---

# Userscript Documentation Workflow

Use this skill when the user asks to add or refresh documentation for a userscript.

## Scope

This skill applies to a specific userscript folder under `scripts/<userscript-id>/`.

## Required Outcomes

- Documentation is written in the userscript README at `scripts/<userscript-id>/README.md`.
- One or two screenshots are captured using temporary Playwright code.
- Screenshot files are saved under `scripts/<userscript-id>/assets/`.
- Temporary Playwright screenshot code is deleted after screenshots are saved.
- If `scripts/<userscript-id>/assets/.keep` exists, remove it.
- Add a short summary to the root README with one screenshot (if applicable) and a link to the userscript README for full details.

## Rules

- Keep edits minimal and focused on documentation and screenshots.
- Do not keep screenshot-generation test code in committed files.
- Do not create extra markdown files; update existing READMEs.
- Keep markdown compliant with `.markdownlint-cli2.jsonc`.
- Prefer relative asset links in markdown.

## Step-by-Step Process

1. Identify the userscript target
1.a. Confirm the target directory: `scripts/<userscript-id>/`.
1.b. Open `scripts/<userscript-id>/README.md` and the root `README.md`.
2. Plan screenshot coverage
2.1. Select one or two high-value states to capture, such as:
2.1.1 script entry point visible on page
2.1.2 resulting seeded/imported/edited form state
2.2. Save paths under `scripts/<userscript-id>/assets/`, for example:
2.2.1 `assets/workflow-entry.png`
2.2.2 `assets/workflow-result.png`
3. Add temporary Playwright screenshot code
3.1. Add minimal temporary code in existing userscript tests under `scripts/<userscript-id>/tests/`.
3.2. Keep screenshot logic narrowly scoped to the relevant test scenario.
3.3. Run the targeted Playwright spec with a non-HTML reporter, for example: `yarn workspace @dvirtz/<userscript-id> test tests/basic.spec.ts --reporter=line`
4. Remove temporary screenshot code
4.1. After screenshot files are produced, remove all temporary screenshot conditionals and calls.
4.2. Re-run the targeted Playwright test to verify no regressions.
5. Clean `assets/.keep`
5.1. If `scripts/<userscript-id>/assets/.keep` exists, delete it.
6. Update userscript README
6.1. Add a concise description of what the userscript does.
6.2. Add one or two screenshots from `assets/` with helpful captions.
6.3. Add short usage steps.
6.4. Keep details script-specific and concrete.
7. Update root README
7.1. Add a short script summary in the appropriate section.
7.2. Add one screenshot if useful.
7.3. Add a link to `scripts/<userscript-id>/README.md` for full documentation.

## Validation Checklist

- `scripts/<userscript-id>/README.md` updated.
- Root `README.md` updated with short summary and link.
- Screenshot files exist in `scripts/<userscript-id>/assets/`.
- Temporary screenshot code is removed from tests.
- `assets/.keep` removed if present.
- Targeted tests pass with `--reporter=line`.

## Suggested Response Template

When finishing, report:

- files updated
- screenshot files created
- confirmation that temporary screenshot code was removed
- confirmation that `assets/.keep` was removed (or not present)
- test command run and result
