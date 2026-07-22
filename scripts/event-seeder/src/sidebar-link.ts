export type SidebarLink = {
  id: string;
  url: string;
  text: string;
};

function createListItem(documentRef: Document, link: SidebarLink): HTMLLIElement {
  const listItem = documentRef.createElement('li');
  const anchor = documentRef.createElement('a');
  anchor.id = link.id;
  anchor.href = link.url;
  anchor.textContent = link.text;
  listItem.appendChild(anchor);
  return listItem;
}

function createSeparator(documentRef: Document) {
  const listItem = documentRef.createElement('li');
  listItem.className = 'separator';
  listItem.role = 'separator';
  return listItem;
}

export function injectEventSidebarLinks(links: Array<SidebarLink>) {
  const sidebarLinks = document.querySelector<HTMLAnchorElement>('div#sidebar ul.links');
  if (!sidebarLinks) {
    console.debug('no sidebar links');
    return;
  }
  const firstListItem = sidebarLinks.querySelector<HTMLLIElement>('li');
  if (!firstListItem) {
    console.debug('sidebar links empty');
    return;
  }

  const missing = links.filter(link => !document.getElementById(link.id));
  if (missing.length > 0) {
    for (const link of missing) {
      sidebarLinks.insertBefore(createListItem(document, link), firstListItem);
    }
    sidebarLinks.insertBefore(createSeparator(document), firstListItem);
  }
}
