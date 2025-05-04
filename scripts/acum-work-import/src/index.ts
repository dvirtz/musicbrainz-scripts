import {createReleaseEditorUI} from './ui/release-editor-ui';
import {registerSettingsDialog} from './ui/settings';
import {createWorkEditorUI} from './ui/work-editor-ui';

main().catch(console.error);

function waitForEditorState() {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (MB.relationshipEditor.state) {
        console.debug('Editor state is ready');
        clearInterval(interval);
        resolve(MB.relationshipEditor.state);
      }
    }, 50); // Check every 50ms
  });
}

async function main() {
  console.debug('start');
  await registerSettingsDialog();
  await waitForEditorState();
  if (location.pathname.startsWith('/release/')) {
    await createReleaseEditorUI();
  } else {
    await createWorkEditorUI();
  }
}
