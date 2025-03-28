import {lastValueFrom, Observable} from 'rxjs';

export async function executePipeline<T>(pipeline: Observable<T>): Promise<T | undefined> {
  return await lastValueFrom(pipeline, {defaultValue: undefined});
}
