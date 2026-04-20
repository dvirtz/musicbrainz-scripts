import {createContext, FlowProps, For, JSX, useContext} from 'solid-js';
import {createStore} from 'solid-js/store';

const makeWarningContext = () => {
  const [state, setState] = createStore<JSX.Element[]>([]);
  return {
    state,
    addWarning: (warning: JSX.Element) => setState(state.length, warning),
    clearWarnings: () => setState([]),
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
  return <For each={state}>{warning => <p class={'error'}>{warning}</p>}</For>;
}
