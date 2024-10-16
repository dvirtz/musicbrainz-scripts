// adapted from https://github.com/metabrainz/musicbrainz-server/blob/de898cc4e8fede8c459c8eee67e626a72c3a6326/root/static/scripts/common/utility/buildOptionList.js

export function buildOptionList<T>(options: ReadonlyArray<OptionTreeT<T>>): OptionListT {
  const optionsByParentId: Map<number | null, Array<OptionTreeT<T>>> = Map.groupBy(
    options,
    (option: OptionTreeT<T>) => option.parent_id
  );

  const compareChildren = (a: OptionTreeT<T>, b: OptionTreeT<T>) => {
    return a.child_order - b.child_order || a.name.localeCompare(b.name);
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
          text: '\xA0'.repeat(level * 2) + option.name,
          value: option.id,
        },
        ...getOptionsByParentId(option.id, level + 1),
      ];
    });
  };

  return getOptionsByParentId(null, 0);
}
