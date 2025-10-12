import {warning} from '@repo/common-ui/toolbox';
import {createContext, createSignal, FlowProps, For, useContext} from 'solid-js';

const makeWarningContext = () => {
  const [state, setState] = createSignal(new Set<string>());
  return {
    state,
    addWarning: (message: string) => setState(new Set<string>([...state(), message])),
    clearWarnings: (pattern: RegExp = /.*/) => {
      setState(new Set<string>([...state()].filter(warning => !warning.match(pattern))));
    },
  };
};

const WarningsContext = createContext<ReturnType<typeof makeWarningContext>>();

export function WarningsProvider(props: FlowProps) {
  const {state, addWarning, clearWarnings} = makeWarningContext();
  return (
    <WarningsContext.Provider value={{state, addWarning, clearWarnings}}>
      {props.children}
      <Warnings />
    </WarningsContext.Provider>
  );
}

export function useWarnings() {
  const context = useContext(WarningsContext);
  if (!context) {
    throw new Error('useWarnings should be called inside WarningsProvider');
  }
  return context;
}

export type AddWarning = ReturnType<typeof useWarnings>['addWarning'];

function Warnings() {
  const {state} = useWarnings();
  return <For each={[...state()]}>{warning}</For>;
}
