// cspell: words eventlink
import {ChildEventSummary, EventDetails, fetchEventDetails} from '#api.ts';
import classes from '#ui.module.css';
import {MBID_REGEXP} from '@repo/musicbrainz-ext/constants';
import {getEventGid} from '@repo/musicbrainz-ext/event-path';
import {seedEvent} from '@repo/musicbrainz-ext/event-seed';

const EVENT_LINK_REGEXP = new RegExp(`/event/(${MBID_REGEXP.source})`, 'i');
const GLOBAL_CONTROLS_ID = 'expand-events-global-controls';
const TOGGLE_CLASS_NAME = 'expand-events-toggle';

type ToggleController = {
  expand: () => Promise<void>;
  collapse: () => void;
  isExpanded: () => boolean;
  isVisible: () => boolean;
};

type ControllerContext = {
  detailsCache: Map<string, Promise<EventDetails | null>>;
  allControllers: Set<ToggleController>;
};

function getEventGidFromHref(href: string): string | null {
  const match = href.match(EVENT_LINK_REGEXP);
  return match?.[1] ?? null;
}

function insertAfter(newNode: Node, referenceNode: Node) {
  const parent = referenceNode.parentNode;
  if (!parent) {
    return;
  }

  if (referenceNode.nextSibling) {
    parent.insertBefore(newNode, referenceNode.nextSibling);
  } else {
    parent.appendChild(newNode);
  }
}

function createAddSubEventLink(details: EventDetails): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = seedEvent(details.seedData);
  link.textContent = 'add sub-event';
  return link;
}

function createLink(href: string, text: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  return link;
}

/**
 * Returns the DOM node after which the details wrapper should be inserted for
 * inline (non-table) layouts. Starts from the closest `.eventlink` container or
 * the link itself, then walks forward through siblings — stopping at the first
 * `<br>` found (so insertion stays on the same visual line), or falling back to
 * the last sibling.
 */
function getInlineInsertionAnchor(link: HTMLAnchorElement): Node {
  const lineContainer = link.closest('.eventlink');
  const base = lineContainer ?? link;

  let lastNode: Node = base;
  let current: ChildNode | null = base.nextSibling;

  while (current) {
    lastNode = current;
    if (current instanceof HTMLBRElement) {
      return current;
    }
    current = current.nextSibling;
  }

  return lastNode;
}

function createTextCell(text: string) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function createOptionalTextCell(text: string | undefined) {
  return createTextCell(text ?? '');
}

function formatDateRange(beginDate?: string, endDate?: string): string {
  if (beginDate && endDate) {
    return beginDate === endDate ? beginDate : `${beginDate} → ${endDate}`;
  }

  return beginDate || endDate || '';
}

function createIndentedTable() {
  const table = document.createElement('table');
  table.className = `tbl ${classes.detailsTable}`;
  return table;
}

function createQuickLinksRow(details: EventDetails, context: ControllerContext, columnCount: number) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columnCount;
  cell.className = classes.quickLinksCell!;
  cell.dataset.expandEventsQuickLinksFor = details.gid;

  const links = [
    createLink(`/event/${details.gid}/edit`, 'edit'),
    createLink(`/event/${details.gid}/edits`, 'editing history'),
    createLink(`/event/${details.gid}/event-art`, 'add event art'),
  ];

  if (document.getElementById('add-sub-event-link')) {
    links.push(createAddSubEventLink(details));
  }

  links.forEach((link, index) => {
    cell.appendChild(link);
    if (index < links.length - 1) {
      cell.appendChild(document.createTextNode(' | '));
    }
  });

  row.appendChild(cell);
  return row;
}

class EventToggle implements ToggleController {
  private readonly button: HTMLButtonElement;
  private readonly detailsHost: HTMLElement;
  private readonly detailsContainer: HTMLElement;
  private readonly ancestorPath: Set<string>;
  private readonly context: ControllerContext;
  private readonly eventGid: string;
  private expanded = false;
  private rendered = false;
  private childControllers: ToggleController[] = [];

  constructor(params: {
    eventGid: string;
    link: HTMLAnchorElement;
    context: ControllerContext;
    ancestorPath: Set<string>;
  }) {
    this.eventGid = params.eventGid;
    this.context = params.context;
    this.ancestorPath = params.ancestorPath;

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = `${TOGGLE_CLASS_NAME} ${classes.toggleButton}`;
    this.button.dataset.eventGid = this.eventGid;
    this.button.textContent = '▸';
    this.button.setAttribute('aria-label', `Expand event ${this.eventGid}`);

    this.detailsContainer = document.createElement('div');
    this.detailsContainer.dataset.expandEventsDetailsFor = this.eventGid;

    const hostRow = params.link.closest('tr');
    const eventLinkCountInRow = hostRow ? hostRow.querySelectorAll('a[href*="/event/"]').length : 0;
    const useRowHost = Boolean(hostRow?.parentElement) && eventLinkCountInRow <= 1;

    if (useRowHost && hostRow) {
      const detailsRow = document.createElement('tr');
      detailsRow.dataset.expandEventsRowFor = this.eventGid;
      const detailsCell = document.createElement('td');
      detailsCell.colSpan = hostRow.children.length || 1;
      detailsCell.className = classes.detailsCell!;
      detailsCell.appendChild(this.detailsContainer);
      detailsRow.appendChild(detailsCell);
      detailsRow.hidden = true;
      insertAfter(detailsRow, hostRow);
      this.detailsHost = detailsRow;
    } else {
      const insertionAnchor = getInlineInsertionAnchor(params.link);
      const detailsWrapper = document.createElement('div');
      detailsWrapper.hidden = true;
      detailsWrapper.dataset.expandEventsRowFor = this.eventGid;
      detailsWrapper.className = classes.detailsWrapper!;
      detailsWrapper.appendChild(this.detailsContainer);
      insertAfter(detailsWrapper, insertionAnchor);
      this.detailsHost = detailsWrapper;
    }

    params.link.before(this.button);

    this.button.addEventListener('click', () => {
      if (this.expanded) {
        this.collapse();
      } else {
        void this.expand();
      }
    });
  }

  isExpanded() {
    return this.expanded;
  }

  isVisible() {
    return this.button.isConnected && this.button.offsetParent !== null;
  }

  async expand() {
    if (this.expanded) {
      return;
    }

    this.expanded = true;
    this.button.textContent = '▾';
    this.button.setAttribute('aria-label', `Collapse event ${this.eventGid}`);
    this.detailsHost.hidden = false;

    if (!this.rendered) {
      const details = await this.fetchDetails();
      this.render(details);
      this.rendered = true;
    }
  }

  collapse() {
    if (!this.expanded) {
      return;
    }

    this.expanded = false;
    this.button.textContent = '▸';
    this.button.setAttribute('aria-label', `Expand event ${this.eventGid}`);
    this.detailsHost.hidden = true;

    for (const childController of this.childControllers) {
      childController.collapse();
    }
  }

  private async fetchDetails(): Promise<EventDetails | null> {
    const existing = this.context.detailsCache.get(this.eventGid);
    if (existing) {
      return await existing;
    }

    const request = fetchEventDetails(this.eventGid);
    this.context.detailsCache.set(this.eventGid, request);
    return await request;
  }

  private render(details: EventDetails | null) {
    this.detailsContainer.replaceChildren();

    if (this.ancestorPath.has(this.eventGid)) {
      const cycle = document.createElement('p');
      cycle.textContent = 'Cycle detected in event hierarchy. Nested expansion is skipped.';
      this.detailsContainer.appendChild(cycle);
      return;
    }

    if (!details) {
      const errorTable = createIndentedTable();
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.className = classes.errorCell!;
      cell.textContent = 'Failed to load event details.';
      row.appendChild(cell);
      errorTable.appendChild(row);
      this.detailsContainer.appendChild(errorTable);
      return;
    }

    this.detailsContainer.appendChild(this.renderExpandedTable(details));
  }

  private renderExpandedTable(details: EventDetails): HTMLElement {
    const table = createIndentedTable();

    if (details.childEvents.length > 0) {
      this.appendChildRows(table, details.childEvents);
    } else {
      table.appendChild(this.renderLeafSummaryRow(details));
    }

    table.appendChild(createQuickLinksRow(details, this.context, 2));
    return table;
  }

  private appendChildRows(table: HTMLTableElement, childEvents: ChildEventSummary[]) {
    const childPath = new Set(this.ancestorPath);
    childPath.add(this.eventGid);

    this.childControllers = [];
    for (const childEvent of childEvents) {
      const row = document.createElement('tr');
      const titleCell = document.createElement('td');
      const link = createLink(`/event/${childEvent.gid}`, childEvent.name);
      titleCell.appendChild(link);
      row.appendChild(titleCell);
      const timeOrDate = childEvent.time || formatDateRange(childEvent.beginDate, childEvent.endDate);
      row.appendChild(createTextCell(timeOrDate));
      table.appendChild(row);

      const controller = new EventToggle({
        eventGid: childEvent.gid,
        link,
        context: this.context,
        ancestorPath: childPath,
      });
      this.childControllers.push(controller);
      this.context.allControllers.add(controller);
    }

    // Pre-fetch event details for all child events to improve responsiveness
    this.prefetchChildDetails(childEvents);
  }

  private prefetchChildDetails(childEvents: ChildEventSummary[]) {
    for (const childEvent of childEvents) {
      const existing = this.context.detailsCache.get(childEvent.gid);
      if (!existing) {
        const request = fetchEventDetails(childEvent.gid);
        this.context.detailsCache.set(childEvent.gid, request);
      }
    }
  }

  private renderLeafSummaryRow(details: EventDetails) {
    const row = document.createElement('tr');
    row.appendChild(createTextCell(details.places.join(', ')));
    row.appendChild(createOptionalTextCell(details.type));
    return row;
  }
}

function findTopLevelChildLinks(currentEventGid: string, childEventIds: Set<string>): HTMLAnchorElement[] {
  const content = document.getElementById('content');
  if (!content) {
    return [];
  }

  const links = Array.from(content.querySelectorAll<HTMLAnchorElement>('a[href*="/event/"]'));
  return links.filter(link => {
    const gid = getEventGidFromHref(link.href);
    if (!gid || gid === currentEventGid || !childEventIds.has(gid)) {
      return false;
    }

    return !link.dataset.expandEventsInitialized;
  });
}

async function expandAll(controllers: Set<ToggleController>) {
  let expandedInPass = true;
  while (expandedInPass) {
    expandedInPass = false;

    for (const controller of Array.from(controllers)) {
      if (controller.isExpanded() || !controller.isVisible()) {
        continue;
      }

      await controller.expand();
      expandedInPass = true;
    }
  }
}

function collapseAll(controllers: Set<ToggleController>) {
  for (const controller of Array.from(controllers).reverse()) {
    controller.collapse();
  }
}

function injectGlobalControls(anchor: Element, controllers: Set<ToggleController>) {
  if (document.getElementById(GLOBAL_CONTROLS_ID)) {
    return;
  }

  const container = document.createElement('div');
  container.id = GLOBAL_CONTROLS_ID;

  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.textContent = 'Expand all';
  expandButton.addEventListener('click', () => {
    void expandAll(controllers);
  });

  const collapseButton = document.createElement('button');
  collapseButton.type = 'button';
  collapseButton.textContent = 'Collapse all';
  collapseButton.addEventListener('click', () => {
    collapseAll(controllers);
  });

  container.appendChild(expandButton);
  container.appendChild(document.createTextNode(' '));
  container.appendChild(collapseButton);

  const table = anchor.closest('table');
  if (table?.parentNode) {
    table.parentNode.insertBefore(container, table);
    return;
  }

  anchor.parentNode?.insertBefore(container, anchor);
}

export async function initializeExpandEvents() {
  const currentEventGid = getEventGid();
  if (!currentEventGid) {
    return;
  }

  const currentEventDetails = await fetchEventDetails(currentEventGid);
  if (!currentEventDetails) {
    return;
  }

  const childEventIds = new Set(currentEventDetails.childEvents.map(child => child.gid));
  if (childEventIds.size === 0) {
    return;
  }

  const targetLinks = findTopLevelChildLinks(currentEventGid, childEventIds);
  if (targetLinks.length === 0) {
    return;
  }

  const context: ControllerContext = {
    detailsCache: new Map<string, Promise<EventDetails | null>>(),
    allControllers: new Set<ToggleController>(),
  };

  for (const link of targetLinks) {
    const eventGid = getEventGidFromHref(link.href);
    if (!eventGid) {
      continue;
    }

    link.dataset.expandEventsInitialized = 'true';
    const controller = new EventToggle({
      eventGid,
      link,
      context,
      ancestorPath: new Set([currentEventGid]),
    });
    context.allControllers.add(controller);
  }

  const firstTargetLink = targetLinks[0];
  if (!firstTargetLink) {
    return;
  }

  injectGlobalControls(firstTargetLink, context.allControllers);
}
