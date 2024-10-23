import {tryFetch} from '../common/try-fetch';
import {findVenue} from './place';
import {convertMonth} from './convert-month';
import {createUI} from './ui';
import {addCoverComment as addCoverCommentOption} from './settings';

enum GUID {
  MainPerformer = '936c7c95-3156-3889-a062-8a0cd57f8946',
  HeldAt = 'e2c6f697-07dc-38b1-be0b-83d740165532',
  PerformanceTime = 'ebd303c3-7f57-452a-aa3b-d780ebad868d',
}

enum TypeID {
  SetlistFmUrl = '811', // MB.linkedEntities.link_type['027fce0c-c621-4fd1-b728-1678ae08f280'].id
}

export async function handleSetlistPage() {
  const eventMBID = await findEvent(document.location.href);
  if (eventMBID) {
    createUI('Open in MB', () => {
      window.open(`https://musicbrainz.org/event/${eventMBID}`);
    });
  } else {
    const venueElement = document.querySelector('a[href*="/venue/"]') as HTMLAnchorElement;

    const placeMBID = await findVenue(venueElement.href);
    if (!placeMBID) {
      addWarningIcon(
        'place',
        `place:${unsafeWindow.sfmPageAttributes.venue.name} AND area:${unsafeWindow.sfmPageAttributes.venue.city}`,
        venueElement
      );
    }

    createUI('Add to MB', () => {
      submitEvent(placeMBID);
    });
  }
}

function tourName() {
  const anchors = document.querySelectorAll('a');

  // Filter anchors based on href pattern
  const filteredAnchors = Array.from(anchors).filter(anchor => anchor.href.match(/search\?artist=\w+&tour=\w+/));

  return filteredAnchors.length > 0 ? filteredAnchors[0].textContent : null;
}

function entity(name: string, mbid?: string) {
  return mbid ? `[${mbid}|${name}]` : name;
}

function artist(name: string, mbid?: string) {
  return `@ ${entity(name, mbid)}`;
}

function work(name: string, mbid?: string) {
  return `* ${entity(name, mbid)}`;
}

function info(comment: string) {
  return `# ${comment}`;
}

function* setlistEntry(setlistPart: Element, mainArtistName: string, addCoverComment: boolean) {
  if (setlistPart.classList.contains('tape') || setlistPart.classList.contains('song')) {
    yield work(setlistPart.querySelector('.songPart')!.textContent!.trim());
    if (setlistPart.classList.contains('tape')) {
      yield info('from tape');
    }
    const infoPart = setlistPart.querySelector('.infoPart');
    if (infoPart) {
      yield* infoPart
        .textContent!.split('\n')
        .filter(line => line.trim().length > 0)
        .flatMap(line => {
          const match = line.match(/\(with (.*)\)/);
          if (match) {
            return [artist(`${mainArtistName} with ${match[1]}`)];
          } else if (!line.includes('cover') || addCoverComment) {
            return [info(line)];
          } else {
            return [];
          }
        });
    }
  } else if (setlistPart.classList.contains('encore') || setlistPart.classList.contains('section')) {
    yield `\n${info(setlistPart.textContent!.trim())}`;
  }
}

function submitEvent(placeMBID: string) {
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

  const addCoverComment = addCoverCommentOption();

  // setlist
  const setlist = [artist(artistName, artistMBID)]
    .concat(
      Array.from(document.querySelectorAll('.setlistParts')).flatMap(part => [
        ...setlistEntry(part, artistName, addCoverComment),
      ])
    )
    .join('\n');
  searchParams.append('edit-event.setlist', setlist);

  // date-time
  const dateBlock = document.querySelector('.dateBlock')!;
  const year = dateBlock.querySelector('.year')!.textContent!;
  const month = convertMonth(dateBlock.querySelector('.month')!.textContent!);
  const day = dateBlock.querySelector('.day')!.textContent!;
  for (const period of ['begin', 'end']) {
    searchParams.append(`edit-event.period.${period}_date.year`, year);
    searchParams.append(`edit-event.period.${period}_date.month`, month?.toString());
    searchParams.append(`edit-event.period.${period}_date.day`, day);
  }

  const doorTime = parseTime('.door');
  if (doorTime) {
    searchParams.append('edit-event.time', doorTime);
  }

  searchParams.append(
    'edit-event.edit_note',
    `Imported from ${document.location.href} using ${GM.info.script.name} version ${GM.info.script.version} from ${GM.info.script.namespace}.`
  );

  searchParams.append('edit-event.url.0.text', document.location.href);
  searchParams.append('edit-event.url.0.link_type_id', TypeID.SetlistFmUrl);

  searchParams.append('rels.0.type', GUID.MainPerformer);
  searchParams.append('rels.0.target', artistMBID);
  searchParams.append('rels.0.direction', 'backward');
  const startTime = parseTime('.start');
  if (startTime) {
    searchParams.append('rels.0.attributes.0.type', GUID.PerformanceTime);
    searchParams.append('rels.0.attributes.0.text_value', startTime);
  }

  searchParams.append('rels.1.type', GUID.HeldAt);
  searchParams.append('rels.1.target', placeMBID);

  // navigate to the event creation page
  unsafeWindow.open('https://musicbrainz.org/event/create?' + searchParams.toString());
}

function parseTime(query: string) {
  const mainTime = document.querySelector(query);
  if (mainTime) {
    const m = mainTime.textContent!.match(/(\d+):(\d+)\s*(PM)?/);
    if (m) {
      let hours = parseInt(m[1]);
      const minutes = m[2];
      if (m[3]) {
        hours += 12;
      }
      return `${hours}:${minutes}`;
    }
  }
}

async function findEvent(url: string) {
  type Event = {
    relations: ReadonlyArray<{
      event: {
        id: string;
      };
    }>;
  };
  const existingEvent = (await tryFetch(
    `https://musicbrainz.org/ws/2/url?resource=${url}&inc=event-rels&fmt=json`
  )) as Event;
  return existingEvent && existingEvent['relations'][0]['event'].id;
}

async function addWarningIcon(type: string, query: string, afterElement: Element) {
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

  afterElement.parentNode!.insertBefore(warningIcon, afterElement.nextSibling);
}
