import { ConfigBuilder, initializeConfigBuilder } from "../domain/config";
import { Stream, merge, fromEvent } from "most";
import { createInitHandler } from "./handlers/init";
import { createUpdateConfigHandler } from "./handlers/updateConfig";
import { EventEmitter } from "events";
import { spy } from "fp-ts/lib/Trace";
import { createChooseScreenHandler } from "./handlers/chooseScreen";

export type OverlayState = {
    configBuilder: ConfigBuilder;
};

export type StateUpdate = (o: OverlayState) => OverlayState;
export type TransitionHandler = (t: Transition) => Stream<StateUpdate>;

export const initializeState = (): OverlayState => ({
    configBuilder: initializeConfigBuilder()
});

export type Transition =
    | { type: "INIT" }
    | { type: "UPDATE_CONFIG"; payload: (c: ConfigBuilder) => ConfigBuilder }
    | { type: "CHOOSE_SCREEN"; payload: string };

//this isn't great but I don't understand most-subject yet
export function createDispatcher() {
    const ee = new EventEmitter();
    const dispatch = (t: Transition) => ee.emit("transition", t);
    const transition$ = fromEvent<Transition>("transition", ee)
        .tap(t => console.info("transition", t))
        .multicast();
    return { dispatch, transition$ };
}

export const isTransition = (type: Transition["type"]) => (action: Transition) =>
    action.type === type;

export const createStateStream = (t$: Stream<Transition>): Stream<OverlayState> =>
    merge(createInitHandler(t$), createUpdateConfigHandler(t$), createChooseScreenHandler(t$))
        .scan<OverlayState>((s, update) => update(s), initializeState())
        .startWith(initializeState())
        .skip(1)
        .multicast();
