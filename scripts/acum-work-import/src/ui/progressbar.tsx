import {Progress} from '@kobalte/core/progress';
import {styleInject} from 'common-ui';
import {ComponentProps, Show, splitProps} from 'solid-js';
import progressBarStyle from './progressbar.css';

styleInject(progressBarStyle);

export function ProgressBar(props: ComponentProps<typeof Progress> & {label: string}) {
  const [local, root] = splitProps(props, ['label']);
  return (
    <Progress class="progressbar" {...root}>
      <Progress.Track class="ui-progressbar ui-widget ui-widget-content ui-corner-all">
        <Progress.Fill class="ui-progressbar-value ui-corner-left">&nbsp;</Progress.Fill>
        <div class="values">
          <Progress.Label>{local.label}</Progress.Label>
          <Show when={local.label != ''} fallback={<>&nbsp;</>}>
            <Progress.ValueLabel />
          </Show>
        </div>
      </Progress.Track>
    </Progress>
  );
}
