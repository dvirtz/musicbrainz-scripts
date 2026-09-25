export function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const view = input.ownerDocument.defaultView;
  if (!view) {
    throw new Error('Input has no owning window.');
  }

  const valueDescriptor = Object.getOwnPropertyDescriptor(
    input.tagName === 'TEXTAREA' ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype,
    'value'
  );
  if (!valueDescriptor?.set) {
    throw new Error('Input value setter is unavailable.');
  }

  input.focus();
  valueDescriptor.set.call(input, value);
  input.dispatchEvent(new view.Event('input', {bubbles: true}));
  input.dispatchEvent(new view.Event('change', {bubbles: true}));
}
