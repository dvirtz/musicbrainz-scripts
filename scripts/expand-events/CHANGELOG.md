## @dvirtz/expand-events-v1.1.0 (2026-03-31)

* test: disable parallelism ([a31b298](https://github.com/dvirtz/musicbrainz-scripts/commit/a31b298))
* feat(event-seeder): clone an event ([6f72397](https://github.com/dvirtz/musicbrainz-scripts/commit/6f72397))
* feat(expand-events): layout improvements ([af4e762](https://github.com/dvirtz/musicbrainz-scripts/commit/af4e762))
* perf(expand-events): prefetch child events ([e4c083d](https://github.com/dvirtz/musicbrainz-scripts/commit/e4c083d))

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
