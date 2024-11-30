import {tryFetchJSON} from 'src/common/lib/fetch';
import {editNote} from 'src/common/musicbrainz/edit-note';
import {convertMonth} from './convert-month';
import {createUI} from './ui';

enum TypeID {
  SetlistFmUrl = '817', // MB.linkedEntities.link_type['751e8fb1-ed8d-4a94-b71b-a38065054f5d'].id
}

export async function handleVenuePage() {
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

export async function findVenue(url: string) {
  type Venue = {
    relations: ReadonlyArray<{
      place: {
        id: string;
      };
    }>;
  };
  const existingVenue = await tryFetchJSON<Venue>(
    `https://musicbrainz.org/ws/2/url?resource=${url}&inc=place-rels&fmt=json`
  );
  return existingVenue && existingVenue['relations'][0]['place'].id;
}

function submitPlace() {
  const searchParams = new URLSearchParams();

  searchParams.append('edit-place.name', unsafeWindow.sfmPageAttributes.venue.name);

  searchParams.append('edit-place.edit_note', editNote(`Imported from ${document.location.href}`));

  searchParams.append('edit-place.area.name', unsafeWindow.sfmPageAttributes.venue.city);

  const infoPart = document.querySelector('div.info');
  if (infoPart) {
    for (const form of infoPart.querySelectorAll('.form-group')) {
      const label = form.querySelector('.label')?.textContent;
      switch (label) {
        case 'Address':
          searchParams.append(
            'edit-place.address',
            (form.querySelector('span.address') as HTMLSpanElement).innerText.replaceAll('\n', ', ')
          );
          break;
        case 'Opened': {
          const openedLabel = form.querySelector('span:not(.label)');
          if (openedLabel && openedLabel.textContent) {
            const tokens = openedLabel.textContent.split(' ');
            searchParams.append('edit-place.period.begin_date.year', tokens[tokens.length - 1]);
            if (tokens.length > 1) {
              searchParams.append(
                'edit-place.period.begin_date.month',
                convertMonth(tokens[tokens.length - 2]).toString()
              );
              if (tokens.length > 2) {
                searchParams.append('edit-place.period.begin_date.day', tokens[tokens.length - 3]);
              }
            }
          }
          break;
        }
        case 'Web':
          form.querySelectorAll<HTMLAnchorElement>('span:not(.label) a').forEach((link, index) => {
            searchParams.append(`edit-place.url.${index + 1}.text`, link.href);
          });
          break;
      }
    }
  }

  searchParams.append('edit-place.url.0.text', document.location.href);
  searchParams.append('edit-place.url.0.link_type_id', TypeID.SetlistFmUrl);

  // navigate to the place creation page
  unsafeWindow.open('https://musicbrainz.org/place/create?' + searchParams.toString());
}
