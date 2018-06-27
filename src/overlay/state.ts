import { EventEmitter } from "events";
import { none, Option } from "fp-ts/lib/Option";
import { fromEvent, merge, Stream } from "most";
import { Config, ConfigBuilder, initializeConfigBuilder } from "../domain/config";
import { createChooseAudioHandler } from "./handlers/chooseAudio";
import { createChooseScreenHandler } from "./handlers/chooseScreen";
import { createCommitConfigHandler } from "./handlers/commitConfig";
import { createInitHandler } from "./handlers/init";

export type State = {
    configBuilder: ConfigBuilder;
    config: Option<Config>;
    view: View;
};

export type View = "RecorderStatus" | "ConfigEditor";
export type StateUpdate = (o: State) => State;
export type TransitionHandler = (t: Transition) => Stream<StateUpdate>;

export const initializeState = (): State => ({
    configBuilder: initializeConfigBuilder(),
    config: none,
    view: "ConfigEditor"
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

export const createStateStream = (t$: Stream<Transition>): Stream<State> =>
    merge(
        createInitHandler(t$),
        createCommitConfigHandler(t$),
        createChooseScreenHandler(t$),
        createChooseAudioHandler(t$)
    )
        .scan<State>((s, update) => update(s), initializeState())
        .startWith(initializeState())
        .skip(1)
        .multicast();
