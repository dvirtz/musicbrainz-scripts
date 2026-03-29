import {expect} from '@playwright/test';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {EventForm} from '@repo/musicbrainz-ext/event-form';
import {MusicbrainzPage} from '@repo/test-support/musicbrainz-page';
import {test as base} from '@repo/test-support/musicbrainz-test';

type EventSearchResultsT = Readonly<{
  events: ReadonlyArray<{
    id: string;
  }>;
}>;

type TestEventRelationshipAttribute = Readonly<{
  type: string;
  textValue?: string;
}>;

type TestEventEntityRelationship = Readonly<{
  type: string;
  phrase: string;
  target: string;
  targetText: string;
  targetCredit?: string;
  attributes?: ReadonlyArray<TestEventRelationshipAttribute>;
}>;

type TestEventUrlRelationship = Readonly<{
  url: string;
  linkTypeId: number;
  linkTypeName: string;
}>;

const HELD_AT_GID = 'a727b970-8ea0-4f75-abc8-db131f72aecb';

const TEST_EVENT_ENTITY_RELATIONSHIPS: ReadonlyArray<TestEventEntityRelationship> = [
  {
    type: '542f8484-8bc7-3ce5-a022-747850b2b928',
    phrase: 'held in',
    target: '74e50e58-5deb-4b99-93a2-decbb365c07f',
    targetText: 'New York',
  },
  {
    type: '936c7c95-3156-3889-a062-8a0cd57f8946',
    phrase: 'main performers',
    target: '64b94289-9474-4d43-8c93-918ccc1920d1',
    targetText: 'Billy Joel (lead vocals)',
    attributes: [
      {
        type: '8e2a3255-87c2-4809-a174-98cb3704f1a5',
        textValue: 'lead vocals',
      },
    ],
  },
  {
    type: 'eb39ba59-5c98-4af7-8475-02a28e235ba4',
    phrase: 'rescheduled as',
    target: '7f3e30bb-fe44-4e64-9842-ddbca1499678',
    targetText: '2018‐07‐18: Madison Square Garden',
  },
  {
    type: 'e2c6f697-07dc-38b1-be0b-83d740165532',
    phrase: 'held at',
    target: HELD_AT_GID,
    targetText: 'Madison Square Garden',
  },
  {
    type: '0c050cf9-885b-49fe-9a12-5ca04e2db8da',
    phrase: 'shot for',
    target: 'a4e33c73-f01d-4ced-8b38-c46e2cc99fc4',
    targetText: 'Your Love Keeps Lifting Me',
  },
  {
    type: '4dda6e40-14af-46bb-bb78-ea22f4a99dfa',
    phrase: 'recording location for',
    target: '268adeb7-60d1-4641-b563-b69ca14d8d83',
    targetText: 'Live Through the Years',
  },
  {
    type: 'a64a9085-505b-4588-bff9-214d7dda61c4',
    phrase: 'performance of',
    target: '6b2b947a-b4b1-381b-8daf-72b7b96db3a0',
    targetText: '12 Gardens Live',
  },
  {
    type: '707d947d-9563-328a-9a7d-0c5b9c3a9791',
    phrase: 'part of',
    target: 'f8bbc695-cfe2-4428-a416-0bbcf6384c46',
    targetText: 'Madonna at Madison Square Garden',
  },
  {
    type: '8cfc7355-186b-477b-b55d-4c20f63d0927',
    phrase: 'premieres',
    target: '834f1928-ca14-4ea0-9801-ad92cb32952e',
    targetText: '52nd Street',
  },
];

const TEST_EVENT_URL_RELATIONSHIPS: ReadonlyArray<TestEventUrlRelationship> = [
  {
    url: 'https://www.setlist.fm/setlist/billy-joel/2018/madison-square-garden-new-york-ny-13eb8185.html',
    linkTypeId: 811,
    linkTypeName: 'setlist.fm',
  },
];

export class TestEvent {
  static readonly eventName = 'event-seeder test: Full Event';
  static readonly beginDate = {
    year: '2026',
    month: '03',
    day: '10',
  };
  static readonly endDate = {
    year: '2026',
    month: '03',
    day: '12',
  };
  static readonly time = '20:00';
  static readonly setlist = '* Test Song';
  static readonly disambiguation = 'event-seeder test: disambiguation';
  static readonly heldAt = HELD_AT_GID;
  static readonly entityRelationships = TEST_EVENT_ENTITY_RELATIONSHIPS;
  static readonly urlRelationships = TEST_EVENT_URL_RELATIONSHIPS;

  private constructor(public readonly gid: string) {}

  static async create(musicbrainzPage: MusicbrainzPage) {
    const eventGid = await TestEvent.createEvent(musicbrainzPage);
    return new TestEvent(eventGid);
  }

  private static async createEvent(musicbrainzPage: MusicbrainzPage): Promise<string> {
    const existingEvent = await musicbrainzPage.page.request.get('/ws/2/event', {
      params: {
        query: `event:"${this.eventName}"`,
        fmt: 'json',
      },
    });
    const existingEventJson = (await existingEvent.json()) as EventSearchResultsT;
    if (existingEventJson?.events && existingEventJson.events.length > 0) {
      return existingEventJson.events[0]!.id;
    }

    const eventForm = new EventForm()
      .name(this.eventName)
      .typeId('Concert')
      .comment(this.disambiguation)
      .time(this.time)
      .dates({begin: this.beginDate, end: this.endDate})
      .setlist(this.setlist);

    this.entityRelationships.forEach((relationship, relationshipIndex) => {
      eventForm.relationship(relationshipIndex, relationship);
      relationship.attributes?.forEach((attribute, attributeIndex) => {
        eventForm.relationshipAttribute(relationshipIndex, attributeIndex, attribute);
      });
    });

    this.urlRelationships.forEach((relationship, relationshipIndex) => {
      eventForm.urlRelationship(relationshipIndex, relationship);
    });

    const searchParams = eventForm.build();

    await musicbrainzPage.userscriptPage.goto(`/event/create?${searchParams.toString()}`);
    const page = musicbrainzPage.page;

    await page.getByRole('textbox', {name: 'Edit note:'}).fill('test');
    await page.getByRole('button', {name: 'Enter edit'}).click();

    await expect(page).toHaveURL(new RegExp(`/event/${MBID_REGEXP.source}$`, 'i'));
    const gid = page.url().split('/event/')[1] ?? '';
    expect(gid).toMatch(MBID_REGEXP);
    return gid;
  }
}

export const test = base.extend<{
  testEvent: TestEvent;
  musicbrainzPage: MusicbrainzPage;
}>({
  testEvent: async ({musicbrainzPage}, use) => {
    const testEvent = await TestEvent.create(musicbrainzPage);
    await use(testEvent);
  },
});
