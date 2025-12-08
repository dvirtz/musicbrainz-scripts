import {Progress} from '@kobalte/core/progress';
import {ComponentProps, Show, splitProps} from 'solid-js';
import classes from './progressbar.module.css';

export function ProgressBar(props: ComponentProps<typeof Progress> & {label: string}) {
  const [local, root] = splitProps(props, ['label']);
  return (
    <Progress class={`progressbar ${classes['progressbar']}`} {...root}>
      <Progress.Track class={`ui-progressbar ui-widget ui-widget-content ui-corner-all ${classes['ui-progressbar']}`}>
        <Progress.Fill class={`ui-progressbar-value ui-corner-left ${classes['ui-progressbar-value']}`}>
          &nbsp;
        </Progress.Fill>
        <div class={classes['values']}>
          <Progress.Label>{local.label}</Progress.Label>
          <Show when={local.label != ''} fallback={<>&nbsp;</>}>
            <Progress.ValueLabel />
          </Show>
        </div>
      </Progress.Track>
    </Progress>
  );
}
