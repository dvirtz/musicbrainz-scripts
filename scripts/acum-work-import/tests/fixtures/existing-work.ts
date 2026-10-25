import {seedAcumStorageFromUrl} from '#tests/fixtures/acum-storage.ts';
import {Locator} from '@playwright/test';
import {test as base} from '@repo/test-support/musicbrainz-test';

export const test = base.extend<{existingWork: {workId: string; importButton: Locator}}>({
  existingWork: async ({page, userscriptPage}, use) => {
    const workId = '6fec0410-692f-4ebf-9c4a-9397648dd8e2';
    const unrouteArtists = await userscriptPage.route('**/ws/2/artist?*', route =>
      route.fulfill({
        json: {count: 1, artists: [{id: 'db4624cf-0e44-481e-a9dc-2142b833ec2f', name: 'Robbie Williams'}]},
      })
    );
    const unrouteArtistEntity = await userscriptPage.route(
      '**/ws/js/entity/db4624cf-0e44-481e-a9dc-2142b833ec2f',
      route =>
        route.fulfill({
          json: {
            id: 2935,
            gid: 'db4624cf-0e44-481e-a9dc-2142b833ec2f',
            entityType: 'artist',
            name: 'Robbie Williams',
            sort_name: 'Williams, Robbie',
            comment: '',
            typeID: 1,
            typeName: 'Person',
            editsPending: false,
            ended: false,
            begin_date: {year: 1974, month: 2, day: 13},
            end_date: null,
            area: null,
          },
        })
    );
    const unrouteSearch = await userscriptPage.route('**/ws/2/work?*', route =>
      route.fulfill({json: {count: 1, works: [{id: workId}]}})
    );
    const unrouteLookup = await userscriptPage.route(`**/ws/2/work/${workId}*`, async route => {
      await route.fulfill({
        json: {
          id: workId,
          title: 'MEET THE STARS',
          attributes: [],
          relations: [{artist: {id: 'db4624cf-0e44-481e-a9dc-2142b833ec2f'}}],
        },
      });
    });
    const unrouteEntity = await userscriptPage.route(`**/ws/js/entity/${workId}`, route =>
      route.fulfill({json: {id: 123, gid: workId, name: 'MEET THE STARS', entityType: 'work'}})
    );
    await userscriptPage.goto('/work/create');
    await seedAcumStorageFromUrl(
      userscriptPage,
      'work-2661255-2661255001.json',
      'https://nocs.acum.org.il/acumsitesearchdb/version?workid=2661255&versionid=2661255001'
    );

    const unrouteWorkPage = await userscriptPage.route(`**/work/${workId}`, route =>
      route.fulfill({contentType: 'text/html', body: '<html><body><h1>MEET THE STARS</h1></body></html>'})
    );
    await use({workId, importButton: page.getByRole('button', {name: 'Import work from ACUM'})});
    await unrouteWorkPage();
    await unrouteSearch();
    await unrouteLookup();
    await unrouteEntity();
    await unrouteArtists();
    await unrouteArtistEntity();
  },
});
