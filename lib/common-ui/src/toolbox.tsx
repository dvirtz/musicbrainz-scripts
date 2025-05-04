import classes from './toolbox.module.css';
import style from './toolbox.module.css?inline';

export async function toolbox(doc: Document, className: 'full-page' | 'half-page' | 'iframe') {
  const ID = classes['dvirtz-toolbox'];
  const existing = doc.getElementById(ID);
  if (existing) {
    return existing as HTMLDivElement;
  }

  await GM.addStyle(style);

  return (
    <div
      id={ID}
      classList={{
        [classes['half-page']]: className === 'half-page',
        [classes['iframe']]: className === 'iframe',
      }}
    >
      <h2>dvirtz MusicBrainz scripts</h2>
      <br />
    </div>
  ) as HTMLDivElement;
}
