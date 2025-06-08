import {MusicbrainzPage} from '#tests/fixtures/musicbrainz-page.ts';
import {test as base, expect, Page} from '@playwright/test';
import {EDIT_MEDIUM_CREATE, EDIT_RELEASE_CREATE, WS_EDIT_RESPONSE_OK} from '@repo/musicbrainz-ext/constants';
import {EDIT_MEDIUM_CREATE_T, EDIT_RELEASE_CREATE_T, ReleaseT, WS_EDIT_RESPONSE_OK_T} from 'typedbrainz/types';

export class TestRelease {
  // cspell:disable
  public static readonly tracks = [
    {
      'id': null,
      'name': "סע לאט ב'",
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
  // cspell:enable
  private constructor(public readonly gid: string) {}

  static async create(page: Page) {
    const musicbrainzPage = await MusicbrainzPage.create(page);
    const releaseGid = await TestRelease.createRelease(musicbrainzPage);
    await TestRelease.createMedium(musicbrainzPage, releaseGid);
    return new TestRelease(releaseGid);
  }

  static async createRelease(page: MusicbrainzPage) {
    // cspell:disable
    const response = await page.createEdit({
      'edits': [
        {
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
    // cspell:enable
    expect(response.edits).toHaveLength(1);
    const responseEdit = response.edits[0] as {
      edit_type: EDIT_RELEASE_CREATE_T;
      entity: ReleaseT;
      response: WS_EDIT_RESPONSE_OK_T;
    };
    expect(responseEdit.response).toBe(1);
    expect(responseEdit.edit_type).toBe(EDIT_RELEASE_CREATE);
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

  async editRelationships(page: MusicbrainzPage) {
    await page.goto(`/release/${this.gid}/edit-relationships`);
  }

  async deleteRelease(page: MusicbrainzPage) {
    await page.deleteEntity('release', this.gid, 'deleting test release');
  }

  tracks() {
    return TestRelease.tracks;
  }
}

export const test = base.extend<
  object,
  {
    testRelease: TestRelease;
  }
>({
  testRelease: [
    async ({browser}, use) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const testRelease = await TestRelease.create(page);
      await page.close();

      try {
        await use(testRelease);
      } finally {
        const page = await context.newPage();
        await testRelease.deleteRelease(await MusicbrainzPage.create(page));
        await page.close();
      }
    },
    {scope: 'worker'},
  ],
});
