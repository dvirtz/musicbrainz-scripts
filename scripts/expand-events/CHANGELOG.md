## @dvirtz/expand-events-v1.1.0-beta.2 (2026-03-30)

* test: disable parallelism ([1051c5d](https://github.com/dvirtz/musicbrainz-scripts/commit/1051c5d))
* fix(expand-events): fix failing tests ([720d3a1](https://github.com/dvirtz/musicbrainz-scripts/commit/720d3a1))
* feat(event-seeder): duplicate an event ([095694c](https://github.com/dvirtz/musicbrainz-scripts/commit/095694c))
* feat(expand-events): one metadata column, word break ([d73821a](https://github.com/dvirtz/musicbrainz-scripts/commit/d73821a))

## @dvirtz/expand-events-v1.1.0-beta.1 (2026-03-24)

* perf(expand-events): prefetch child events ([e9af9f7](https://github.com/dvirtz/musicbrainz-scripts/commit/e9af9f7))
* feat(expand-events): add time column and sort by it ([82348aa](https://github.com/dvirtz/musicbrainz-scripts/commit/82348aa))

## @dvirtz/expand-events-v1.0.0 (2026-03-22)

* feat(expand-events): add userscript to expand sub-events ([6b6da70](https://github.com/dvirtz/musicbrainz-scripts/commit/6b6da70))

# Changelog

All notable changes to `@dvirtz/expand-events` will be documented in this file.

## 1.0.0 (INITIAL)

- Add inline expand/collapse toggles for child sub-events on event pages
- Add lazy-loaded recursive expansion with cached event details
- Add page-level `Expand all` / `Collapse all` controls
- Add quick links (`edit`, `editing history`, and conditional `add sub-event`)
- Add Playwright coverage for caching, recursion, global controls, and error handling
