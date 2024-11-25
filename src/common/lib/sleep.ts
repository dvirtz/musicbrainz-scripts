// adapted from https://github.com/metabrainz/musicbrainz-server/blob/9ec526c22eeb89f2d4493645414cc53a04928b5c/root/static/scripts/common/utility/sleep.js

/*
 * Copyright (C) 2022 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export default function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}
