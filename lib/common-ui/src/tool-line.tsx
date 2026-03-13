import classes from '#tool-line.module.css';
import {ParentProps} from 'solid-js';

export function ToolLine(props: ParentProps<{title: string; direction?: 'horizontal' | 'vertical'}>) {
  const className =
    props.direction === 'vertical'
      ? `${classes['tool__line']} ${classes['tool__line--vertical']}`
      : classes['tool__line'];

  return (
    <div class={className}>
      <h4>{props.title}</h4>
      {props.children}
    </div>
  );
}
