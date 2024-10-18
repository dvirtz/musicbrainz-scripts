import {handleSetlistPage} from './event';
import {handleVenuePage} from './place';

main();

//////////////////////////////////////////////////////////////////////////////

// add the button to the page
async function main() {
  if (location.href.includes('/venue/')) {
    await handleVenuePage();
  } else {
    await handleSetlistPage();
  }
}
