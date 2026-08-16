import {createUI} from '#ui.tsx';

async function main() {
  await createUI();
}

main().catch(console.error);
