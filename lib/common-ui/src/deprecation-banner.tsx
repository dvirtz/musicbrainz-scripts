export type DeprecationBannerOptions = {
  name: string;
  replacementName: string;
  replacementUrl: string;
};

export type MountedDeprecationBanner = {
  element: HTMLDivElement | null;
  unmount: () => void;
};

async function isDismissed(name: string) {
  try {
    return await GM.getValue(name, false);
  } catch {
    return false;
  }
}

function setDismissed(name: string) {
  void GM.setValue(name, true).catch(console.error);
}

export async function mountDeprecationBanner(options: DeprecationBannerOptions): Promise<MountedDeprecationBanner> {
  if (await isDismissed(options.name)) {
    return {
      element: null,
      unmount: () => {},
    };
  }

  const banner = (
    <div class="banner server-details">
      <p>
        Userscript {options.name} is deprecated and replaced by{' '}
        <a href={options.replacementUrl}>{options.replacementName}</a>.
      </p>
      <button
        class="dismiss-banner remove-item icon"
        type="button"
        onClick={() => {
          setDismissed(options.name);
          banner.remove();
        }}
      />
    </div>
  ) as HTMLDivElement;

  document.body.prepend(banner);

  return {
    element: banner,
    unmount: () => {
      banner.remove();
    },
  };
}
