import '@violentmonkey/types';
import * as dom from '@violentmonkey/dom';

declare global {
  const VM: typeof dom;
}
