import {ParentProps} from 'solid-js';
import classes from './tool-line.module.css';
import style from './tool-line.module.css?inline';

await GM.addStyle(style);

export function ToolLine(props: ParentProps<{title: string}>) {
  return (
    <div class={classes['tool__line']}>
      <h4>{props.title}</h4>
      {props.children}
    </div>
  );
}
