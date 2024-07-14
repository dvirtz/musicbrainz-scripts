// ==UserScript==
// @name         setlist.fm event importer
// @id           setlistfm-musicbrainz-import
// @description  Add a button to import a setlist.fm event to MusicBrainz

// @version      1.1.0
// @author       Dvir Yitzchaki (dvirtz@gmail.com)
// @namespace    https://github.com/dvirtz/musicbrainz-scripts
// @downloadURL  https://github.com/dvirtz/musicbrainz-scripts/raw/main/setlistfm-musicbrainz-import.user.js
// @updateURL    https://github.com/dvirtz/musicbrainz-scripts/raw/main/setlistfm-musicbrainz-import.user.js
// @supportURL   https://github.com/dvirtz/musicbrainz-scripts/issues
// @match        *://www.setlist.fm/setlist*
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
main();

function submitEvent() {
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
    .concat(
      Array.from(document.querySelectorAll('.setlistParts').values()).flatMap(part => [
        ...setlistEntry(part, artistName),
      ])
    )
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
    `Imported from ${document.location.href} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.homepageURL}.`
  );

  searchParams.append('edit-event.url.0.text', document.location.href);
  searchParams.append('edit-event.url.0.link_type_id', '811');

  const mainPerformerGUID = '936c7c95-3156-3889-a062-8a0cd57f8946';
  searchParams.append('rels.0.type', mainPerformerGUID);
  searchParams.append('rels.0.target', artistMBID);
  searchParams.append('rels.0.direction', 'backward');

  // navigate to the event creation page
  unsafeWindow.open('https://musicbrainz.org/event/create?' + searchParams.toString());
}

//////////////////////////////////////////////////////////////////////////////

// add the button to the page
async function main() {
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

  const existingEvent = await fetch(
    `https://musicbrainz.org/ws/2/url?resource=${document.location.href}&inc=event-rels&fmt=json`
  );
  if (existingEvent.ok) {
    const body = await existingEvent.json();
    const eventId = body['relations'][0]['event'].id;
    buttonSpan.textContent = 'Open in MB';
    addBtnElem.addEventListener('click', () => {
      window.open(`https://musicbrainz.org/event/${eventId}`);
    });
  } else {
    buttonSpan.textContent = 'Add to MB';
    addBtnElem.addEventListener('click', () => {
      submitEvent();
    });
  }
}

function convertMonth(monthName) {
  const monthMap = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
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
