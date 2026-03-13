import {getEventGid} from './event.ts';
import {createUI} from './ui.tsx';

try {
  const eventGid = getEventGid();
  if (eventGid) {
    void createUI(eventGid);
  }
} catch (error) {
  console.error('[scaffold-festival-days] Error:', error);
}
