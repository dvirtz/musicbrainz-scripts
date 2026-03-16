import {test} from '#tests/fixtures/test-festival-event.ts';
import {expect, type Page, type Request} from '@playwright/test';
import {
  EDIT_RELATIONSHIP_CREATE,
  EVENT_PART_OF_RELATIONSHIP_TYPE_ID as PART_OF_RELATIONSHIP_TYPE_ID,
} from '@repo/musicbrainz-ext/constants';

type CreatedEvent = {name: string; placeId: string | null; placeCreditName: string | null};

const TEST_FESTIVAL_NAME = 'scaffold-festival-days test: Test Festival';
const TEST_PLACE_NAMES = ['scaffold-festival-days test: Place 1', 'scaffold-festival-days test: Place 2'] as const;

type RelationshipEdit = {
  child: string;
  parent: string;
  linkTypeID: number;
};

type ScaffoldRouteState = {
  createdEvents: CreatedEvent[];
  relationships: RelationshipEdit[];
  eventIdsByName: Map<string, string>;
  eventNamesById: Map<string, string>;
};

type TestEventDate = {year: string; month: string; day: string};

function makeFakeGid(counter: number) {
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

async function confirmScaffoldCreation(page: Page, expectsDialog: boolean = true) {
  const scaffoldButton = page.getByRole('button', {name: /create.*festival.*(day|place)/i});
  await scaffoldButton.click();
  if (!expectsDialog) {
    return;
  }

  await expect(page.getByText(/accepting this action will create new event entities/i)).toBeAttached();
  await page.getByRole('button', {name: /confirm and create/i}).click();
}

async function setupScaffoldRoutes(params: {
  page: Pick<Page, 'route'>;
  userscriptPage: {postDataJSON: (request: Request) => Promise<Record<string, unknown>>};
  testFestivalEvent: {
    gid: string;
    getName: () => string;
    getBeginDate: () => {year: string; month: string; day: string};
    getEndDate: () => {year: string; month: string; day: string};
  };
  testPlaces: {getAll: () => string[]};
  exposedPlaces?: Array<{id: string; name: string}>;
  eventType?: string;
  beginDate?: TestEventDate;
  endDate?: TestEventDate;
  relations?: Array<Record<string, unknown>>;
}): Promise<ScaffoldRouteState> {
  const {page, userscriptPage, testFestivalEvent, testPlaces, exposedPlaces, eventType, beginDate, endDate, relations} =
    params;
  const createdEvents: CreatedEvent[] = [];
  const relationships: RelationshipEdit[] = [];
  const eventIdsByName = new Map<string, string>();
  const eventNamesById = new Map<string, string>();
  let gidCounter = 1;

  const formatDate = (date: {year: string; month: string; day: string}) => `${date.year}-${date.month}-${date.day}`;
  const resolvedBeginDate = beginDate ?? testFestivalEvent.getBeginDate();
  const resolvedEndDate = endDate ?? testFestivalEvent.getEndDate();
  const formattedBeginDate = formatDate(resolvedBeginDate);
  const formattedEndDate = formatDate(resolvedEndDate);

  const places =
    exposedPlaces ??
    testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));

  const defaultRelations = places.map(place => ({
    'target-type': 'place',
    place: {
      id: place.id,
      gid: place.id,
      name: place.name,
    },
  }));

  await page.route(`**/ws/2/event/${testFestivalEvent.gid}?*`, async route => {
    await route.fulfill({
      json: {
        id: testFestivalEvent.gid,
        gid: testFestivalEvent.gid,
        name: testFestivalEvent.getName(),
        type: eventType ?? 'Festival',
        'life-span': {
          begin: formattedBeginDate,
          end: formattedEndDate,
        },
        relations: relations ?? defaultRelations,
      },
    });
  });

  await page.route('**/event/create', async (route, request) => {
    const postData = await userscriptPage.postDataJSON(request);
    const name = String(postData['edit-event.name'] ?? '');
    const gid = makeFakeGid(gidCounter);
    gidCounter += 1;

    createdEvents.push({name, placeId: null, placeCreditName: null});
    eventIdsByName.set(name, gid);
    eventNamesById.set(gid, name);

    await route.fulfill({json: {mbid: gid}});
  });

  await page.route('**/ws/js/edit/create', async (route, request) => {
    const postData = await userscriptPage.postDataJSON(request);
    const edits = (postData['edits'] ?? []) as Array<{
      edit_type?: number;
      linkTypeID?: number;
      entities?: Array<{gid?: string; entityType?: string}>;
      entity1_credit?: string;
    }>;

    for (const edit of edits) {
      if (edit.edit_type !== EDIT_RELATIONSHIP_CREATE) {
        continue;
      }

      const entities = edit.entities ?? [];
      const first = entities[0];
      const second = entities[1];
      if (!first?.gid || !second?.gid || !edit.linkTypeID) {
        continue;
      }

      if (edit.linkTypeID === PART_OF_RELATIONSHIP_TYPE_ID) {
        relationships.push({
          child: second.gid,
          parent: first.gid,
          linkTypeID: edit.linkTypeID,
        });
        continue;
      }

      if (first.entityType === 'event' && second.entityType === 'place') {
        const eventName = eventNamesById.get(first.gid);
        if (!eventName) {
          continue;
        }

        const createdEvent = createdEvents.find(event => event.name === eventName);
        if (createdEvent) {
          createdEvent.placeId = second.gid;
          createdEvent.placeCreditName = edit.entity1_credit ?? null;
        }
      }
    }

    await route.fulfill({json: {edits: []}});
  });

  return {createdEvents, relationships, eventIdsByName, eventNamesById};
}

test.describe('scaffold festival days', () => {
  test('shows place selection UI on festival event page', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Userscript should show a button to create festival days
    const scaffoldButton = page.getByRole('button', {name: /create.*festival.*day/i});
    await expect(scaffoldButton).toBeAttached();

    await page.unrouteAll();
  });

  test('shows the UI for a single-day festival event', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('button', {name: /create.*festival.*place/i})).toBeAttached();
    await expect(
      page.getByText('Select places to create direct per-place sub-events for this single-day festival.')
    ).toBeAttached();
    await expect(page.getByLabel('Day word:')).toHaveCount(0);

    await page.unrouteAll();
  });

  test('does not show the UI when the festival already has sub-events', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      relations: [
        {
          'target-type': 'event',
          type: 'parts',
          direction: 'forward',
          target: {
            id: makeFakeGid(999),
          },
        },
      ],
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('button', {name: /create.*festival.*day/i})).toHaveCount(0);

    await page.unrouteAll();
  });

  test('does not show the UI for non-festival events', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      eventType: 'Concert',
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('button', {name: /create.*festival.*day/i})).toHaveCount(0);

    await page.unrouteAll();
  });

  test('displays place selection checkboxes', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Verify places are available for selection (checkboxes are visible immediately)
    for (const place of TEST_PLACE_NAMES) {
      const checkbox = page.getByRole('checkbox', {name: new RegExp(place, 'i')});
      await expect(checkbox).toBeAttached();
    }

    await page.unrouteAll();
  });

  test('creates day sub-events with standard naming', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Select all places
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // Click the scaffold button
    await confirmScaffoldCreation(page);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const festivalName = TEST_FESTIVAL_NAME;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const expectedDayNames = testFestivalEvent.getDates().map((_, index) => `${festivalName}, Day ${index + 1}`);

    expect(dayEvents).toHaveLength(expectedDayNames.length);
    expect(dayEvents.map(event => event.name)).toEqual(expectedDayNames);

    await page.unrouteAll();
  });

  test('creates venue sub-events under each day', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Select all places
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await confirmScaffoldCreation(page);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const festivalName = TEST_FESTIVAL_NAME;
    const dayCount = testFestivalEvent.getDates().length;
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(venueEvents).toHaveLength(dayCount * places.length);

    for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
      for (const place of places) {
        const expectedName = `${festivalName}, Day ${dayNumber}: ${place.name}`;
        const match = venueEvents.find(event => event.name === expectedName && event.placeId === place.id);
        expect(match).toBeDefined();
      }
    }

    await page.unrouteAll();
  });

  test('links sub-events with part-of relationships', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await confirmScaffoldCreation(page);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const festivalName = TEST_FESTIVAL_NAME;
    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const dayCount = testFestivalEvent.getDates().length;
    const expectedFestivalParentId = testFestivalEvent.gid;

    for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
      const dayName = `${festivalName}, Day ${dayNumber}`;
      const dayId = routeState.eventIdsByName.get(dayName) ?? '';
      const hasFestivalLink = routeState.relationships.some(
        rel =>
          rel.child === dayId &&
          rel.parent === expectedFestivalParentId &&
          rel.linkTypeID === PART_OF_RELATIONSHIP_TYPE_ID
      );
      expect(hasFestivalLink).toBe(true);

      for (const place of places) {
        const venueName = `${festivalName}, Day ${dayNumber}: ${place.name}`;
        const venueId = routeState.eventIdsByName.get(venueName) ?? '';
        const hasDayLink = routeState.relationships.some(
          rel => rel.child === venueId && rel.parent === dayId && rel.linkTypeID === PART_OF_RELATIONSHIP_TYPE_ID
        );
        expect(hasDayLink).toBe(true);
      }
    }

    await page.unrouteAll();
  });

  test('allows selecting subset of places', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Keep only the first place selected (all linked places are selected by default)
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 1; i < count; i++) {
      await checkboxes.nth(i).uncheck();
    }

    await confirmScaffoldCreation(page);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const selectedPlaceId = places[0]?.id ?? '';
    const dayCount = testFestivalEvent.getDates().length;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(dayEvents).toHaveLength(dayCount);
    expect(venueEvents).toHaveLength(dayCount);
    expect(venueEvents.every(event => event.placeId === selectedPlaceId)).toBe(true);

    await page.unrouteAll();
  });

  test('allows deselecting specific day/place cells in matrix', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    const scaffoldButton = page.getByRole('button', {name: /create.*festival.*day/i});
    await scaffoldButton.click();

    const dialog = page.getByRole('dialog', {name: /scaffold sub-events matrix/i});
    await expect(dialog).toBeAttached();
    const firstMatrixCell = dialog.locator('tbody tr').first().locator('td input[type="checkbox"]').first();
    await firstMatrixCell.uncheck();
    await dialog.getByRole('button', {name: /confirm and create/i}).click();

    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const festivalName = TEST_FESTIVAL_NAME;
    const dayCount = testFestivalEvent.getDates().length;
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(venueEvents).toHaveLength(dayCount * places.length - 1);

    const deselectedComboName = `${festivalName}, Day 1: ${places[0]?.name ?? ''}`;
    expect(venueEvents.some(event => event.name === deselectedComboName)).toBe(false);

    await page.unrouteAll();
  });

  test('creates day sub-events when no places are linked', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      exposedPlaces: [],
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();
    await expect(page.getByText('No linked places found. Only day sub-events will be created.')).toBeAttached();

    await confirmScaffoldCreation(page, false);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const dayCount = testFestivalEvent.getDates().length;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(dayEvents).toHaveLength(dayCount);
    expect(venueEvents).toHaveLength(0);

    await page.unrouteAll();
  });

  test('creates direct per-place sub-events for single-day festivals', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    const scaffoldButton = page.getByRole('button', {name: /create.*festival.*place/i});
    await scaffoldButton.click();
    await expect(page.getByRole('dialog', {name: /scaffold sub-events matrix/i})).toHaveCount(0);

    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);

    expect(dayEvents).toHaveLength(0);
    expect(venueEvents).toHaveLength(places.length);

    for (const place of places) {
      const expectedName = `${TEST_FESTIVAL_NAME}: ${place.name}`;
      const match = venueEvents.find(event => event.name === expectedName && event.placeId === place.id);
      expect(match).toBeDefined();
    }

    await page.unrouteAll();
  });

  test('links single-day per-place sub-events directly to the festival', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await confirmScaffoldCreation(page, false);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));

    for (const place of places) {
      const venueName = `${TEST_FESTIVAL_NAME}: ${place.name}`;
      const venueId = routeState.eventIdsByName.get(venueName) ?? '';
      const hasFestivalLink = routeState.relationships.some(
        rel =>
          rel.child === venueId &&
          rel.parent === testFestivalEvent.gid &&
          rel.linkTypeID === PART_OF_RELATIONSHIP_TYPE_ID
      );
      expect(hasFestivalLink).toBe(true);
    }

    await page.unrouteAll();
  });

  test('disables single-day creation when no places are selected', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
      exposedPlaces: [],
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();
    await expect(
      page.getByText('No linked places found. Add or select at least one place to create per-place sub-events.')
    ).toBeAttached();
    await expect(page.getByRole('button', {name: /create.*festival.*place/i})).toBeDisabled();

    await page.unrouteAll();
  });

  test('uses stored day word for sub-event names', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('day-word', JSON.stringify('Jour'));
    });

    const routeState = await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await confirmScaffoldCreation(page);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const festivalName = TEST_FESTIVAL_NAME;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const expectedDayNames = testFestivalEvent.getDates().map((_, index) => `${festivalName}, Jour ${index + 1}`);

    expect(dayEvents).toHaveLength(expectedDayNames.length);
    expect(dayEvents.map(event => event.name)).toEqual(expectedDayNames);

    await page.unrouteAll();
  });

  test('remembers selected day word', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    await setupScaffoldRoutes({page, userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await page.getByLabel('Day word:').selectOption({label: 'French (Jour)'});

    const stored = await page.evaluate(() => localStorage.getItem('day-word'));
    expect(stored).toBe(JSON.stringify('Jour'));

    await page.unrouteAll();
  });

  test('uses place credit name when creating venue sub-events for multi-day festival', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const placeIds = testPlaces.getAll();
    const placeCreditNames = ['Credit Name 1', 'Credit Name 2'] as const;
    const routeState = await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      relations: placeIds.map((id, index) => ({
        'target-type': 'place',
        'target-credit': placeCreditNames[index] ?? TEST_PLACE_NAMES[index],
        place: {
          id,
          gid: id,
          name: TEST_PLACE_NAMES[index],
        },
      })),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await confirmScaffoldCreation(page);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const dayCount = testFestivalEvent.getDates().length;
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(venueEvents).toHaveLength(dayCount * placeIds.length);

    for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
      for (let i = 0; i < placeIds.length; i++) {
        const creditName = placeCreditNames[i]!;
        const placeId = placeIds[i]!;
        const expectedName = `${TEST_FESTIVAL_NAME}, Day ${dayNumber}: ${creditName}`;
        const match = venueEvents.find(event => event.name === expectedName && event.placeId === placeId);
        expect(match).toBeDefined();
        expect(match?.placeCreditName).toBe(creditName);
      }
    }

    await page.unrouteAll();
  });

  test('uses place credit name when creating per-place sub-events for single-day festival', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const placeIds = testPlaces.getAll();
    const placeCreditNames = ['Credit Name 1', 'Credit Name 2'] as const;
    const routeState = await setupScaffoldRoutes({
      page,
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
      relations: placeIds.map((id, index) => ({
        'target-type': 'place',
        'target-credit': placeCreditNames[index] ?? TEST_PLACE_NAMES[index],
        place: {
          id,
          gid: id,
          name: TEST_PLACE_NAMES[index],
        },
      })),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await confirmScaffoldCreation(page, false);
    await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached();

    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(venueEvents).toHaveLength(placeIds.length);

    for (let i = 0; i < placeIds.length; i++) {
      const creditName = placeCreditNames[i]!;
      const placeId = placeIds[i]!;
      const expectedName = `${TEST_FESTIVAL_NAME}: ${creditName}`;
      const match = venueEvents.find(event => event.name === expectedName && event.placeId === placeId);
      expect(match).toBeDefined();
      expect(match?.placeCreditName).toBe(creditName);
    }

    await page.unrouteAll();
  });
});
