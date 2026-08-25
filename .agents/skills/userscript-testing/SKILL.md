---
name: userscript-testing
description: Write, run, debug and maintain Playwright tests for userscripts in this monorepo. Use whenever adding or changing a spec under scripts/*/tests/, choosing locators or assertions, recording or refreshing HAR fixtures, or diagnosing a failing Playwright test.
license: MIT
---

<!-- spell:words networkidle nocs -->

# Userscript Playwright Testing

This skill is the single source of truth for Playwright in this repository. Where any other
skill, instruction file, or existing spec disagrees with the rules below, these rules win.

## Core rules

- Use test driven development: write the failing spec first, then implement.
- Prefer high-level, user-facing locators over selector-based ones. See [Locators](#locators).
- Use web-first assertions and never hand-roll waiting. See [Assertions and waiting](#assertions-and-waiting).
- Build on the `@repo/test-support` fixtures instead of raw `@playwright/test`. See [Fixtures](#fixtures).
- Prefer HAR-backed tests over live website dependencies once a flow is stable. See [HAR fixtures](#har-fixtures).
- Always run with a non-HTML reporter so no report window opens. See [Running tests](#running-tests).

## Locators

Pick the first option that works, and only fall further down the list when the one above is
genuinely unavailable:

1. `getByRole(role, {name})` — the default. Mirrors what the user sees and what assistive tech exposes.
2. `getByLabel`, `getByPlaceholder`, `getByText`, `getByTitle`, `getByAltText`.
3. `getByTestId` — only where the markup is ours and has no accessible name.
4. `locator('<css>')` — last resort, for MusicBrainz markup that exposes neither a role nor a label.

```ts
// Good
await page.getByRole('button', {name: 'Import work from ACUM'}).click();
await page.getByRole('textbox', {name: 'Name'}).fill('Work title');
await page.getByPlaceholder('Work ID or URL').fill(workId);

// Last resort, because the field has no accessible name
await page.locator('select[name="edit-work.attributes.0.type_id"]').selectOption(typeId);
```

Additional rules:

- Scope with chaining rather than long selectors:
  `page.getByRole('row', {name: 'composer'}).getByRole('link')`.
- Disambiguate with `.filter({hasText})` / `.filter({has})` rather than `.nth(i)`. Indexing is only
  acceptable for genuinely ordinal data such as track rows.
- Never use XPath, and never select on CSS classes, DOM structure, or generated ids
  (`.css-1x2y3z`, `div > div > span`). They break on every MusicBrainz redesign.
- When a CSS fallback is unavoidable, target a stable attribute (`name`, `id` from the MB form
  schema) and add a one-line comment saying why no semantic locator exists.
- Re-use `UserscriptPage` / `MusicbrainzPage` helpers instead of re-deriving the same locator in
  multiple specs; if a locator is needed twice, promote it to a page helper method.

## Assertions and waiting

- Use auto-retrying web-first assertions: `toBeVisible`, `toHaveText`, `toContainText`,
  `toHaveValue`, `toBeChecked`, `toHaveURL`, `toMatchObject` on parsed post data.
- Prefer `toMatchAriaSnapshot` for verifying a whole region rendered by our own UI.
- When the locator already matches on text, assert `toBeVisible()` rather than `toHaveText()` —
  otherwise the assertion is circular.
- Never use `page.waitForTimeout`, `waitForLoadState('networkidle')`, or `expect.poll` as a
  substitute for a proper assertion. Playwright auto-waits for actionability.
- Do not add `try`/`catch` around assertions to make a test pass.

## Fixtures

Import `test` from the repo fixtures, not from `@playwright/test`. Import `expect` from
`@playwright/test`.

| Entry point | Use for |
| --- | --- |
| `@repo/test-support/userscript-test` | Base `test`, adds the `userscriptPage` fixture and HAR routing. |
| `@repo/test-support/musicbrainz-test` | Extends the above with an auto `musicbrainzPage` fixture that logs in. Use for any MusicBrainz-facing script. |
| `@repo/test-support/userscript-page` | `UserscriptPage` type, for helper signatures and derived page classes. |
| `@repo/test-support/musicbrainz-page` | `MusicbrainzPage` type and the `Work` shape. |
| `@repo/test-support/test-config` | `defineConfig(baseURL, userscriptPath, options?)` for `playwright.config.ts`. |

`UserscriptPage` already handles userscript injection, the userscript-manager mock, and
`window.open` capture. Use its methods instead of reimplementing them:

- `goto(url)` / `reload()` — navigate and re-inject the userscript. Never call `page.goto` directly.
- `waitForMenuCommand(name)` / `invokeMenuCommand(name)` — drive `GM_registerMenuCommand` entries.
- `testSettings(options)` — full round-trip check of a script's settings dialog.
- `request(url, options)` / `requestJSON<T>(url, options)` — call MusicBrainz web services.
- `postDataJSON(request)` — parse a captured request body for assertions.
- `route()` / `rejectRoute()` — stub or fail a request; both return an unroute callback to call when done.
- `submitForm(formData, actionUrl)` — exercise seeded-form entry points.
- `windowOpenLog` — assert on URLs the script opened.

`MusicbrainzPage` adds `login()` (skipped automatically during HAR replay), `createEdit`,
`deleteEntity`, `editTracklist`, and `expectWorkCreateToMatch`.

```ts
import {expect} from '@playwright/test';
import {test} from '@repo/test-support/musicbrainz-test';

test('imports a work from ACUM', async ({userscriptPage}) => {
  const {page} = userscriptPage;
  await userscriptPage.goto('work/create');
  await page.getByRole('button', {name: 'Import work from ACUM'}).click();
  await expect(page.getByRole('textbox', {name: 'Name'})).toHaveValue('Some work');
});
```

## Test structure

- One behavior per test; keep tests independent so they can run in any order.
- Do not chain tests or share mutable state between them — each gets a fresh context and its own
  HAR fixture keyed on the test title.
- Renaming a test renames its HAR directory. Move or re-record the fixture when you rename.
- Use `test.describe` to group by feature, and give tests names that read as behavior
  ("skips special purpose artists"), not as implementation.
- Factor shared setup, teardown and page interactions into a `test.extend` fixture — usually
  wrapping a small page-object class — rather than free helper functions the tests must remember to
  call. See [merge-split.spec.ts](../../../scripts/medium-merge-split/tests/merge-split.spec.ts),
  where `ReleaseEditorPage` holds the interactions and the `releaseEditorPage` fixture performs the
  navigation every test needs.
- Compose fixtures with `mergeTests` and layer per-spec setup by re-extending the merged `test`.
- Never silently skip a broken test. Use `test.fixme` with a comment explaining why.
- `test.only` is forbidden on CI and will fail the build.

## Do not mutate MusicBrainz data

Tests run against the live test server. The only writes they may perform are the ones that set up
their own fixture entities — for example `TestRelease` in
[test-release.ts](../../../scripts/acum-work-import/tests/fixtures/test-release.ts), which creates
a release and medium via `musicbrainzPage.createEdit` and can clean up with `deleteEntity`.

Everything else must be intercepted. Route the edit endpoint, assert on the request payload, and
fulfill a plausible response instead of letting the edit through:

```ts
const unrouteWorkCreate = await userscriptPage.route('**/work/create', async (route, request) => {
  const postData = await userscriptPage.postDataJSON(request);
  musicbrainzPage.expectWorkCreateToMatch(postData, work);
  await route.fulfill({status: 200, body: JSON.stringify({mbid: work.id})});
});

// ...drive the UI...

await unrouteWorkCreate();
```

Rules:

- Intercept `ws/js/edit/create`, `**/work/create`, and any other write endpoint the script calls.
- The interception *is* the assertion — verify the submitted payload rather than re-reading the
  entity afterwards.
- To assert a write must never happen, route it to throw:
  `userscriptPage.route('**/work/create', () => { throw new Error('should not create any work'); })`.
- Always call the unroute callback returned by `userscriptPage.route(...)`. Never use
  `page.unrouteAll()` — it tears down the HAR replay routes and is blocked by eslint.
- See [release-editor.spec.ts](../../../scripts/acum-work-import/tests/release-editor.spec.ts) for
  a full example.

## Running tests

Always pass a non-HTML reporter from an agent session so no browser report window opens.

```powershell
# Whole script package
yarn workspace @dvirtz/<script-id> test --reporter=line

# Single spec, or a single test by line
yarn workspace @dvirtz/<script-id> test tests/<spec>.spec.ts --reporter=line
yarn workspace @dvirtz/<script-id> test tests/<spec>.spec.ts:42 --reporter=line

# Everything
yarn test
```

Fix failures one at a time and re-run the single failing test before moving on.

## HAR fixtures

Specs replay network traffic from HAR files so CI does not depend on live sites.

- Fixtures live at `scripts/<script-id>/tests/fixtures/har/<spec-name>/<test-slug>/<test-slug>.har`
  and are created automatically; commit them.
- Record or refresh with the `chromium-har` project. It runs with a single worker because of the
  MusicBrainz rate limit, and sanitizes tokens out of the HAR afterwards:

  ```powershell
  yarn workspace @dvirtz/<script-id> record:har --reporter=line
  ```

- Recording requires `MB_USERNAME` and `MB_PASSWORD` in the repo-root `.env`.
- A recording must cover every live domain the spec touches (for example `www.setlist.fm` and
  `nocs.acum.org.il`), otherwise replay aborts the missing requests.
- Re-record whenever the set of network requests a spec makes changes — new or removed endpoints,
  changed query parameters, or a different request order all invalidate the recording. Changing the
  script's fetching logic means the HAR must be refreshed even if the test itself is untouched.
- Also re-record when the site markup, the web service payloads, or the test title changes.
- Never hand-edit a HAR file. Re-record instead.

## Debugging

- Traces are captured `on-first-retry`; open with `npx playwright show-trace <trace.zip>`.
- Set `PWDEBUG=1` to disable timeouts and expose the Chrome remote debugging port on 9222.
- Use `--headed` and `--debug` for interactive stepping.
- Run the dev server (`yarn workspace @dvirtz/<script-id> dev`) before the test to get the
  userscript served from Vite with sourcemaps and working TypeScript breakpoints.
- Console errors from the page are already forwarded to the test output.
- A failure means either the locator drifted, the assertion is wrong, or the script has a bug.
  Diagnose which before editing; do not weaken the assertion to get green.
