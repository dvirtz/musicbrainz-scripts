import {observeCreditBubble} from '#credit-bubble.ts';
import {createUI} from '#ui.tsx';

async function main() {
  await createUI();

  await observeCreditBubble();
}

main().catch(console.error);
