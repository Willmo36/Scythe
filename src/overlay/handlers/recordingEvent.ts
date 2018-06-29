import produce from "immer";
import { Stream, empty, of } from "most";
import { Transition, StateUpdate, TransitionHandler } from "../state";
import { CommandStreams } from "../../domain/commands";
import { some } from "fp-ts/lib/Option";

const recordingEventHandler: TransitionHandler = t => {
    if (t.type !== "RECORDING_EVENT") return empty();

    return of(
        produce(d => {
            d.recordingEvent = some(t.payload);
        })
    );
};

export const createRecordingEventHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(recordingEventHandler);
