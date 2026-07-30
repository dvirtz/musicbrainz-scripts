## @dvirtz/event-seeder-v1.1.0 (2026-07-30)

* feat(event-seeder): seed event from event series ([af13bc9](https://github.com/dvirtz/musicbrainz-scripts/commit/af13bc9))
* test: simplify HAR recording ([7e7926a](https://github.com/dvirtz/musicbrainz-scripts/commit/7e7926a))
* test: support new MB login page ([1f34f25](https://github.com/dvirtz/musicbrainz-scripts/commit/1f34f25)), closes [#198](https://github.com/dvirtz/musicbrainz-scripts/issues/198)
* test: use pre-recorded responses for testing ([a746183](https://github.com/dvirtz/musicbrainz-scripts/commit/a746183))
* test(event-seeder): fix external link locator ([4d9e595](https://github.com/dvirtz/musicbrainz-scripts/commit/4d9e595))
* test(event-seeder): verify relationships before submitting ([761d7c7](https://github.com/dvirtz/musicbrainz-scripts/commit/761d7c7))

## @dvirtz/event-seeder-v1.0.0 (2026-03-31)

* feat(event-seeder): clone an event ([6f72397](https://github.com/dvirtz/musicbrainz-scripts/commit/6f72397))

## @dvirtz/event-seeder-v1.0.0 (2026-03-22)

* feat(add-sub-event): add sub-event userscript and extract shared event helpers ([29cab50](https://github.com/dvirtz/musicbrainz-scripts/commit/29cab50))
* feat(expand-events): add userscript to expand sub-events ([6b6da70](https://github.com/dvirtz/musicbrainz-scripts/commit/6b6da70))

# Changelog

All notable changes to `@dvirtz/event-seeder` will be documented in this file.

## 1.0.0 (INITIAL)

- Add `Add sub-event` and `Clone event` actions on event pages in Editing sidebar.
- Seed `/event/create` either as a child event or as a clone of the current event.
- Seed dates, relationships, and linked places from the source event where applicable.
