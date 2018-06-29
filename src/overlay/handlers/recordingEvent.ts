import produce from "immer";
import { Stream, empty, of } from "most";
import { Transition, StateUpdate, TransitionHandler } from "../state";
import { some, none } from "fp-ts/lib/Option";

const RESET_TIMEOUT = 1500;

export const recordingEventHandler = (
    dispatch: (t: Transition) => void
): TransitionHandler => t => {
    if (t.type !== "RECORDING_EVENT") return empty();

    //Probs should put this timeout on the state
    if (t.payload.type === "CAPTURE_COMPLETE") {
        setTimeout(() => dispatch({ type: "RESET_RECORDING_EVENT" }), RESET_TIMEOUT);
    }

    return of(
        produce(d => {
            d.recordingEvent = some(t.payload);
        })
    );
};

export const recordingResetHandler: TransitionHandler = t => {
    if (t.type !== "RESET_RECORDING_EVENT") return empty();

    return of(
        produce(d => {
            d.recordingEvent = none;
        })
    );
};
