const ADD_SUB_EVENT_LINK_ID = 'add-sub-event-link';

function createAddSubEventListItem(documentRef: Document, url: string): HTMLLIElement {
  const listItem = documentRef.createElement('li');
  const link = documentRef.createElement('a');
  link.id = ADD_SUB_EVENT_LINK_ID;
  link.href = url;
  link.textContent = 'Add sub-event';
  listItem.appendChild(link);
  return listItem;
}

function createSeparator(documentRef: Document) {
  const listItem = documentRef.createElement('li');
  listItem.className = 'separator';
  listItem.role = 'separator';
  return listItem;
}

export function injectAddSubEventLink(url: string, documentRef: Document = document): boolean {
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

  sidebarLinks.insertBefore(createAddSubEventListItem(documentRef, url), firstListItem);
  sidebarLinks.insertBefore(createSeparator(documentRef), firstListItem);

  return true;
}
