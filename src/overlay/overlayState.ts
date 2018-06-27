import { ConfigBuilder, initializeConfigBuilder, Config } from "../domain/config";
import { Stream, merge, fromEvent } from "most";
import { createInitHandler } from "./handlers/init";
import { createCommitConfigHandler } from "./handlers/commitConfig";
import { EventEmitter } from "events";
import { spy } from "fp-ts/lib/Trace";
import { createChooseScreenHandler } from "./handlers/chooseScreen";
import { createChooseAudioHandler } from "./handlers/chooseAudio";
import { Option, none } from "fp-ts/lib/Option";

export type OverlayState = {
    configBuilder: ConfigBuilder;
    config: Option<Config>;
};

export type StateUpdate = (o: OverlayState) => OverlayState;
export type TransitionHandler = (t: Transition) => Stream<StateUpdate>;

export const initializeState = (): OverlayState => ({
    configBuilder: initializeConfigBuilder(),
    config: none
});

export type Transition =
    | { type: "INIT" }
    | { type: "CHOOSE_SCREEN"; payload: string }
    | { type: "CHOOSE_AUDIO"; payload: string }
    | { type: "COMMIT_CONFIG"; payload: Config };

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
    merge(
        createInitHandler(t$),
        createCommitConfigHandler(t$),
        createChooseScreenHandler(t$),
        createChooseAudioHandler(t$)
    )
        .scan<OverlayState>((s, update) => update(s), initializeState())
        .startWith(initializeState())
        .skip(1)
        .multicast();
