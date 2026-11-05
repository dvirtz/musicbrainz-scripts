import type {WorkBean} from '#acum.ts';
import {Warning} from '#warning.ts';
import type {RecordingT, WorkT} from 'typedbrainz/types';

export type WorkWarningContext = {work: WorkT; track: WorkBean; recording?: RecordingT};

export abstract class WorkWarning extends Warning {
  constructor(public readonly context: WorkWarningContext) {
    super();
  }
}
