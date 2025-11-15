import {executePipeline} from '#execute-pipeline.ts';
import domMutations from 'dom-mutations';
import {filter, first, from, mergeMap, Observable} from 'rxjs';

export function newElements<T extends Node>(
  filterPredicate: (t: Node) => t is T,
  options?: MutationObserverInit
): Observable<T> {
  return from(domMutations(document.body, options)).pipe(
    mergeMap((m: MutationRecord) => from(Array.from(m.addedNodes))),
    filter(filterPredicate)
  );
}

export async function waitForElement<T extends Node>(
  condition: (t: Node) => t is T,
  options?: MutationObserverInit
): Promise<T | undefined> {
  return await executePipeline(newElements<T>(condition, options).pipe(first()));
}
