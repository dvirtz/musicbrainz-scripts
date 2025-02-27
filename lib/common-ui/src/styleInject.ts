// adapted from https://github.com/egoist/style-inject/blob/d093852c60f81f4860fcea2c770b70716af5703c/src/index.js

export function styleInject(
  css: string,
  options?: {
    insertAt?: 'top' | 'bottom';
    document?: Document;
  }
) {
  options = Object.assign(
    {
      insertAt: 'bottom',
      document: window.document,
    },
    options
  );
  if (!css || typeof options.document === 'undefined') return;

  const head = options.document.head || options.document.getElementsByTagName('head')[0];
  const style = options.document.createElement('style');
  style.appendChild(options.document.createTextNode(css));

  if (options.insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }
}
