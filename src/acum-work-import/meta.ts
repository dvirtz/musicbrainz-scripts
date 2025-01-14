// ==UserScript==
// @name         ACUM work importer
// @description  imports MusicBrainz works from acum.org.il database

// @version      1.9.0
// @author       process.env.AUTHOR
// @namespace    https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL  https://github.com/dvirtz/musicbrainz-scripts/releases/latest/download/acum-work-import.user.js
// @supportURL   https://github.com/dvirtz/musicbrainz-scripts/issues
// @match        http*://*.musicbrainz.org/release/*/edit-relationships
// @match        http*://*.musicbrainz.org/work/*
// @match        http*://*.musicbrainz.org/dialog?path=%2Fwork%2F*
// @icon         https://nocs.acum.org.il/acumsitesearchdb/resources/images/faviconSite.svg
// @require      https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require      https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require      https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @license      MIT
// @run-at       document-end
// ==/UserScript==

/**
 * Code here will be ignored on compilation. So it's a good place to leave messages to developers.
 *
 * - The `@grant`s used in your source code will be added automatically by `rollup-plugin-userscript`.
 *   However you have to add explicitly those used in required resources.
 * - `process.env.VERSION` and `process.env.AUTHOR` will be loaded from `package.json`.
 */
