export type SidebarLink =
  | {id: string; text: string; url: string}
  | {id: string; text: string; disabled: true; title: string};

function createListItem(documentRef: Document, link: SidebarLink): HTMLLIElement {
  const listItem = documentRef.createElement('li');
  const anchor = documentRef.createElement('a');
  anchor.id = link.id;
  anchor.textContent = link.text;
  if ('disabled' in link) {
    anchor.role = 'link';
    anchor.setAttribute('aria-disabled', 'true');
    anchor.tabIndex = 0;
    anchor.title = link.title;
  } else {
    anchor.href = link.url;
  }
  listItem.appendChild(anchor);
  return listItem;
}

function createSeparator(documentRef: Document) {
  const listItem = documentRef.createElement('li');
  listItem.className = 'separator';
  listItem.role = 'separator';
  return listItem;
}

export function injectSidebarLinks(links: Array<SidebarLink>) {
  const sidebarLinks = document.querySelector<HTMLUListElement>('div#sidebar h2.editing + ul.links');
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
