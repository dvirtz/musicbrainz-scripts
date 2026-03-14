export interface MBEvent {
  id: string;
  gid?: string;
  name: string;
  type?: string;
  'type-id'?: string;
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
    place?: {
      id?: string;
      gid?: string;
      name?: string;
      disambiguation?: string;
    };
    event?: {
      id?: string;
      name?: string;
      type?: string;
      'type-id'?: string;
    };
  }>;
}

export interface MBPlace {
  id: string;
  gid: string;
  name: string;
  disambiguation?: string;
  creditName?: string;
}

export interface DateParts {
  year: string;
  month: string;
  day: string;
  dayNumber: number;
}
