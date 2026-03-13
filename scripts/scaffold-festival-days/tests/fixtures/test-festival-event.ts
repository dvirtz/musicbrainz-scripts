import {expect} from '@playwright/test';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {MusicbrainzPage} from '@repo/test-support/musicbrainz-page';
import {test as base} from '@repo/test-support/musicbrainz-test';

type EventSearchResultsT = Readonly<{
  events: ReadonlyArray<{
    id: string;
  }>;
}>;

type PlaceSearchResultsT = Readonly<{
  places: ReadonlyArray<{
    id: string;
  }>;
}>;

class TestPlaces {
  private static readonly places = [
    {
      name: 'scaffold-festival-days test: Place 1',
    },
    {
      name: 'scaffold-festival-days test: Place 2',
    },
  ];

  private placeIds: string[] = [];

  async create(musicbrainzPage: MusicbrainzPage) {
    for (const place of TestPlaces.places) {
      const gid = await TestPlaces.createPlace(musicbrainzPage, place.name);
      this.placeIds.push(gid);
    }
  }

  private static async createPlace(musicbrainzPage: MusicbrainzPage, placeName: string): Promise<string> {
    const existingPlace = await musicbrainzPage.page.request.get('/ws/2/place', {
      params: {
        query: `place:"${placeName}"`,
        fmt: 'json',
      },
    });
    const existingPlaceJson = (await existingPlace.json()) as PlaceSearchResultsT;
    if (existingPlaceJson?.places && existingPlaceJson.places.length > 0) {
      return existingPlaceJson.places[0]!.id;
    }

    await musicbrainzPage.userscriptPage.goto('/place/create');

    const page = musicbrainzPage.page;
    await page.getByRole('textbox', {name: 'Name:'}).fill(placeName);
    await page.getByRole('button', {name: 'Enter edit'}).click();

    await expect(page).toHaveURL(new RegExp(`/place/${MBID_REGEXP.source}$`, 'i'));
    const gid = page.url().split('/place/')[1] ?? '';
    expect(gid).toMatch(MBID_REGEXP);
    return gid;
  }

  get(index: number): string {
    return this.placeIds[index] ?? '';
  }

  getAll(): string[] {
    return this.placeIds;
  }

  getAllWithNames(): Array<{id: string; name: string}> {
    return TestPlaces.places.map((place, index) => ({
      id: this.placeIds[index] ?? '',
      name: place.name,
    }));
  }
}

class TestFestivalEvent {
  private static readonly name = 'scaffold-festival-days test: Test Festival';
  private static readonly beginDate = {
    year: '2026',
    month: '03',
    day: '10',
  };
  private static readonly endDate = {
    year: '2026',
    month: '03',
    day: '12',
  };

  private constructor(public readonly gid: string) {}

  static async create(musicbrainzPage: MusicbrainzPage) {
    const eventGid = await TestFestivalEvent.createEvent(musicbrainzPage);
    return new TestFestivalEvent(eventGid);
  }

  static async createEvent(musicbrainzPage: MusicbrainzPage) {
    const existingEvent = await musicbrainzPage.page.request.get('/ws/2/event', {
      params: {
        query: `event:"${this.name}"`,
        fmt: 'json',
      },
    });
    const existingEventJson = (await existingEvent.json()) as EventSearchResultsT;
    if (existingEventJson?.events && existingEventJson.events.length > 0) {
      return existingEventJson.events[0]!.id;
    }

    await musicbrainzPage.userscriptPage.goto('/event/create');

    const page = musicbrainzPage.page;
    await page.getByRole('textbox', {name: 'Name:'}).fill(this.name);
    await page.getByLabel('Type:').selectOption({label: 'Festival'});

    await page.getByRole('textbox', {name: 'Begin date:'}).fill(this.beginDate.year);
    await page.locator('[id="id-edit-event.period.begin_date.month"]').fill(this.beginDate.month);
    await page.locator('[id="id-edit-event.period.begin_date.day"]').fill(this.beginDate.day);

    await page.getByRole('textbox', {name: 'End date:'}).fill(this.endDate.year);
    await page.locator('[id="id-edit-event.period.end_date.month"]').fill(this.endDate.month);
    await page.locator('[id="id-edit-event.period.end_date.day"]').fill(this.endDate.day);

    await page.getByRole('textbox', {name: 'Edit note:'}).fill('test');
    await page.getByRole('button', {name: 'Enter edit'}).click();

    await expect(page).toHaveURL(new RegExp(`/event/${MBID_REGEXP.source}$`, 'i'));
    const gid = page.url().split('/event/')[1] ?? '';
    expect(gid).toMatch(MBID_REGEXP);
    return gid;
  }

  getName() {
    return TestFestivalEvent.name;
  }

  getBeginDate() {
    return TestFestivalEvent.beginDate;
  }

  getEndDate() {
    return TestFestivalEvent.endDate;
  }

  getDates() {
    const dates = [];
    const begin = new Date(2026, 2, 10);
    const end = new Date(2026, 2, 12);
    for (let d = new Date(begin); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }

  async getDaySubEvents(musicbrainzPage: MusicbrainzPage): Promise<string[]> {
    const response = await musicbrainzPage.page.request.get(`/ws/2/event/${this.gid}`, {
      params: {
        inc: 'part-of-rels',
        fmt: 'json',
      },
    });
    const eventData = (await response.json()) as {
      relations?: Array<{type: string; direction?: string; target: {id: string}}>;
    };
    return Array.isArray(eventData.relations)
      ? eventData.relations
          .filter(
            (rel: {type: string; direction?: string; target: {id: string}}) =>
              rel.type === 'part of' && (!rel.direction || rel.direction !== 'backward')
          )
          .map((rel: {target: {id: string}}) => rel.target.id)
      : [];
  }

  async getVenueSubEvents(musicbrainzPage: MusicbrainzPage, dayEventGid: string): Promise<string[]> {
    const response = await musicbrainzPage.page.request.get(`/ws/2/event/${dayEventGid}`, {
      params: {
        inc: 'part-of-rels',
        fmt: 'json',
      },
    });
    const eventData = (await response.json()) as {
      relations?: Array<{type: string; direction?: string; target: {id: string}}>;
    };
    return Array.isArray(eventData.relations)
      ? eventData.relations
          .filter(
            (rel: {type: string; direction?: string; target: {id: string}}) =>
              rel.type === 'part of' && (!rel.direction || rel.direction !== 'backward')
          )
          .map((rel: {target: {id: string}}) => rel.target.id)
      : [];
  }

  async getParentEvent(musicbrainzPage: MusicbrainzPage, eventGid: string): Promise<string | null> {
    const response = await musicbrainzPage.page.request.get(`/ws/2/event/${eventGid}`, {
      params: {
        inc: 'part-of-rels',
        fmt: 'json',
      },
    });
    const eventData = (await response.json()) as {
      relations?: Array<{type: string; direction?: string; target: {id: string}}>;
    };
    if (!Array.isArray(eventData.relations)) {
      return null;
    }
    const parentRel = eventData.relations.find(
      (rel: {type: string; direction?: string; target: {id: string}}) =>
        rel.type === 'part of' && rel.direction === 'backward'
    );
    return parentRel?.target.id ?? null;
  }
}

export const test = base.extend<{
  testFestivalEvent: TestFestivalEvent;
  testPlaces: TestPlaces;
  musicbrainzPage: MusicbrainzPage;
}>({
  testFestivalEvent: async ({musicbrainzPage}, use) => {
    const testFestivalEvent = await TestFestivalEvent.create(musicbrainzPage);
    await use(testFestivalEvent);
  },
  testPlaces: async ({musicbrainzPage}, use) => {
    const testPlaces = new TestPlaces();
    await testPlaces.create(musicbrainzPage);
    await use(testPlaces);
  },
});
