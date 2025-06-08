import {Page} from '@playwright/test';
import {UserscriptPage} from '@repo/test-support/userscript-page';
import {fileURLToPath} from 'node:url';

export class SetlistFmPage extends UserscriptPage {
  public constructor(page: Page) {
    super(page);
  }

  async goto(url: string) {
    await this.page.goto(url);
    await this.injectUserScript();
    await this.acceptConsent();
  }

  private async acceptConsent() {
    // https://stackoverflow.com/a/71882496/621176
    try {
      const agreeButton = this.page.locator('.qc-cmp2-summary-buttons button[mode="primary"]');
      await agreeButton.click({timeout: 5000});
    } catch {
      // No consent required
    }
  }

  private async injectUserScript() {
    await this.page.addScriptTag({
      path: fileURLToPath(import.meta.resolve('@dvirtz/setlistfm-musicbrainz-import')),
    });
  }
}
