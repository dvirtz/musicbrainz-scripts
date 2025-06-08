import {handleSetlistPage} from '#event.ts';
import {handleVenuePage} from '#place.ts';

main().catch(console.error);

async function main() {
  if (location.href.includes('/venue/')) {
    await handleVenuePage();
  } else {
    await handleSetlistPage();
  }
}
