// ==UserScript==
// @name         setlist.fm event importer
// @description  Add a button to import a setlist.fm event to MusicBrainz

// @version      1.4.2
// @author       process.env.AUTHOR
// @namespace    https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL  https://github.com/dvirtz/musicbrainz-scripts/releases/latest/download/setlistfm-musicbrainz-import.user.js
// @supportURL   https://github.com/dvirtz/musicbrainz-scripts/issues
// @match        *://www.setlist.fm/setlist/*
// @match        *://www.setlist.fm/venue/*
// @icon         https://api.setlist.fm/favicon.ico
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
