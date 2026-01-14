// Entry point for Single Language Tracklist userscript
// Add your implementation here. For example:

import {createUI} from '#ui.tsx';

async function main() {
  await createUI();
}

// Auto-run when injected
main().catch(console.error);
