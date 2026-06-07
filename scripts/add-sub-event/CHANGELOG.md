## @dvirtz/add-sub-event-v1.1.0 (2026-06-07)

* feat(add-sub-event,remember-change-all-artists): deprecate scripts ([b4663a4](https://github.com/dvirtz/musicbrainz-scripts/commit/b4663a4))
* feat(add-sub-event,remember-change-all-artists): restore deleted userscript ([f76dfd4](https://github.com/dvirtz/musicbrainz-scripts/commit/f76dfd4))
* feat(event-seeder): clone an event ([6f72397](https://github.com/dvirtz/musicbrainz-scripts/commit/6f72397))

## @dvirtz/add-sub-event-v1.0.0 (2026-03-22)

* feat(add-sub-event): add sub-event userscript and extract shared event helpers ([29cab50](https://github.com/dvirtz/musicbrainz-scripts/commit/29cab50))
* feat(expand-events): add userscript to expand sub-events ([6b6da70](https://github.com/dvirtz/musicbrainz-scripts/commit/6b6da70))

# Changelog

All notable changes to `@dvirtz/add-sub-event` will be documented in this file.

## 1.0.0 (INITIAL)

- Add `Add Sub-event` action on event pages in Editing sidebar.
- Seed `/event/create` with parent begin/end dates.
- Seed `part of` relation to parent event and `held at` relations for linked places.
