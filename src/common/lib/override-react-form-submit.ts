export function overrideReactFormSubmit(selector: string, eventHandler: (ev: SubmitEvent) => void) {
  const form = document.querySelector(selector) as HTMLFormElement;
  if (form) {
    const propsAttr = Object.keys(form).find(key => /^__reactProps/.test(key)) as keyof HTMLFormElement;
    if (propsAttr) {
      Object.defineProperty(form[propsAttr], 'onSubmit', {
        get() {
          return eventHandler;
        },
        set(newValue) {
          // eslint-disable-next-line no-debugger
          debugger; // Breakpoint when value changes
          console.log(`Value changed from ${this._value} to ${newValue}`);
          eventHandler = newValue;
        },
        configurable: false,
        enumerable: true,
      });
      form[propsAttr].onSubmit = eventHandler;
    } else {
      console.warn('Could not find __reactProps attribute on form element with selector:', selector);
    }
    return true;
  }
}
