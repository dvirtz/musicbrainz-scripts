import {initializeExpandEvents} from '#ui.ts';

function main() {
  void initializeExpandEvents().catch(error => {
    console.error('[expand-events] Error:', error);
  });
}

main();
