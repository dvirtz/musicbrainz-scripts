// ==UserScript==
// @name        setlist.fm event importer
// @id          setlistfm-musicbrainz-import
// @description Add a button to import a setlist.fm event to MusicBrainz
// @version     1.2.1
// @author      Dvir Yitzchaki (dvirtz@gmail.com)
// @namespace   https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/setlistfm-musicbrainz-import/setlistfm-musicbrainz-import.user.js
// @updateURL   https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/setlistfm-musicbrainz-import/setlistfm-musicbrainz-import.user.js
// @supportURL  https://github.com/dvirtz/musicbrainz-scripts/issues
// @match       *://www.setlist.fm/setlist/*
// @match       *://www.setlist.fm/venue/*
// @icon        https://api.setlist.fm/favicon.ico
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @license     MIT
// @run-at      document-end
// ==/UserScript==

(function (web) {
'use strict';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function editNote(message) {
  return `----
${message} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}. `;
}

var fetchRetry$1 = function (fetch, defaults) {
  defaults = defaults || {};
  if (typeof fetch !== 'function') {
    throw new ArgumentError('fetch must be a function');
  }

  if (typeof defaults !== 'object') {
    throw new ArgumentError('defaults must be an object');
  }

  if (defaults.retries !== undefined && !isPositiveInteger(defaults.retries)) {
    throw new ArgumentError('retries must be a positive integer');
  }

  if (defaults.retryDelay !== undefined && !isPositiveInteger(defaults.retryDelay) && typeof defaults.retryDelay !== 'function') {
    throw new ArgumentError('retryDelay must be a positive integer or a function returning a positive integer');
  }

  if (defaults.retryOn !== undefined && !Array.isArray(defaults.retryOn) && typeof defaults.retryOn !== 'function') {
    throw new ArgumentError('retryOn property expects an array or function');
  }

  var baseDefaults = {
    retries: 3,
    retryDelay: 1000,
    retryOn: [],
  };

  defaults = Object.assign(baseDefaults, defaults);

  return function fetchRetry(input, init) {
    var retries = defaults.retries;
    var retryDelay = defaults.retryDelay;
    var retryOn = defaults.retryOn;

    if (init && init.retries !== undefined) {
      if (isPositiveInteger(init.retries)) {
        retries = init.retries;
      } else {
        throw new ArgumentError('retries must be a positive integer');
      }
    }

    if (init && init.retryDelay !== undefined) {
      if (isPositiveInteger(init.retryDelay) || (typeof init.retryDelay === 'function')) {
        retryDelay = init.retryDelay;
      } else {
        throw new ArgumentError('retryDelay must be a positive integer or a function returning a positive integer');
      }
    }

    if (init && init.retryOn) {
      if (Array.isArray(init.retryOn) || (typeof init.retryOn === 'function')) {
        retryOn = init.retryOn;
      } else {
        throw new ArgumentError('retryOn property expects an array or function');
      }
    }

    // eslint-disable-next-line no-undef
    return new Promise(function (resolve, reject) {
      var wrappedFetch = function (attempt) {
        // As of node 18, this is no longer needed since node comes with native support for fetch:
        /* istanbul ignore next */
        var _input =
          typeof Request !== 'undefined' && input instanceof Request
            ? input.clone()
            : input;
        fetch(_input, init)
          .then(function (response) {
            if (Array.isArray(retryOn) && retryOn.indexOf(response.status) === -1) {
              resolve(response);
            } else if (typeof retryOn === 'function') {
              try {
                // eslint-disable-next-line no-undef
                return Promise.resolve(retryOn(attempt, null, response))
                  .then(function (retryOnResponse) {
                    if(retryOnResponse) {
                      retry(attempt, null, response);
                    } else {
                      resolve(response);
                    }
                  }).catch(reject);
              } catch (error) {
                reject(error);
              }
            } else {
              if (attempt < retries) {
                retry(attempt, null, response);
              } else {
                resolve(response);
              }
            }
          })
          .catch(function (error) {
            if (typeof retryOn === 'function') {
              try {
                // eslint-disable-next-line no-undef
                Promise.resolve(retryOn(attempt, error, null))
                  .then(function (retryOnResponse) {
                    if(retryOnResponse) {
                      retry(attempt, error, null);
                    } else {
                      reject(error);
                    }
                  })
                  .catch(function(error) {
                    reject(error);
                  });
              } catch(error) {
                reject(error);
              }
            } else if (attempt < retries) {
              retry(attempt, error, null);
            } else {
              reject(error);
            }
          });
      };

      function retry(attempt, error, response) {
        var delay = (typeof retryDelay === 'function') ?
          retryDelay(attempt, error, response) : retryDelay;
        setTimeout(function () {
          wrappedFetch(++attempt);
        }, delay);
      }

      wrappedFetch(0);
    });
  };
};

function isPositiveInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function ArgumentError(message) {
  this.name = 'ArgumentError';
  this.message = message;
}

var fetchBuilder = /*@__PURE__*/getDefaultExportFromCjs(fetchRetry$1);

const fetchRetry = fetchBuilder(fetch);
async function tryFetch(url) {
  try {
    const result = await fetchRetry(url, {
      headers: {
        Accept: 'application/json'
      },
      retryOn: [503],
      retryDelay: attempt => Math.pow(2, attempt) * 1000
    });
    if (!result.ok) {
      throw new Error(`HTTP error: ${result.status}`);
    }
    return await result.json();
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e}`);
    return null;
  }
}

var _tmpl$ = /*#__PURE__*/web.template(`<div class=btn-group><button class=btn><img src=https://musicbrainz.org/static/images/favicons/favicon-32x32.png alt=MB style=width:16px;height:16px;margin:2px><span>`);
function createUI(buttonText, onClick) {
  const div = (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$3.nextSibling;
    web.addEventListener(_el$2, "click", onClick, true);
    web.insert(_el$4, buttonText);
    return _el$;
  })();
  const userFragment = document.querySelector('.user-fragment');
  userFragment == null || userFragment.insertBefore(div, userFragment.firstChild);
}
web.delegateEvents(["click"]);

const Constants = {
  Place: {
    SetlistFmUrl: '817'
  },
  Event: {
    SetlistFmUrl: '811',
    MainPerformerGUID: '936c7c95-3156-3889-a062-8a0cd57f8946',
    HeldAtGUID: 'e2c6f697-07dc-38b1-be0b-83d740165532'
  }
};
main();
function submitPlace() {
  const searchParams = new URLSearchParams();
  searchParams.append('edit-place.name', unsafeWindow.sfmPageAttributes.venue.name);
  searchParams.append('edit-place.edit_note', editNote(`Imported from ${document.location.href}`));
  searchParams.append('edit-place.area.name', unsafeWindow.sfmPageAttributes.venue.city);
  const infoPart = document.querySelector('div.info');
  if (infoPart) {
    for (const form of infoPart.querySelectorAll('.form-group')) {
      var _form$querySelector;
      const label = (_form$querySelector = form.querySelector('.label')) == null ? void 0 : _form$querySelector.textContent;
      switch (label) {
        case 'Address':
          searchParams.append('edit-place.address', form.querySelector('span.address').innerText.replaceAll('\n', ', '));
          break;
        case 'Opened':
          {
            const openedLabel = form.querySelector('span:not(.label)');
            if (openedLabel && openedLabel.textContent) {
              const tokens = openedLabel.textContent.split(' ');
              searchParams.append('edit-place.period.begin_date.year', tokens[tokens.length - 1]);
              if (tokens.length > 1) {
                searchParams.append('edit-place.period.begin_date.month', convertMonth(tokens[tokens.length - 2]).toString());
                if (tokens.length > 2) {
                  searchParams.append('edit-place.period.begin_date.day', tokens[tokens.length - 3]);
                }
              }
            }
            break;
          }
        case 'Web':
          form.querySelectorAll('span:not(.label) a').forEach((link, index) => {
            searchParams.append(`edit-place.url.${index + 1}.text`, link.href);
          });
          break;
      }
    }
  }
  searchParams.append('edit-place.url.0.text', document.location.href);
  searchParams.append('edit-place.url.0.link_type_id', Constants.Place.SetlistFmUrl);

  // navigate to the place creation page
  unsafeWindow.open('https://musicbrainz.org/place/create?' + searchParams.toString());
}
function submitEvent(placeMBID) {
  const searchParams = new URLSearchParams();
  const artistMBID = unsafeWindow.sfmPageAttributes.artist.mbid;
  const artistName = unsafeWindow.sfmPageAttributes.artist.name;

  // name (see https://musicbrainz.org/doc/Style/Event#Title)
  const tour = tourName();
  if (tour) {
    // use "Tour Name: City" style
    searchParams.append('edit-event.name', `${tour}: ${unsafeWindow.sfmPageAttributes.venue.city}`);
  } else {
    // use "Artist at Venue" style
    searchParams.append('edit-event.name', `${artistName} at ${unsafeWindow.sfmPageAttributes.venue.name}`);
  }

  // type
  searchParams.append('edit-event.type_id', '1'); // Concert

  // setlist
  const setlist = [artist(artistName, artistMBID)].concat(Array.from(document.querySelectorAll('.setlistParts')).flatMap(part => [...setlistEntry(part, artistName)])).join('\n');
  searchParams.append('edit-event.setlist', setlist);

  // date-time
  const dateBlock = document.querySelector('.dateBlock');
  const year = dateBlock.querySelector('.year').textContent;
  const month = convertMonth(dateBlock.querySelector('.month').textContent);
  const day = dateBlock.querySelector('.day').textContent;
  for (const period of ['begin', 'end']) {
    searchParams.append(`edit-event.period.${period}_date.year`, year);
    searchParams.append(`edit-event.period.${period}_date.month`, month == null ? void 0 : month.toString());
    searchParams.append(`edit-event.period.${period}_date.day`, day);
  }
  const mainTime = document.querySelector('.mainTime');
  if (mainTime) {
    const m = mainTime.textContent.match(/(\d+):(\d+)\s*(PM)?/);
    if (m) {
      let hours = parseInt(m[1]);
      const minutes = m[2];
      if (m[3]) {
        hours += 12;
      }
      searchParams.append('edit-event.time', `${hours}:${minutes}`);
    }
  }
  searchParams.append('edit-event.edit_note', `Imported from ${document.location.href} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.`);
  searchParams.append('edit-event.url.0.text', document.location.href);
  searchParams.append('edit-event.url.0.link_type_id', Constants.Event.SetlistFmUrl);
  searchParams.append('rels.0.type', Constants.Event.MainPerformerGUID);
  searchParams.append('rels.0.target', artistMBID);
  searchParams.append('rels.0.direction', 'backward');
  searchParams.append('rels.1.type', Constants.Event.HeldAtGUID);
  searchParams.append('rels.1.target', placeMBID);

  // navigate to the event creation page
  unsafeWindow.open('https://musicbrainz.org/event/create?' + searchParams.toString());
}

//////////////////////////////////////////////////////////////////////////////

// add the button to the page
async function main() {
  if (location.href.includes('/venue/')) {
    await handleVenuePage();
  } else {
    await handleSetlistPage();
  }
}
function convertMonth(monthName) {
  const monthMap = {
    Jan: 1,
    January: 1,
    Feb: 2,
    February: 2,
    Mar: 3,
    March: 3,
    Apr: 4,
    April: 4,
    May: 5,
    Jun: 6,
    June: 6,
    Jul: 7,
    July: 7,
    Aug: 8,
    August: 8,
    Sep: 9,
    September: 9,
    Oct: 10,
    October: 10,
    Nov: 11,
    November: 11,
    Dec: 12,
    December: 12
  };

  // convert 3-letter month name to number
  return monthMap[monthName];
}
function tourName() {
  const anchors = document.querySelectorAll('a');

  // Filter anchors based on href pattern
  const filteredAnchors = Array.from(anchors).filter(anchor => anchor.href.match(/search\?artist=\w+&tour=\w+/));
  return filteredAnchors.length > 0 ? filteredAnchors[0].textContent : null;
}
function entity(name, mbid) {
  return mbid ? `[${mbid}|${name}]` : name;
}
function artist(name, mbid) {
  return `@ ${entity(name, mbid)}`;
}
function work(name, mbid) {
  return `* ${entity(name, mbid)}`;
}
function info(comment) {
  return `# ${comment}`;
}
function* setlistEntry(setlistPart, mainArtistName) {
  if (setlistPart.classList.contains('tape') || setlistPart.classList.contains('song')) {
    yield work(setlistPart.querySelector('.songPart').textContent.trim());
    if (setlistPart.classList.contains('tape')) {
      yield info('from tape');
    }
    const infoPart = setlistPart.querySelector('.infoPart');
    if (infoPart) {
      yield* infoPart.textContent.split('\n').filter(line => line.trim().length > 0).map(line => {
        const match = line.match(/\(with (.*)\)/);
        if (match) {
          return artist(`${mainArtistName} with ${match[1]}`);
        } else {
          return info(line);
        }
      });
    }
  } else if (setlistPart.classList.contains('encore') || setlistPart.classList.contains('section')) {
    yield `\n${info(setlistPart.textContent.trim())}`;
  }
}
async function addWarningIcon(type, query, afterElement) {
  const warningIcon = document.createElement('img');
  warningIcon.src = 'https://musicbrainz.org/static/images/icons/warning.png';
  warningIcon.alt = 'warning';
  warningIcon.style.width = '16px';
  warningIcon.style.height = '16px';
  warningIcon.style.margin = '2px';
  warningIcon.title = `${type} not found on MusicBrainz, click to search`;
  warningIcon.addEventListener('click', () => {
    window.open(`https://musicbrainz.org/search?query=${query}&type=${type}&method=advanced`);
  });
  afterElement.parentNode.insertBefore(warningIcon, afterElement.nextSibling);
}
async function findVenue(url) {
  const existingVenue = await tryFetch(`https://musicbrainz.org/ws/2/url?resource=${url}&inc=place-rels&fmt=json`);
  return existingVenue && existingVenue['relations'][0]['place'].id;
}
async function findEvent(url) {
  const existingEvent = await tryFetch(`https://musicbrainz.org/ws/2/url?resource=${url}&inc=event-rels&fmt=json`);
  return existingEvent && existingEvent['relations'][0]['event'].id;
}
async function handleSetlistPage() {
  const eventMBID = await findEvent(document.location.href);
  if (eventMBID) {
    createUI('Open in MB', () => {
      window.open(`https://musicbrainz.org/event/${eventMBID}`);
    });
  } else {
    const venueElement = document.querySelector('a[href*="/venue/"]');
    const placeMBID = await findVenue(venueElement.href);
    if (!placeMBID) {
      addWarningIcon('place', `place:${unsafeWindow.sfmPageAttributes.venue.name} AND area:${unsafeWindow.sfmPageAttributes.venue.city}`, venueElement);
    }
    createUI('Add to MB', () => {
      submitEvent(placeMBID);
    });
  }
}
async function handleVenuePage() {
  const placeMBID = await findVenue(document.location.href);
  if (placeMBID) {
    createUI('Open in MB', () => {
      window.open(`https://musicbrainz.org/place/${placeMBID}`);
    });
  } else {
    createUI('Add to MB', () => {
      submitPlace();
    });
  }
}

})(VM.solid.web);
