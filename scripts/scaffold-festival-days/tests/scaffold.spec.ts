import {test} from '#tests/fixtures/test-festival-event.ts';
import {MBEvent} from '#types.ts';
import {expect, type Page} from '@playwright/test';
import {EVENT_HELD_AT_RELATIONSHIP_TYPE_ID, EVENT_PART_OF_RELATIONSHIP_TYPE_ID} from '@repo/musicbrainz-ext/constants';
import {UserscriptPage} from '@repo/test-support/userscript-page';

type CreatedEvent = {name: string; placeId: string | null; placeCreditName: string | null; parentId: string | null};

const TEST_FESTIVAL_NAME = 'scaffold-festival-days test: Test Festival';
const TEST_PLACE_NAMES = ['scaffold-festival-days test: Place 1', 'scaffold-festival-days test: Place 2'] as const;

type ScaffoldRouteState = {
  createdEvents: CreatedEvent[];
  eventIdsByName: Map<string, string>;
  eventNamesById: Map<string, string>;
  createEventEditNotes: string[];
  syncCreatedEventsFromWindowOpenLog: () => void;
  unroute: () => Promise<void>;
};

type TestEventDate = {year: string; month: string; day: string};

function makeFakeGid(counter: number) {
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

const HELD_AT_GID = 'e2c6f697-07dc-38b1-be0b-83d740165532';
const EVENT_PART_OF_GID = '65742183-b25c-469e-b094-ff6739e6699c';
const PLACE_PART_OF_GID = 'ff683f48-eff1-40ab-a58f-b128098ffe92';

async function confirmScaffoldAction(
  page: Page,
  options: {
    seedOnly?: boolean;
  } = {}
) {
  const {seedOnly = false} = options;
  const scaffoldButton = page.getByRole('button', {name: /create.*festival.*(day|place)/i});
  await scaffoldButton.click();

  await expect(page.getByText(/accepting this action will create new event entities/i)).toBeAttached();
  await page.getByRole('button', {name: seedOnly ? /confirm and seed/i : /confirm and create/i}).click();
}

async function expectScaffoldComplete(page: Page) {
  await expect(page.getByText('Festival days scaffolding complete!')).toBeAttached({timeout: 30000});
}

async function setupScaffoldRoutes(params: {
  userscriptPage: UserscriptPage;
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
  relations?: MBEvent['relations'];
  placeChildRelationsById?: Record<string, Array<{id: string; name: string}>>;
}): Promise<ScaffoldRouteState> {
  const {
    userscriptPage,
    testFestivalEvent,
    testPlaces,
    exposedPlaces,
    eventType,
    beginDate,
    endDate,
    relations,
    placeChildRelationsById,
  } = params;
  const createdEvents: CreatedEvent[] = [];
  const eventIdsByName = new Map<string, string>();
  const eventNamesById = new Map<string, string>();
  const createEventEditNotes: string[] = [];
  let gidCounter = 1;

  const recordCreatedEvent = (postData: {[k: string]: unknown}): null | string => {
    const name = String(postData['edit-event.name']);

    createEventEditNotes.push(String(postData['edit-event.edit_note'] ?? ''));
    const gid = makeFakeGid(gidCounter);
    gidCounter += 1;

    const partOfRelIndex = Object.entries(postData)
      .find(([key, value]) => key.match(/rels\.\d+\.type/) && value === `${EVENT_PART_OF_RELATIONSHIP_TYPE_ID}`)?.[0]
      ?.replace(/rels\.(\d+)\.type/, '$1');
    const parentId = partOfRelIndex ? String(postData[`rels.${partOfRelIndex}.target`] ?? '') || null : null;

    const placeRelIndex = Object.entries(postData)
      .find(([key, value]) => key.match(/rels\.\d+\.type/) && value === `${EVENT_HELD_AT_RELATIONSHIP_TYPE_ID}`)?.[0]
      ?.replace(/rels\.(\d+)\.type/, '$1');

    if (placeRelIndex) {
      createdEvents.push({
        name,
        placeId: String(postData[`rels.${placeRelIndex}.target`]),
        placeCreditName: String(postData[`rels.${placeRelIndex}.target_credit`]),
        parentId,
      });
    } else {
      createdEvents.push({name, placeId: null, placeCreditName: null, parentId});
    }

    eventIdsByName.set(name, gid);
    eventNamesById.set(gid, name);
    return gid;
  };

  const syncCreatedEventsFromWindowOpenLog = () => {
    for (const openedUrl of userscriptPage.windowOpenLog) {
      if (openedUrl.pathname !== '/event/create') {
        continue;
      }

      const postData = Object.fromEntries(openedUrl.searchParams.entries()) as {[k: string]: unknown};
      recordCreatedEvent(postData);
    }
  };

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
    'type-id': HELD_AT_GID,
    place: {
      id: place.id,
      name: place.name,
    },
  }));

  const unrouteEvent = await userscriptPage.route(`**/ws/2/event/${testFestivalEvent.gid}?*`, async route => {
    await route.fulfill({
      json: {
        id: testFestivalEvent.gid,
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

  const unrouteEventCreate = await userscriptPage.route('**/event/create', async (route, request) => {
    const postData = await userscriptPage.postDataJSON(request);
    const gid = recordCreatedEvent(postData) ?? makeFakeGid(gidCounter);

    await route.fulfill({json: {mbid: gid}});
  });

  const unroutePlaceLookup = await userscriptPage.route('**/ws/2/place/*?*', async route => {
    const requestUrl = new URL(route.request().url());
    const pathMatch = requestUrl.pathname.match(/\/ws\/2\/place\/([0-9a-f-]{36})/i);
    const placeId = pathMatch?.[1];

    if (!placeId) {
      await route.fulfill({json: {}});
      return;
    }

    const knownPlaces = [...places, ...Object.values(placeChildRelationsById ?? {}).flat()];
    const place = knownPlaces.find(candidate => candidate.id === placeId);

    const childRelations = placeChildRelationsById?.[placeId] ?? [];
    const relationsPayload = childRelations.map(child => ({
      'target-type': 'place',
      'type-id': PLACE_PART_OF_GID,
      type: 'contains',
      direction: 'forward',
      place: {
        id: child.id,
        gid: child.id,
        name: child.name,
      },
    }));

    await route.fulfill({
      json: {
        id: placeId,
        gid: placeId,
        name: place?.name ?? `Place ${placeId.slice(0, 8)}`,
        relations: relationsPayload,
      },
    });
  });

  const unrouteEditCreate = await userscriptPage.rejectRoute('**/ws/js/edit/create');

  return {
    createdEvents,
    eventIdsByName,
    eventNamesById,
    createEventEditNotes,
    syncCreatedEventsFromWindowOpenLog,
    unroute: async () => {
      await unrouteEvent();
      await unrouteEventCreate();
      await unroutePlaceLookup();
      await unrouteEditCreate();
    },
  };
}

test.describe('scaffold festival days', () => {
  test('shows place selection UI on festival event page', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Userscript should show a button to create festival days
    const scaffoldButton = page.getByRole('button', {name: /create.*festival.*day/i});
    await expect(scaffoldButton).toBeAttached();

    await routeState.unroute();
  });

  test('shows the UI for a single-day festival event', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
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

    await routeState.unroute();
  });

  test('does not show the UI when the festival already has sub-events', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      relations: [
        {
          'target-type': 'event',
          type: 'parts',
          'type-id': EVENT_PART_OF_GID,
          direction: 'forward',
          place: {
            id: makeFakeGid(999),
            name: '',
          },
        },
      ],
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('button', {name: /create.*festival.*day/i})).toHaveCount(0);

    await routeState.unroute();
  });

  test('displays place selection checkboxes', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const parentPlaceId = testPlaces.getAll()[0] ?? '';
    const childPlaceId = makeFakeGid(777);
    const childPlaceName = 'scaffold-festival-days test: Place 1 - Room A';

    const routeState = await setupScaffoldRoutes({
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      placeChildRelationsById: {
        [parentPlaceId]: [{id: childPlaceId, name: childPlaceName}],
      },
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Verify places are available for selection (checkboxes are visible immediately)
    for (const place of [...TEST_PLACE_NAMES, childPlaceName]) {
      const checkbox = page.getByRole('checkbox', {name: place, exact: true});
      await expect(checkbox).toBeAttached();
    }

    await routeState.unroute();
  });

  for (const {testName, seedOnly} of [
    {testName: 'creates day sub-events with standard naming', seedOnly: false},
    {testName: 'creates day sub-events with standard naming (seed-only)', seedOnly: true},
  ] as const) {
    test(testName, async ({page, userscriptPage, musicbrainzPage, testFestivalEvent, testPlaces}) => {
      const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
      await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

      // Wait for the toolbox to appear
      await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

      // Select all places
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }

      if (seedOnly) {
        await confirmScaffoldAction(page, {seedOnly: true});
        await expectScaffoldComplete(page);
      } else {
        const refreshDialogPromise = page.waitForEvent('dialog');
        await confirmScaffoldAction(page);
        const refreshDialog = await refreshDialogPromise;
        expect(refreshDialog.message()).toContain('Refresh the page now');
        await refreshDialog.dismiss();
      }

      const festivalName = TEST_FESTIVAL_NAME;
      const expectedDayNames = testFestivalEvent.getDates().map((_, index) => `${festivalName}, Day ${index + 1}`);

      if (seedOnly) {
        routeState.syncCreatedEventsFromWindowOpenLog();
      }

      const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);

      expect(dayEvents).toHaveLength(expectedDayNames.length);
      expect(dayEvents.map(event => event.name)).toEqual(expectedDayNames);

      await routeState.unroute();
    });
  }

  for (const {testName, seedOnly} of [
    {testName: 'creates venue sub-events under each day', seedOnly: false},
    {testName: 'creates venue sub-events under each day (seed-only)', seedOnly: true},
  ] as const) {
    test(testName, async ({page, userscriptPage, musicbrainzPage, testFestivalEvent, testPlaces}) => {
      const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
      await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

      // Wait for the toolbox to appear
      await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

      // Select all places
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }

      await confirmScaffoldAction(page, {seedOnly});
      await expectScaffoldComplete(page);

      const places = testPlaces.getAll().map((id, index) => ({
        id,
        name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
      }));
      const festivalName = TEST_FESTIVAL_NAME;
      const dayCount = testFestivalEvent.getDates().length;

      if (seedOnly) {
        routeState.syncCreatedEventsFromWindowOpenLog();
      }

      const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);
      const expectedSeedParentId = '0';

      expect(routeState.createdEvents).toHaveLength(dayCount + dayCount * places.length);
      expect(venueEvents).toHaveLength(dayCount * places.length);

      for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
        expect(routeState.createdEvents).toContainEqual({
          name: `${festivalName}, Day ${dayNumber}`,
          placeId: null,
          placeCreditName: null,
          parentId: testFestivalEvent.gid,
        });
        for (const place of places) {
          const expectedName = `${festivalName}, Day ${dayNumber}: ${place.name}`;
          const match = venueEvents.find(event => event.name === expectedName && event.placeId === place.id);
          expect(match).toBeDefined();
          expect(match?.parentId).toBe(
            seedOnly
              ? expectedSeedParentId
              : (routeState.eventIdsByName.get(`${festivalName}, Day ${dayNumber}`) ?? null)
          );
        }
      }

      await routeState.unroute();
    });
  }

  test('links sub-events with part-of relationships', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    const festivalName = TEST_FESTIVAL_NAME;
    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const dayCount = testFestivalEvent.getDates().length;
    const expectedFestivalParentId = testFestivalEvent.gid;

    for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
      const dayName = `${festivalName}, Day ${dayNumber}`;
      const dayEvent = routeState.createdEvents.find(event => event.name === dayName);
      expect(dayEvent?.parentId).toBe(expectedFestivalParentId);
      const dayId = routeState.eventIdsByName.get(dayName) ?? '';

      for (const place of places) {
        const venueName = `${festivalName}, Day ${dayNumber}: ${place.name}`;
        const venueEvent = routeState.createdEvents.find(
          event => event.name === venueName && event.placeId === place.id
        );
        expect(venueEvent?.parentId).toBe(dayId);
      }
    }

    await routeState.unroute();
  });

  test('allows selecting subset of places', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    // Wait for the toolbox to appear
    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    // Keep only the first place selected (all linked places are selected by default)
    const place2Checkbox = page.getByRole('checkbox', {name: new RegExp(TEST_PLACE_NAMES[1], 'i')});
    await place2Checkbox.uncheck();
    await expect(place2Checkbox).not.toBeChecked();

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

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

    await routeState.unroute();
  });

  test('allows deselecting specific day/place cells in matrix', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
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

    await expectScaffoldComplete(page);

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

    await routeState.unroute();
  });

  test('skips day event when all places are deselected for that day in matrix', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
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
    // Uncheck the row header for Day 1, deselecting all places for that day
    const firstRowHeaderCheckbox = dialog.locator('tbody tr').first().locator('th input[type="checkbox"]');
    await firstRowHeaderCheckbox.uncheck();
    await dialog.getByRole('button', {name: /confirm and create/i}).click();

    await expectScaffoldComplete(page);

    const festivalName = TEST_FESTIVAL_NAME;
    const dayCount = testFestivalEvent.getDates().length;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);

    // Day 1 should be skipped; remaining days should be created
    expect(dayEvents).toHaveLength(dayCount - 1);
    expect(dayEvents.some(event => event.name === `${festivalName}, Day 1`)).toBe(false);
    for (let d = 2; d <= dayCount; d++) {
      expect(dayEvents.some(event => event.name === `${festivalName}, Day ${d}`)).toBe(true);
    }

    await routeState.unroute();
  });

  test('creates day sub-events when no places are linked', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      exposedPlaces: [],
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();
    await expect(page.getByText('No linked places found. Only day sub-events will be created.')).toBeAttached();

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    const dayCount = testFestivalEvent.getDates().length;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(dayEvents).toHaveLength(dayCount);
    expect(venueEvents).toHaveLength(0);

    await routeState.unroute();
  });

  test('creates direct per-place sub-events for single-day festivals', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    const scaffoldButton = page.getByRole('button', {name: /create.*festival.*place/i});
    await scaffoldButton.click();
    const dialog = page.getByRole('dialog', {name: /scaffold sub-events matrix/i});
    await expect(dialog).toBeAttached();
    await dialog.getByRole('button', {name: /confirm and create/i}).click();

    await expectScaffoldComplete(page);

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

    await routeState.unroute();
  });

  test('links single-day per-place sub-events directly to the festival', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    const places = testPlaces.getAll().map((id, index) => ({
      id,
      name: TEST_PLACE_NAMES[index] ?? `Test Place ${index + 1}`,
    }));
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);

    expect(dayEvents).toHaveLength(0);
    expect(venueEvents).toHaveLength(places.length);

    for (const place of places) {
      const venueName = `${TEST_FESTIVAL_NAME}: ${place.name}`;
      const venueEvent = venueEvents.find(event => event.name === venueName && event.placeId === place.id);
      expect(venueEvent?.parentId).toBe(testFestivalEvent.gid);
    }

    await routeState.unroute();
  });

  test('disables single-day creation when no places are selected', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({
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

    await routeState.unroute();
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

    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    const festivalName = TEST_FESTIVAL_NAME;
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const expectedDayNames = testFestivalEvent.getDates().map((_, index) => `${festivalName}, Jour ${index + 1}`);

    expect(dayEvents).toHaveLength(expectedDayNames.length);
    expect(dayEvents.map(event => event.name)).toEqual(expectedDayNames);

    await routeState.unroute();
  });

  test('remembers selected day word', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await page.getByLabel('Day word:').selectOption({label: 'French (Jour)'});

    const stored = await page.evaluate(() => localStorage.getItem('day-word'));
    expect(stored).toBe(JSON.stringify('Jour'));

    await routeState.unroute();
  });

  test('prepends custom edit note text to generated edit notes', async ({
    page,
    userscriptPage,
    musicbrainzPage,
    testFestivalEvent,
    testPlaces,
  }) => {
    const routeState = await setupScaffoldRoutes({userscriptPage, testFestivalEvent, testPlaces});
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await page
      .getByLabel('Edit note (optional):')
      .fill('Reviewed source schedule and linked all generated sub-events.');

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    expect(routeState.createEventEditNotes.length).toBeGreaterThan(0);

    for (const editNote of routeState.createEventEditNotes) {
      expect(editNote).toContain(
        'Reviewed source schedule and linked all generated sub-events.\n\n----\nScaffold festival days:'
      );
    }

    await routeState.unroute();
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
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      relations: placeIds.map((id, index) => ({
        'target-type': 'place',
        'type-id': HELD_AT_GID,
        'target-credit': placeCreditNames[index] ?? TEST_PLACE_NAMES[index],
        place: {
          id,
          name: TEST_PLACE_NAMES[index]!,
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

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    const dayCount = testFestivalEvent.getDates().length;
    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);
    const expectedVenueRelationshipCount = dayCount * placeIds.length;

    expect(dayEvents).toHaveLength(dayCount);
    expect(venueEvents).toHaveLength(expectedVenueRelationshipCount);

    for (let dayNumber = 1; dayNumber <= dayCount; dayNumber += 1) {
      for (let i = 0; i < placeIds.length; i++) {
        const placeCreditName = placeCreditNames[i];
        const venueName = `${TEST_FESTIVAL_NAME}, Day ${dayNumber}: ${placeCreditName}`;
        const dayId = routeState.eventIdsByName.get(`${TEST_FESTIVAL_NAME}, Day ${dayNumber}`) ?? '';

        expect(venueEvents).toContainEqual({
          name: venueName,
          placeCreditName,
          placeId: placeIds[i],
          parentId: dayId,
        });
      }
    }

    await routeState.unroute();
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
      userscriptPage,
      testFestivalEvent,
      testPlaces,
      endDate: testFestivalEvent.getBeginDate(),
      relations: placeIds.map((id, index) => ({
        'target-type': 'place',
        'type-id': HELD_AT_GID,
        'target-credit': placeCreditNames[index] ?? TEST_PLACE_NAMES[index],
        place: {
          id,
          name: TEST_PLACE_NAMES[index]!,
        },
      })),
    });
    await musicbrainzPage.userscriptPage.goto(`/event/${testFestivalEvent.gid}`);

    await expect(page.getByRole('group', {name: 'dvirtz MusicBrainz scripts'})).toBeAttached();

    await confirmScaffoldAction(page);
    await expectScaffoldComplete(page);

    const venueEvents = routeState.createdEvents.filter(event => event.placeId !== null);
    const dayEvents = routeState.createdEvents.filter(event => event.placeId === null);

    expect(dayEvents).toHaveLength(0);
    expect(venueEvents).toHaveLength(placeIds.length);

    for (let i = 0; i < placeIds.length; i++) {
      const placeCreditName = placeCreditNames[i];
      const venueName = `${TEST_FESTIVAL_NAME}: ${placeCreditName}`;

      expect(venueEvents).toContainEqual({
        name: venueName,
        placeCreditName,
        placeId: placeIds[i],
        parentId: testFestivalEvent.gid,
      });
    }

    await routeState.unroute();
  });
});
