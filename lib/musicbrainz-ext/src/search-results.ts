import {NonUrlRelatableEntityTypeT} from 'typedbrainz/types';

type CommonSearchResultsT = Readonly<{
  count: number;
}>;

export type ArtistSearchResultsT = CommonSearchResultsT & {
  artists: ReadonlyArray<{
    id: string;
    name: string;
    aliases: ReadonlyArray<{name: string}>;
  }>;
};

export type UrlRelsSearchResultsT<K extends NonUrlRelatableEntityTypeT> = {
  relations: ReadonlyArray<{
    [key in K]: {
      id: string;
    };
  }>;
};

export type IswcLookupResultsT = Readonly<{
  'work-count': number;
  works: ReadonlyArray<{
    id: string;
  }>;
}>;

export type WorkLookupResultT = Readonly<{
  id: string;
  attributes: ReadonlyArray<{
    type: string;
    value: string;
  }>;
}>;

export type WorkSearchResultsT = CommonSearchResultsT & {
  works: ReadonlyArray<{
    id: string;
  }>;
};
