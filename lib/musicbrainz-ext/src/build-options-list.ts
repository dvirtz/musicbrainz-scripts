// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/buildOptionList.js
// and from https://github.com/metabrainz/musicbrainz-server/blob/77f247e91fe9563d6f4a1d0011ecbcbdf6c21853/root/static/scripts/edit/forms.js

/*
 * Copyright (C) 2013-2021 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export function buildOptionList<T extends OptionTreeT<unknown>>(options: ReadonlyArray<T>): OptionListT {
  return buildOptionListFromKeys(options, 'name', 'id');
}

export function buildOptionListFromKeys<
  T extends Pick<OptionTreeT<unknown>, 'parent_id' | 'child_order'> &
    Record<TextKey, string> &
    Record<ValueKey, number>,
  TextKey extends keyof T,
  ValueKey extends keyof T,
>(options: ReadonlyArray<T>, textAttr: TextKey | ((_: T) => string), valueAttr: ValueKey): OptionListT {
  const optionsByParentId: Map<number | null, Array<T>> = Map.groupBy(options, (option: T) => option.parent_id);
  const text = function (option: T): string {
    return typeof textAttr === 'function' ? textAttr(option) : option[textAttr];
  };

  const compareChildren = (a: T, b: T) => {
    return a.child_order - b.child_order || text(a).localeCompare(text(b));
  };

  const getOptionsByParentId = (parentId: number | null, level: number): OptionListT => {
    const options = optionsByParentId.get(parentId);
    if (!options) {
      return [];
    }
    options.sort(compareChildren);
    return options.flatMap(option => {
      return [
        {
          text: '\xA0'.repeat(level * 2) + text(option),
          value: option[valueAttr],
        },
        ...getOptionsByParentId(option[valueAttr], level + 1),
      ];
    });
  };

  return getOptionsByParentId(null, 0);
}
