import produce from "immer";
import { Stream, empty, of } from "most";
import { Transition, isTransition, StateUpdate, TransitionHandler } from "../overlayState";

const updateConfigHandler: TransitionHandler = t => {
    if (t.type !== "UPDATE_CONFIG") return empty();

    return of(
        produce(d => {
            d.config = t.payload(d.config);
        })
    );
};

export const createUpdateConfigHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(updateConfigHandler);
