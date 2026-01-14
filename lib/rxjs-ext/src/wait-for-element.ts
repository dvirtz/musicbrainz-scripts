import {executePipeline} from '#execute-pipeline.ts';
import domMutations from 'dom-mutations';
import {filter, first, from, mergeMap, Observable, startWith} from 'rxjs';

// Internal helper to build an element stream from mutations.
function mutationElementStream<T extends Element>(
  nodeListSelector: (m: MutationRecord) => Iterable<Node>,
  filterPredicate: (t: Element) => t is T,
  options: MutationObserverInit = {subtree: true, childList: true},
  target: Node = document.body
): Observable<T> {
  return from(domMutations(target, options)).pipe(
    mergeMap((m: MutationRecord) => nodeListSelector(m)),
    filter((node): node is Element => node instanceof Element),
    mergeMap(element => from(element.querySelectorAll('*')).pipe(startWith(element))),
    filter(filterPredicate)
  );
}

// Emits newly added elements that match the given predicate.
export function newElements<T extends Element>(
  filterPredicate: (t: Element) => t is T,
  options?: MutationObserverInit,
  target?: Node
): Observable<T> {
  return mutationElementStream<T>(m => m.addedNodes, filterPredicate, options, target);
}

// Waits for the first element that matches the given predicate.
export async function waitForElement<T extends Element>(
  condition: (t: Element) => t is T,
  options?: MutationObserverInit,
  target?: Node
): Promise<T | undefined> {
  return await executePipeline(newElements<T>(condition, options, target).pipe(first()));
}

export async function waitForAttribute(target: Node, attribute: string) {
  return await executePipeline(from(domMutations(target, {attributeFilter: [attribute]})).pipe(first()));
}
