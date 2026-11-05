import classes from '#ui/warning-list.module.css';
import type {Warning} from '#warning.ts';
import {For} from 'solid-js';

export function WarningList(props: {warnings: readonly Warning[]}) {
  return <For each={props.warnings}>{warning => <p class={'error ' + classes.warning}>{warning.render()}</p>}</For>;
}
