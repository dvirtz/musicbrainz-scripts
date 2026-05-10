import {createAcumUI} from '#ui/acum-ui.ts';
import {createReleaseEditorUI} from '#ui/release-editor-ui.tsx';
import {registerSettingsDialog} from '#ui/settings.tsx';
import {createWorkEditorUI} from '#ui/work-editor-ui.tsx';
import {waitForEditorState} from '@repo/musicbrainz-ext/wait-for';

main().catch(console.error);

async function main() {
  if (location.hostname === 'nocs.acum.org.il') {
    await createAcumUI();
    return;
  }

  if (!location.hostname.endsWith('musicbrainz.org')) {
    return;
  }

  await registerSettingsDialog();
  await waitForEditorState();
  if (location.pathname.startsWith('/release/')) {
    await createReleaseEditorUI();
  } else {
    await createWorkEditorUI();
  }
}
