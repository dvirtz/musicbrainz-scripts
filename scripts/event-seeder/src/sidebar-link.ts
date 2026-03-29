const ADD_SUB_EVENT_LINK_ID = 'add-sub-event-link';
const DUPLICATE_EVENT_LINK_ID = 'duplicate-event-link';

function createListItem(documentRef: Document, id: string, href: string, text: string): HTMLLIElement {
  const listItem = documentRef.createElement('li');
  const link = documentRef.createElement('a');
  link.id = id;
  link.href = href;
  link.textContent = text;
  listItem.appendChild(link);
  return listItem;
}

function createSeparator(documentRef: Document) {
  const listItem = documentRef.createElement('li');
  listItem.className = 'separator';
  listItem.role = 'separator';
  return listItem;
}

export function injectEventSidebarLinks(
  addSubEventUrl: string,
  duplicateEventUrl: string,
  documentRef: Document = document
): boolean {
  if (documentRef.getElementById(ADD_SUB_EVENT_LINK_ID)) {
    return true;
  }

  const sidebarLinks = documentRef.querySelector<HTMLAnchorElement>('div#sidebar ul.links');
  if (!sidebarLinks) {
    return false;
  }
  const firstListItem = sidebarLinks.querySelector<HTMLLIElement>('li');
  if (!firstListItem) {
    return false;
  }

  // Insert order: [add-sub-event] [duplicate-event] [separator] ... existing items
  sidebarLinks.insertBefore(
    createListItem(documentRef, ADD_SUB_EVENT_LINK_ID, addSubEventUrl, 'Add sub-event'),
    firstListItem
  );
  sidebarLinks.insertBefore(
    createListItem(documentRef, DUPLICATE_EVENT_LINK_ID, duplicateEventUrl, 'Duplicate event'),
    firstListItem
  );
  sidebarLinks.insertBefore(createSeparator(documentRef), firstListItem);

  return true;
}
