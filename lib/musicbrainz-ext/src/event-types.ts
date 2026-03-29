type MBRelatedEntity = {
  id?: string;
  name?: string;
  disambiguation?: string;
};

export interface MBEvent {
  id: string;
  gid?: string;
  name: string;
  type?: string;
  'type-id'?: string;
  time?: string;
  setlist?: string;
  disambiguation?: string;
  cancelled?: boolean;
  'life-span'?: {
    begin?: string;
    end?: string;
  };
  relations?: ReadonlyArray<{
    type?: string;
    'type-id'?: string;
    direction?: string;
    begin?: string | null;
    end?: string | null;
    ended?: boolean;
    attributes?: string[];
    'attribute-ids'?: Record<string, string>;
    'attribute-values'?: Record<string, string>;
    'source-credit'?: string;
    'target-credit'?: string;
    'target-type'?: string;
    area?: MBRelatedEntity;
    artist?: MBRelatedEntity;
    event?: {
      id?: string;
      gid?: string;
      name?: string;
      type?: string;
      'type-id'?: string;
      time?: string;
      'life-span'?: {
        begin?: string;
        end?: string;
      };
    };
    label?: MBRelatedEntity;
    place?: MBRelatedEntity;
    recording?: MBRelatedEntity;
    release?: MBRelatedEntity;
    release_group?: MBRelatedEntity;
    series?: MBRelatedEntity;
    url?: {
      id?: string;
      resource?: string;
    };
    work?: MBRelatedEntity;
  }>;
}
