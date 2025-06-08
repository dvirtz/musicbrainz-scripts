import {executePipeline} from '@repo/rxjs-ext/execute-pipeline';
import domMutations from 'dom-mutations';
import {filter, first, from, mergeMap} from 'rxjs';

export async function waitForElement<T extends Node>(condition: (t: Node) => t is T): Promise<T | undefined> {
  return await executePipeline(
    from(domMutations(document.body)).pipe(
      mergeMap(m => from(m.addedNodes)),
      filter(condition),
      first()
    )
  );
}
