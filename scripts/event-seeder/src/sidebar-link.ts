const ADD_SUB_EVENT_LINK_ID = 'add-sub-event-link';
const CLONE_EVENT_LINK_ID = 'clone-event-link';

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
  cloneEventUrl: string,
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

  // Insert order: [add-sub-event] [clone-event] [separator] ... existing items
  sidebarLinks.insertBefore(
    createListItem(documentRef, ADD_SUB_EVENT_LINK_ID, addSubEventUrl, 'Add sub-event'),
    firstListItem
  );
  sidebarLinks.insertBefore(
    createListItem(documentRef, CLONE_EVENT_LINK_ID, cloneEventUrl, 'Clone event'),
    firstListItem
  );
  sidebarLinks.insertBefore(createSeparator(documentRef), firstListItem);

  return true;
}
