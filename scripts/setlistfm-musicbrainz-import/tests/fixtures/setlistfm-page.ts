import {UserscriptPage} from '@repo/test-support/userscript-page';

export class SetlistFmPage {
  public constructor(
    private userscriptPage: UserscriptPage,
    public page = userscriptPage.page
  ) {}

  async goto(url: string) {
    await this.userscriptPage.goto(url);
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
}
