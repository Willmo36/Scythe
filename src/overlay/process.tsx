import { spy } from "fp-ts/lib/Trace";
import { ConfigEditor } from "../overlay/components/ConfigEditor";
import { createDispatcher, State, Transition, createStateStream } from "./state";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { RecorderStatus } from "./components/RecorderStatus";
import { none, some } from "fp-ts/lib/Option";

const appDiv = document.querySelector("#app")!;
const updateUI = (dispatch: (t: Transition) => void) => (state: State) => {
    const comp = state.config
        .chain(
            () =>
                state.view === "RecorderStatus"
                    ? some(<RecorderStatus recordingEvent={state.recordingEvent} />)
                    : none
        )
        .getOrElseL(() => <ConfigEditor state={state} dispatch={dispatch} />);

    ReactDOM.render(comp, appDiv);
};

function start() {
    const { dispatch, transition$ } = createDispatcher();

    const state$ = createStateStream(dispatch, transition$);
    state$.tap(spy).forEach(updateUI(dispatch));

    process.nextTick(() => dispatch({ type: "INIT" }));
}

start();
