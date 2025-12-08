import classes from './toolbox.module.css';

export function toolbox(
  doc: Document,
  className: 'full-page' | 'half-page' | 'iframe',
  inserter: (toolbox: HTMLDivElement) => void
) {
  const ID = classes['dvirtz-toolbox'];
  const existing = doc.getElementById(ID!);
  if (existing) {
    return existing as HTMLDivElement;
  }

  const res = (
    <fieldset
      id={ID}
      classList={{
        [classes['half-page']!]: className === 'half-page',
        [classes['iframe']!]: className === 'iframe',
      }}
    >
      <legend>dvirtz MusicBrainz scripts</legend>
    </fieldset>
  ) as HTMLDivElement;
  inserter(res);
  return res;
}

export function warning(message: string) {
  return (<p class={'error'}>{message}</p>) as HTMLParagraphElement;
}
