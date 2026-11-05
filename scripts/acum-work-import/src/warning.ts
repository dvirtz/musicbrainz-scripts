import type {JSX} from 'solid-js';
export abstract class Warning {
  abstract render(): JSX.Element;
}
export class MessageWarning extends Warning {
  constructor(public readonly message: string) {
    super();
  }
  render() {
    return this.message;
  }
}
