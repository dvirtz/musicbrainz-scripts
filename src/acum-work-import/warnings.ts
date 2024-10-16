export function addWarning(className: string, message: string) {
  const container = document.querySelector('#acum-work-import-container')!;
  for (const element of container.querySelectorAll(`p.warning.${className}`).values()) {
    if (element.textContent === message) {
      return;
    }
  }
  const warning = document.createElement('p');
  warning.classList.add('warning', className);
  warning.textContent = message;
  container.appendChild(warning);
}

export function clearWarnings(className: string) {
  const container = document.querySelector('#acum-work-import-container')!;
  container.querySelectorAll(`p.warning.${className}`).forEach(element => element.remove());
}
