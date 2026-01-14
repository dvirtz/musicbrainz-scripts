import {executePipeline} from '#execute-pipeline.ts';
import domMutations from 'dom-mutations';
import {filter, first, from, mergeMap, Observable} from 'rxjs';

// Internal helper to build an element stream from mutations.
function mutationElementStream<T extends Node>(
  nodeListSelector: (m: MutationRecord) => Iterable<Node>,
  filterPredicate: (t: Node) => t is T,
  options: MutationObserverInit = {subtree: true, childList: true},
  target: Node = document.body
): Observable<T> {
  return from(domMutations(target, options)).pipe(
    mergeMap((m: MutationRecord) => from(Array.from(nodeListSelector(m)))),
    filter(filterPredicate)
  );
}

// Emits newly added elements that match the given predicate.
export function newElements<T extends Node>(
  filterPredicate: (t: Node) => t is T,
  options?: MutationObserverInit,
  target?: Node
): Observable<T> {
  return mutationElementStream<T>(m => m.addedNodes, filterPredicate, options, target);
}

// Waits for the first element that matches the given predicate.
export async function waitForElement<T extends Node>(
  condition: (t: Node) => t is T,
  options?: MutationObserverInit,
  target?: Node
): Promise<T | undefined> {
  return await executePipeline(newElements<T>(condition, options, target).pipe(first()));
}
