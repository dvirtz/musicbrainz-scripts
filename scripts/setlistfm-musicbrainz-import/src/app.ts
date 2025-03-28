import {handleSetlistPage} from './event';
import {handleVenuePage} from './place';

main().catch(console.error);

async function main() {
  if (location.href.includes('/venue/')) {
    await handleVenuePage();
  } else {
    await handleSetlistPage();
  }
}
