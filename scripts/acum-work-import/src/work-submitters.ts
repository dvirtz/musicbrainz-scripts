import {WorkT} from 'typedbrainz/types';

export type WorkSubmitter = () => Promise<WorkT>;

const submitters = new Map<number, WorkSubmitter>();

export function registerWorkSubmitter(workId: number, submitter: WorkSubmitter) {
  submitters.set(workId, submitter);
  return () => {
    if (submitters.get(workId) === submitter) {
      submitters.delete(workId);
    }
  };
}

export function getWorkSubmitter(workId: number) {
  return submitters.get(workId);
}
