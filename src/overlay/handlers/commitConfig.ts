import produce from "immer";
import { Stream, empty, of } from "most";
import { Transition, StateUpdate, TransitionHandler } from "../state";
import { some } from "fp-ts/lib/Option";

const commitConfigHandler: TransitionHandler = t => {
    if (t.type !== "COMMIT_CONFIG") return empty();

    return of(
        produce(d => {
            d.config = some(t.payload);
            d.view = "RecorderStatus";
        })
    );
};

export const createCommitConfigHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(commitConfigHandler);
