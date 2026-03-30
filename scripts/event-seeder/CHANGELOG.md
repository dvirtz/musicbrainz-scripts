## @dvirtz/event-seeder-v1.0.0-beta.1 (2026-03-30)

* chore: rename duplicate to clone ([bd8ca6e](https://github.com/dvirtz/musicbrainz-scripts/commit/bd8ca6e))
* feat(event-seeder): duplicate an event ([095694c](https://github.com/dvirtz/musicbrainz-scripts/commit/095694c))

## @dvirtz/event-seeder-v1.0.0 (2026-03-22)

* feat(add-sub-event): add sub-event userscript and extract shared event helpers ([29cab50](https://github.com/dvirtz/musicbrainz-scripts/commit/29cab50))
* feat(expand-events): add userscript to expand sub-events ([6b6da70](https://github.com/dvirtz/musicbrainz-scripts/commit/6b6da70))

# Changelog

All notable changes to `@dvirtz/event-seeder` will be documented in this file.

## 1.0.0 (INITIAL)

- Add `Add sub-event` and `Clone event` actions on event pages in Editing sidebar.
- Seed `/event/create` either as a child event or as a clone of the current event.
- Seed dates, relationships, and linked places from the source event where applicable.
