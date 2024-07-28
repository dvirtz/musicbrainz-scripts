// ==UserScript==
// @name         setlist.fm event importer
// @id           setlistfm-musicbrainz-import
// @description  Add a button to import a setlist.fm event to MusicBrainz

// @version      1.2.0
// @author       Dvir Yitzchaki (dvirtz@gmail.com)
// @namespace    https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL  https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/setlistfm-musicbrainz-import/setlistfm-musicbrainz-import.user.js
// @updateURL    https://github.com/dvirtz/musicbrainz-scripts/raw/main/scripts/setlistfm-musicbrainz-import/setlistfm-musicbrainz-import.user.js
// @supportURL   https://github.com/dvirtz/musicbrainz-scripts/issues
// @match        *://www.setlist.fm/setlist/*
// @match        *://www.setlist.fm/venue/*
// @icon         https://api.setlist.fm/favicon.ico
// @license      MIT
// @run-at       document-end
// ==/UserScript==

// We use the following object defined the setlist page to access show's metadata
//     sfmPageAttributes: {
//         artist: {
//             name: string;
//             mbid: string;
//         },
//         venue: {
//             name: string;
//             city: string;
//         }
//     }
// }

const Constants = {
  Place: {
    SetlistFmUrl: '817',
  },
  Event: {
    SetlistFmUrl: '811',
    MainPerformerGUID: '936c7c95-3156-3889-a062-8a0cd57f8946',
    HeldAtGUID: 'e2c6f697-07dc-38b1-be0b-83d740165532',
  },
};

main();

function submitPlace() {
  let searchParams = new URLSearchParams();

  searchParams.append('edit-place.name', unsafeWindow.sfmPageAttributes.venue.name);

  searchParams.append(
    'edit-place.edit_note',
    `Imported from ${document.location.href} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.`
  );

  searchParams.append('edit-place.area.name', unsafeWindow.sfmPageAttributes.venue.city);

  const infoPart = document.querySelector('div.info');
  if (infoPart) {
    for (const form of infoPart.querySelectorAll('.form-group')) {
      const label = form.querySelector('.label').textContent;
      switch (label) {
        case 'Address':
          searchParams.append(
            'edit-place.address',
            form.querySelector('span.address').innerText.replaceAll('\n', ', ')
          );
          break;
        case 'Opened': {
          const openedText = form.querySelector('span:not(.label)').textContent;
          const tokens = openedText.split(' ');
          searchParams.append('edit-place.period.begin_date.year', tokens[tokens.length - 1]);
          if (tokens.length > 1) {
            searchParams.append('edit-place.period.begin_date.month', convertMonth(tokens[tokens.length - 2]));
            if (tokens.length > 2) {
              searchParams.append('edit-place.period.begin_date.day', tokens[tokens.length - 3]);
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
  let searchParams = new URLSearchParams();

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
  searchParams.append('edit-event.type_id', 1); // Concert

  // setlist
  const setlist = [artist(artistName, artistMBID)]
    .concat(Array.from(document.querySelectorAll('.setlistParts')).flatMap(part => [...setlistEntry(part, artistName)]))
    .join('\n');
  searchParams.append('edit-event.setlist', setlist);

  // date-time
  const dateBlock = document.querySelector('.dateBlock');
  const year = dateBlock.querySelector('.year').textContent;
  const month = convertMonth(dateBlock.querySelector('.month').textContent);
  const day = dateBlock.querySelector('.day').textContent;
  for (const period of ['begin', 'end']) {
    searchParams.append(`edit-event.period.${period}_date.year`, year);
    searchParams.append(`edit-event.period.${period}_date.month`, month);
    searchParams.append(`edit-event.period.${period}_date.day`, day);
  }
  const mainTime = document.querySelector('.mainTime');
  if (mainTime) {
    const m = mainTime.textContent.match(/(\d+):(\d+)\s*(PM)?/);
    if (m) {
      let hours = parseInt(m[1]);
      let minutes = m[2];
      if (m[3]) {
        hours += 12;
      }
      searchParams.append('edit-event.time', `${hours}:${minutes}`);
    }
  }

  searchParams.append(
    'edit-event.edit_note',
    `Imported from ${document.location.href} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.`
  );

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
    December: 12,
  };

  // convert 3-letter month name to number
  return monthMap[monthName] || null; // Return null if the month name is not found
}

function tourName() {
  const anchors = document.querySelectorAll('a');

  // Filter anchors based on href pattern
  const filteredAnchors = Array.from(anchors).filter(anchor => anchor.href.match(/search\?artist=\w+&tour=\w+/));

  return filteredAnchors.length > 0 ? filteredAnchors[0].textContent : null;
}

function entity(name, mbid = null) {
  return mbid ? `[${mbid}|${name}]` : name;
}

function artist(name, mbid = null) {
  return `@ ${entity(name, mbid)}`;
}

function work(name, mbid = null) {
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
      yield* infoPart.textContent
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
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

async function createAddButton() {
  let div = document.createElement('div');
  div.classList.add('btn-group');

  const addBtnElem = document.createElement('button');
  addBtnElem.classList.add('btn');

  const buttonIcon = document.createElement('img');
  buttonIcon.src = 'https://musicbrainz.org/static/images/favicons/favicon-32x32.png';
  buttonIcon.alt = 'MB';
  buttonIcon.style.width = '16px';
  buttonIcon.style.height = '16px';
  buttonIcon.style.margin = '2px';
  addBtnElem.appendChild(buttonIcon);

  const buttonSpan = document.createElement('span');
  addBtnElem.appendChild(buttonSpan);

  div.appendChild(addBtnElem);

  const userFragment = document.querySelector('.user-fragment');
  userFragment.insertBefore(div, userFragment.firstChild);
  return {addBtnElem, buttonSpan};
}

async function findEvent(url) {
  const existingEvent = await tryFetch(`https://musicbrainz.org/ws/2/url?resource=${url}&inc=event-rels&fmt=json`);
  return existingEvent && existingEvent['relations'][0]['event'].id;
}

async function handleSetlistPage() {
  const {addBtnElem, buttonSpan} = await createAddButton();

  const eventMBID = await findEvent(document.location.href);
  if (eventMBID) {
    buttonSpan.textContent = 'Open in MB';
    addBtnElem.addEventListener('click', () => {
      window.open(`https://musicbrainz.org/event/${eventMBID}`);
    });
  } else {
    const venueElement = document.querySelector('a[href*="/venue/"]');

    const placeMBID = await findVenue(venueElement.href);
    if (!placeMBID) {
      addWarningIcon(
        'place',
        `place:${unsafeWindow.sfmPageAttributes.venue.name} AND area:${unsafeWindow.sfmPageAttributes.venue.city}`,
        venueElement
      );
    }
    buttonSpan.textContent = 'Add to MB';
    addBtnElem.addEventListener('click', () => {
      submitEvent(placeMBID);
    });
  }
}

async function handleVenuePage() {
  const {addBtnElem, buttonSpan} = await createAddButton();

  const placeMBID = await findVenue(document.location.href);
  if (placeMBID) {
    buttonSpan.textContent = 'Open in MB';
    addBtnElem.addEventListener('click', () => {
      window.open(`https://musicbrainz.org/place/${placeMBID}`);
    });
  } else {
    buttonSpan.textContent = 'Add to MB';
    addBtnElem.addEventListener('click', () => {
      submitPlace();
    });
  }
}

async function tryFetch(url) {
  try {
    const result = await fetch(url, {headers: {'Accept': 'application/json'}});
    if (!result.ok) {
      throw new Error(`HTTP error: ${result.status}`);
    }
    return await result.json();
  } catch (e) {
    console.error(`Failed to fetch ${url}: ${e}`);
    return null;
  }
}
