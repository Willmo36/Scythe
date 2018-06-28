import { spy } from "fp-ts/lib/Trace";
import { ConfigEditor } from "../overlay/components/ConfigEditor";
import { createDispatcher, State, Transition, createStateStream } from "./state";
import * as React from "react";
import * as ReactDOM from "react-dom";

const updateUI = (dispatch: (t: Transition) => void) => (state: State) => {
    const appDiv = document.querySelector("#app")!;
    ReactDOM.render(<ConfigEditor state={state} dispatch={dispatch} />, appDiv);
};

function start() {
    const { dispatch, transition$ } = createDispatcher();

    const state$ = createStateStream(transition$);
    state$.tap(spy).forEach(updateUI(dispatch));

    process.nextTick(() => dispatch({ type: "INIT" }));
}

start();
