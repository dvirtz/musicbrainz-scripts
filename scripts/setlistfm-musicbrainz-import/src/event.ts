import {convertMonth} from '#convert-month.ts';
import {findVenue} from '#place.ts';
import {addCoverComment as addCoverCommentOption} from '#settings.tsx';
import {createUI} from '#ui.tsx';
import {tryFetchJSON, tryFetchText} from '@repo/fetch/fetch';
import {
  EVENT_GUEST_PERFORMER_RELATIONSHIP_TYPE_ID,
  EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
  EVENT_MAIN_PERFORMER_RELATIONSHIP_TYPE_ID,
  EVENT_PERFORMANCE_TIME_RELATIONSHIP_ATTRIBUTE_TYPE_ID,
  MBID_REGEXP,
} from '@repo/musicbrainz-ext/constants';
import {editNoteFormat} from '@repo/musicbrainz-ext/edit-note';
import {
  appendEventDates,
  appendEventEditNote,
  appendEventName,
  appendEventSetlist,
  appendEventTime,
  appendEventTypeId,
  appendEventUrlRelationship,
  appendRelationship,
  appendTextRelationshipAttribute,
} from '@repo/musicbrainz-ext/event-form';
import {UrlRelsSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import {
  concat,
  concatMap,
  EMPTY,
  filter,
  from,
  iif,
  lastValueFrom,
  mergeMap,
  of,
  pairwise,
  range,
  reduce,
  startWith,
  tap,
  toArray,
  zip,
} from 'rxjs';

enum TypeID {
  SetlistFmUrl = '811', // MB.linkedEntities.link_type['027fce0c-c621-4fd1-b728-1678ae08f280'].id
}

const artistMBIDCache = new Map<string, Promise<string | undefined>>();

export async function handleSetlistPage() {
  const eventMBID = await findEvent(document.location.href);
  const venueElement = document.querySelector<HTMLAnchorElement>('a[href*="/venue/"]');
  if (!venueElement) {
    return;
  }
  const placeMBID = (await findVenue(venueElement.href)) || '';
  if (!placeMBID) {
    addWarningIcon(
      'place',
      `place:${unsafeWindow.sfmPageAttributes.venue.name} AND area:${unsafeWindow.sfmPageAttributes.venue.city}`,
      venueElement
    );
  }
  if (eventMBID) {
    await createUI(
      {label: 'Open in MB', onSelect: () => window.open(`https://musicbrainz.org/event/${eventMBID}`)},
      {
        label: 'Edit in MB',
        onSelect: () => {
          submitEvent(placeMBID, eventMBID).catch(console.error);
        },
      },
      {
        label: 'Add to MB',
        onSelect: () => {
          submitEvent(placeMBID).catch(console.error);
        },
      }
    );
  } else {
    await createUI({
      label: 'Add to MB',
      onSelect: () => {
        submitEvent(placeMBID).catch(console.error);
      },
    });
  }
}

function tourName() {
  const anchors = document.querySelectorAll('a');

  // Filter anchors based on href pattern
  const filteredAnchors = Array.from(anchors).filter(anchor => anchor.href.match(/search\?artist=\w+&tour=\w+/));

  return filteredAnchors[0]?.textContent ?? null;
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

type Song = {
  work: string;
  artists: Array<string>;
  info: Array<string>;
};

type Section = {
  info?: string;
  songs: Array<Song>;
};

type SetlistEntry = Song | Section;

async function setlistEntry(
  setlistPart: Element,
  mainArtist: string,
  addCoverComment: boolean
): Promise<SetlistEntry | undefined> {
  if (setlistPart.classList.contains('tape') || setlistPart.classList.contains('song')) {
    const song: Song = {
      work: setlistPart.querySelector('.songPart')?.textContent?.trim() ?? '',
      artists: [mainArtist],
      info: [],
    };
    if (setlistPart.classList.contains('tape')) {
      song.info.push('from tape');
    }
    const infoPart = setlistPart.querySelector('.infoPart');
    if (infoPart) {
      const m = infoPart.getHTML().match(/\(with <a href="([^"]+)"( title="")?>([^<]+)<\/a>/);
      if (m) {
        song.artists.push(artist(m[3]!, await artistMBID(m[1]!)));
      }
      song.info.push(
        ...infoPart
          .querySelectorAll('span')
          .values()
          .filter(span => span.textContent !== null)
          .map(span => span.textContent!.trim())
          .filter(text => addCoverComment || !text.match(/\b(cover|song)\)/i))
      );
    }
    return song;
  } else if (setlistPart.classList.contains('encore') || setlistPart.classList.contains('section')) {
    return {
      info: setlistPart.textContent?.trim(),
      songs: [],
    } as Section;
  }
}

function toSetlist(section: Section) {
  function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  function joinArtists(artists: string[]) {
    return artists.reduce((joined: string, artist: string, index: number) => {
      if (index === 0) {
        return artist;
      }
      if (index === 1) {
        return `${joined} with ${artist}`;
      }
      if (index === artists.length - 1) {
        return `${joined} & ${artist}`;
      }
      return `${joined}, ${artist}`;
    }, '');
  }

  return from(section.songs).pipe(
    startWith({work: '', artists: [], info: []} as Song),
    pairwise(),
    mergeMap(([prev, next]) =>
      concat(
        iif(() => arraysEqual(prev.artists, next.artists), EMPTY, of(artist(joinArtists(next.artists)))),
        of(work(next.work)),
        next.info.map(info)
      )
    ),
    startWith(...(section.info ? [info(section.info)] : []))
  );
}

async function submitEvent(placeMBID: string, eventMBID?: string) {
  const searchParams = new URLSearchParams();

  const artistMBID = unsafeWindow.sfmPageAttributes.artist.mbid;
  const artistName = unsafeWindow.sfmPageAttributes.artist.name;

  // name (see https://musicbrainz.org/doc/Style/Event#Title)
  const tour = tourName();
  if (tour) {
    // use "Tour Name: City" style
    appendEventName(searchParams, `${tour}: ${unsafeWindow.sfmPageAttributes.venue.city}`);
  } else {
    // use "Artist at Venue" style
    appendEventName(searchParams, `${artistName} at ${unsafeWindow.sfmPageAttributes.venue.name}`);
  }

  // type
  appendEventTypeId(searchParams, '1'); // Concert

  const addCoverComment = await addCoverCommentOption();

  // setlist
  const sections = await lastValueFrom(
    from(document.querySelectorAll('.setlistParts')).pipe(
      concatMap(async part => await setlistEntry(part, entity(artistName, artistMBID), addCoverComment)),
      filter((maybeSetlist): maybeSetlist is SetlistEntry => maybeSetlist !== undefined),
      reduce(
        (sections: Array<Section>, entry: SetlistEntry) => {
          if ('work' in entry) {
            sections[sections.length - 1]?.songs.push(entry);
          } else {
            sections.push(entry);
          }
          return sections;
        },
        [{songs: []}] as Array<Section>
      )
    )
  );
  const setlist = await lastValueFrom(
    from(sections).pipe(
      mergeMap(section => concat(toSetlist(section), [''])),
      toArray()
    )
  );
  appendEventSetlist(searchParams, setlist.join('\n'));

  // date-time
  const dateBlock = document.querySelector('.dateBlock');
  const year = dateBlock?.querySelector('.year')?.textContent ?? '';
  const month = convertMonth(dateBlock?.querySelector('.month')?.textContent ?? '');
  const day = dateBlock?.querySelector('.day')?.textContent ?? '';
  appendEventDates(searchParams, {
    begin: {year, month: month?.toString(), day},
    end: {year, month: month?.toString(), day},
  });

  const doorTime = parseTime('.door');
  appendEventTime(searchParams, doorTime);

  appendEventEditNote(searchParams, editNoteFormat(`Imported from ${document.location.href}`));

  appendEventUrlRelationship(searchParams, 0, {
    url: document.location.href,
    linkTypeId: TypeID.SetlistFmUrl,
  });

  appendRelationship(searchParams, 0, {
    type: EVENT_MAIN_PERFORMER_RELATIONSHIP_TYPE_ID,
    target: artistMBID,
    direction: 'backward',
  });
  const startTime = parseTime('.start');
  if (startTime) {
    appendTextRelationshipAttribute(searchParams, 0, 0, {
      type: EVENT_PERFORMANCE_TIME_RELATIONSHIP_ATTRIBUTE_TYPE_ID,
      textValue: startTime,
    });
  }

  appendRelationship(searchParams, 1, {
    type: EVENT_HELD_AT_RELATIONSHIP_TYPE_ID,
    target: placeMBID,
  });

  await executePipeline(
    zip(artistMBIDCache.values(), range(0, artistMBIDCache.size)).pipe(
      mergeMap(async ([mbidPromise, index]) => [await mbidPromise, index + 2] as const),
      filter((pair): pair is [string, number] => pair[0] !== undefined),
      tap(([mbid, index]) => {
        appendRelationship(searchParams, index, {
          type: EVENT_GUEST_PERFORMER_RELATIONSHIP_TYPE_ID,
          target: mbid,
        });
      })
    )
  );

  // navigate to the event creation page
  if (eventMBID) {
    unsafeWindow.open(`https://musicbrainz.org/event/${eventMBID}/edit?` + searchParams.toString());
  } else {
    unsafeWindow.open('https://musicbrainz.org/event/create?' + searchParams.toString());
  }
}

function parseTime(query: string) {
  const mainTime = document.querySelector(query);
  if (mainTime) {
    const m = mainTime.textContent?.match(/(\d+):(\d+)\s*(PM)?/);
    if (m) {
      let hours = parseInt(m[1]!);
      const minutes = m[2];
      if (m[3]) {
        hours += 12;
      }
      return `${hours}:${minutes}`;
    }
  }
}

async function findEvent(url: string) {
  const existingEvent = await tryFetchJSON<UrlRelsSearchResultsT<'event'>>(
    `https://musicbrainz.org/ws/2/url?resource=${url}&inc=event-rels&fmt=json`
  );
  return existingEvent && existingEvent.relations[0]?.event.id;
}

function addWarningIcon(type: string, query: string, afterElement: Element) {
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

  afterElement.parentNode?.insertBefore(warningIcon, afterElement.nextSibling);
}

async function artistMBID(href: string): Promise<string | undefined> {
  if (!artistMBIDCache.has(href)) {
    artistMBIDCache.set(
      href,
      tryFetchText(href)
        .then(content => {
          const m = content?.match(/"mbid":\s*"([^"]+)"/i);
          if (m && MBID_REGEXP.test(m[1]!)) {
            return m[1];
          }
        })
        .catch(err => {
          console.error(err);
          return undefined;
        })
    );
  }
  return await artistMBIDCache.get(href);
}
