import { EventEmitter } from "events";
import { none, Option } from "fp-ts/lib/Option";
import { fromEvent, merge, Stream, Subscription } from "most";
import { commands } from "../domain/commands";
import { Config, ConfigBuilder, initializeConfigBuilder } from "../domain/config";
import { RecordingEvent } from "../domain/recordingState";
import { chooseAudioHandler } from "./handlers/chooseAudio";
import { chooseScreenHandler } from "./handlers/chooseScreen";
import { commitConfigHandler } from "./handlers/commitConfig";
import { initHandler } from "./handlers/init";
import { recordingEventHandler, recordingResetHandler } from "./handlers/recordingEvent";

export type State = {
    configBuilder: ConfigBuilder;
    config: Option<Config>;
    view: View;
    recordingSubscription: Option<Subscription<RecordingEvent>>;
    recordingEvent: Option<RecordingEvent>;
};

export type View = "RecorderStatus" | "ConfigEditor";
export type StateUpdate = (o: State) => State;
export type TransitionHandler = (t: Transition) => Stream<StateUpdate>;

export const initializeState = (): State => ({
    configBuilder: initializeConfigBuilder(),
    config: none,
    view: "ConfigEditor",
    recordingSubscription: none,
    recordingEvent: none
});

export type Transition =
    | { type: "INIT" }
    | { type: "CHOOSE_SCREEN"; payload: string }
    | { type: "CHOOSE_AUDIO"; payload: string }
    | { type: "COMMIT_CONFIG"; payload: Config }
    | { type: "RECORDING_EVENT"; payload: RecordingEvent }
    | { type: "RESET_RECORDING_EVENT" };

//this isn't great but I don't understand most-subject yet
export function createDispatcher() {
    const ee = new EventEmitter();
    const dispatch = (t: Transition) => ee.emit("transition", t);
    const transition$ = fromEvent<Transition>("transition", ee)
        .tap(t => console.info("transition", t))
        .multicast();
    return { dispatch, transition$ };
}

export const createStateStream = (
    dispatch: (t: Transition) => void,
    t$: Stream<Transition>
): Stream<State> =>
    merge(
        t$.chain(initHandler),
        t$.chain(commitConfigHandler(commands, dispatch)),
        t$.chain(chooseScreenHandler),
        t$.chain(chooseAudioHandler),
        t$.chain(recordingEventHandler(dispatch)),
        t$.chain(recordingResetHandler)
    )
        .scan<State>((s, update) => update(s), initializeState())
        .startWith(initializeState())
        .skip(1)
        .multicast();
