import {Page} from '@playwright/test';
import * as path from 'path';

export class SetlistFmPage {
  constructor(public readonly page: Page) {}

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
      path: path.resolve(import.meta.dirname, '..', '..', 'dist', 'setlistfm-musicbrainz-import.user.js'),
    });
  }
}
