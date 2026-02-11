import {createReleaseEditorUI} from '#ui/release-editor-ui.tsx';
import {registerSettingsDialog} from '#ui/settings.tsx';
import {createWorkEditorUI} from '#ui/work-editor-ui.tsx';
import {waitForEditorState} from '@repo/musicbrainz-ext/wait-for';

main().catch(console.error);

async function main() {
  await registerSettingsDialog();
  await waitForEditorState();
  if (location.pathname.startsWith('/release/')) {
    await createReleaseEditorUI();
  } else {
    await createWorkEditorUI();
  }
}
