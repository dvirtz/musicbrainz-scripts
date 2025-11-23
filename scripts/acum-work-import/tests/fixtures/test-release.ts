import {expect, Page} from '@playwright/test';
import {EDIT_MEDIUM_CREATE, EDIT_RELEASE_CREATE, WS_EDIT_RESPONSE_OK} from '@repo/musicbrainz-ext/constants';
import {ReleaseSearchResultsT} from '@repo/musicbrainz-ext/search-results';
import {MusicbrainzPage} from '@repo/test-support/musicbrainz-page';
import {test as base} from '@repo/test-support/userscript-test';
import {EDIT_MEDIUM_CREATE_T, EDIT_RELEASE_CREATE_T, ReleaseT, WS_EDIT_RESPONSE_OK_T} from 'typedbrainz/types';

export class TestRelease {
  // cspell:disable
  private static readonly name = 'acum-work-import test: יש בי אהבה';
  private static readonly tracks = [
    {
      'id': null,
      'name': 'סע לאט ב׳',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 1,
      'number': '1',
      'length': 318000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'אותך',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 2,
      'number': '2',
      'length': 228000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'יש בי אהבה',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 3,
      'number': '3',
      'length': 253000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'מיליון',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 4,
      'number': '4',
      'length': 223000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'אני מתגעגע אבא',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 5,
      'number': '5',
      'length': 210000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'בגללך',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 6,
      'number': '6',
      'length': 311000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'לבכות לך',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 7,
      'number': '7',
      'length': 248000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'כאן לבד הלילה',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 8,
      'number': '8',
      'length': 213000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'שוב',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 9,
      'number': '9',
      'length': 237000,
      'is_data_track': false,
    },
    {
      'id': null,
      'name': 'אדם האמין',
      'artist_credit': {
        'names': [
          {
            'artist': {
              'name': 'אריק איינשטיין',
              'id': 432499,
              'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
            },
            'name': 'אריק איינשטיין',
            'join_phrase': ' ו',
          },
          {
            'artist': {
              'name': 'שם טוב לוי',
              'id': 600807,
              'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
            },
            'name': 'שם-טוב לוי',
            'join_phrase': null,
          },
        ],
      },
      'recording_gid': null,
      'position': 10,
      'number': '10',
      'length': 200000,
      'is_data_track': false,
    },
  ];
  private static readonly works = [
    {
      languages: ['167'],
      language: 'heb',
      id: 'e27fb430-c92d-3b60-a640-032ef8ed8b30',
      'type-id': '17',
      disambiguation: '',
      title: 'סע לאט ב׳',
      iswcs: ['T-002.099.496-0'],
      attributes: [
        {
          type: 'ACUM ID',
          value: '1056363',
          'type-id': '141',
        },
      ],
      type: 'Song',
      lyricists: ['אריק איינשטיין'],
      composers: ['שם טוב לוי'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1056363&versionid=1056363001',
    },
    {
      disambiguation: '',
      attributes: [
        {
          type: 'ACUM ID',
          value: '1056369',
          'type-id': '141',
        },
      ],
      type: 'Song',
      title: 'אותך',
      iswcs: ['T-002.099.506-5'],
      languages: ['167'],
      id: '80dc0585-e13f-3e82-b104-0bdb66b629d0',
      language: 'heb',
      'type-id': '17',
      lyricists: ['אריק איינשטיין'],
      composers: ['שם טוב לוי'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1056369&versionid=1056369001',
    },
    {
      'type-id': '17',
      id: 'de010f9d-1727-3c41-a96a-abdcd7f644fb',
      language: 'heb',
      languages: ['167'],
      type: 'Song',
      attributes: [
        {
          type: 'ACUM ID',
          value: '1052784',
          'type-id': '141',
        },
      ],
      title: 'יש בי אהבה',
      iswcs: [
        'T-002.096.935-0',
        'T-002.096.936-1',
        'T-002.096.937-2',
        'T-931.118.944-3',
        'T-002.638.254-6',
        'T-002.638.255-7',
      ],
      disambiguation: '',
      lyricists: ['ארקדי דוכין'],
      composers: ['ארקדי דוכין'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1052784&versionid=1052784001',
    },
    {
      disambiguation: '',
      title: 'מליון',
      iswcs: ['T-002.099.498-2'],
      type: 'Song',
      attributes: [
        {
          'type-id': '141',
          type: 'ACUM ID',
          value: '1056364',
        },
      ],
      languages: ['167'],
      language: 'heb',
      id: '8d437693-20ac-4361-bb5f-4998faeda88a',
      'type-id': '17',
      lyricists: [], // lyricist does not exist in test server
      composers: ['שם טוב לוי'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1056364&versionid=1056364001',
    },
    {
      languages: ['167'],
      id: '960c1321-e1c9-3a80-8b69-0205f556855a',
      language: 'heb',
      'type-id': '17',
      disambiguation: '',
      iswcs: ['T-002.099.499-3'],
      title: 'אני מתגעגע אבא',
      attributes: [
        {
          'type-id': '141',
          value: '1056365',
          type: 'ACUM ID',
        },
      ],
      type: 'Song',
      lyricists: ['אריק איינשטיין'],
      composers: ['שם טוב לוי'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1056365&versionid=1056365001',
    },
    {
      disambiguation: '',
      title: 'בגללך',
      iswcs: ['T-002.096.946-3', 'T-002.096.947-4', 'T-002.638.256-8', 'T-002.588.603-6'],
      type: 'Song',
      attributes: [
        {
          value: '1052785',
          type: 'ACUM ID',
          'type-id': '141',
        },
      ],
      languages: ['167'],
      language: 'heb',
      id: '4290ef6a-f8a9-370b-b41a-86020039ad95',
      'type-id': '17',
      lyricists: ['מיכה שטרית'],
      composers: ['ארקדי דוכין'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1052785&versionid=1052785001',
    },
    {
      languages: ['167'],
      id: 'b9ef772e-aa54-3b98-98c1-0e46aee7011d',
      language: 'heb',
      'type-id': '17',
      disambiguation: '',
      title: 'לבכות לך',
      iswcs: [
        'T-002.095.293-5',
        'T-002.095.294-6',
        'T-002.095.295-7',
        'T-002.095.310-9',
        'T-002.095.315-4',
        'T-914.404.498-4',
      ],
      type: 'Song',
      attributes: [
        {
          type: 'ACUM ID',
          value: '1050936',
          'type-id': '141',
        },
      ],
      lyricists: ['אביב גפן'],
      composers: ['אביב גפן'],
      arrangers: ['שם טוב לוי', 'יוני רכטר'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1050936&versionid=1050936001',
    },
    {
      disambiguation: '',
      title: 'כאן לבד הלילה',
      iswcs: ['T-002.100.399-5'],
      type: 'Song',
      attributes: [
        {
          type: 'ACUM ID',
          value: '1057428',
          'type-id': '141',
        },
      ],
      languages: ['167'],
      id: '2ff2a33f-6517-347c-be5d-3f7e0b3d0e37',
      language: 'heb',
      'type-id': '17',
      lyricists: ['יצחק קלפטר'],
      composers: ['יצחק קלפטר'],
      arrangers: ['יצחק קלפטר'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1057428&versionid=1057428001',
    },
    {
      iswcs: ['T-002.099.502-1'],
      title: 'שוב',
      type: 'Song',
      attributes: [
        {
          type: 'ACUM ID',
          value: '1056367',
          'type-id': '141',
        },
      ],
      disambiguation: '',
      'type-id': '17',
      language: 'heb',
      id: 'a2aae6d9-119e-3e9f-bce2-754f4bab3cee',
      languages: ['167'],
      lyricists: ['אריק איינשטיין'],
      composers: ['שם טוב לוי'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1056367&versionid=1056367001',
    },
    {
      languages: ['167'],
      language: 'mul',
      id: '79a83020-3378-324e-abf0-995fe1608fb7',
      'type-id': '17',
      disambiguation: '',
      type: 'Song',
      attributes: [
        {
          'type-id': '141',
          value: '1056362',
          type: 'ACUM ID',
        },
      ],
      title: 'אדם האמין',
      iswcs: ['T-002.099.493-7', 'T-002.588.626-3'],
      lyricists: ['אברהם חלפי'],
      composers: ['שם טוב לוי'],
      arrangers: ['שם טוב לוי'],
      acumUrl: 'https://nocs.acum.org.il/acumsitesearchdb/version?workid=1056362&versionid=1056362001',
    },
  ];
  private static readonly acumUrl = 'https://nocs.acum.org.il/acumsitesearchdb/album?albumid=006625';

  // cspell:enable
  private constructor(public readonly gid: string) {}

  static async create(musicbrainzPage: MusicbrainzPage) {
    const releaseGid = await TestRelease.createRelease(musicbrainzPage);
    return new TestRelease(releaseGid);
  }

  static async createRelease(musicbrainzPage: MusicbrainzPage) {
    const existingRelease = await musicbrainzPage.page.request.get('/ws/2/release', {
      params: {
        query: `release:"${this.name}"`,
        fmt: 'json',
      },
    });
    const existingReleaseJson = (await existingRelease.json()) as ReleaseSearchResultsT;
    if (existingReleaseJson.releases.length > 0) {
      return existingReleaseJson.releases[0]!.id;
    }

    const response = await musicbrainzPage.createEdit({
      'edits': [
        {
          'name': this.name,
          'artist_credit': {
            // cspell:disable
            'names': [
              {
                'artist': {
                  'name': 'אריק איינשטיין',
                  'id': 432499,
                  'gid': 'd3c90d1b-f529-404b-939d-41873386d4b4',
                },
                'name': 'אריק איינשטיין',
                'join_phrase': ' ו',
              },
              {
                'artist': {
                  'name': 'שם טוב לוי',
                  'id': 600807,
                  'gid': '20d1949e-ee90-44ed-a26a-05a4d441bbaa',
                },
                'name': 'שם-טוב לוי',
                'join_phrase': null,
              },
            ],
          },
          // cspell:enable
          'release_group_id': 806165,
          'comment': '',
          'language_id': null,
          'packaging_id': null,
          'script_id': null,
          'status_id': null,
          'edit_type': 31,
        },
      ],
      'makeVotable': false,
      'editNote': 'test',
    });
    expect(response.edits).toHaveLength(1);
    const responseEdit = response.edits[0] as {
      edit_type: EDIT_RELEASE_CREATE_T;
      entity: ReleaseT;
      response: WS_EDIT_RESPONSE_OK_T;
    };
    expect(responseEdit.response).toBe(1);
    expect(responseEdit.edit_type).toBe(EDIT_RELEASE_CREATE);
    await TestRelease.createMedium(musicbrainzPage, responseEdit.entity.gid);
    return responseEdit.entity.gid;
  }

  static async createMedium(page: MusicbrainzPage, releaseGid: string) {
    // cspell:disable
    const response = await page.createEdit({
      'edits': [
        {
          'name': '',
          'format_id': 1,
          'position': 1,
          'tracklist': TestRelease.tracks,
          'release': releaseGid,
          'edit_type': 51,
        },
      ],
      'makeVotable': false,
      'editNote': 'test',
    });
    // cspell:enable
    expect(response.edits).toHaveLength(1);
    const responseEdit = response.edits[0] as {
      edit_type: EDIT_MEDIUM_CREATE_T;
      entity: {id: number; position: number};
      response: WS_EDIT_RESPONSE_OK_T;
    };
    expect(responseEdit.response).toBe(WS_EDIT_RESPONSE_OK);
    expect(responseEdit.edit_type).toBe(EDIT_MEDIUM_CREATE);
  }

  async editRelationships(musicbrainzPage: MusicbrainzPage) {
    await musicbrainzPage.userscriptPage.goto(`/release/${this.gid}/edit-relationships`);
  }

  async deleteRelease(musicbrainzPage: MusicbrainzPage) {
    await musicbrainzPage.deleteEntity('release', this.gid, 'deleting test release');
  }

  acumUrl() {
    return TestRelease.acumUrl;
  }

  tracks() {
    return TestRelease.tracks;
  }

  work(title: string) {
    return TestRelease.works.find(work => work.title === title);
  }

  works() {
    return TestRelease.works;
  }

  async importAlbum(page: Page) {
    const importButton = page.getByRole('button', {name: 'Import works from ACUM'});

    await importButton.click();
    await expect(importButton).toBeDisabled();

    // wait for import to finish
    await expect(importButton).toBeEnabled();
  }
}

export const test = base.extend<{
  testRelease: TestRelease;
  musicbrainzPage: MusicbrainzPage;
}>({
  testRelease: async ({musicbrainzPage}, use) => {
    const testRelease = await TestRelease.create(musicbrainzPage);

    await use(testRelease);
  },
});
