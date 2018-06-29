import produce from "immer";
import { Stream, empty, of } from "most";
import { Transition, StateUpdate, TransitionHandler } from "../state";
import { some } from "fp-ts/lib/Option";
import { start } from "../../domain/recordingState";
import { CommandStreams } from "../../domain/commands";
import { logWith } from "../../utils/log";

const commitConfigHandler = (
    cmds: CommandStreams,
    dispatch: (t: Transition) => void
): TransitionHandler => t => {
    if (t.type !== "COMMIT_CONFIG") return empty();

    return of(
        produce(d => {
            const event$ = start(cmds, t.payload);
            const sub = some(
                event$.subscribe({
                    next: ev => dispatch({ type: "RECORDING_EVENT", payload: ev }),
                    complete: logWith("$$complete"),
                    error: logWith("$$error")
                })
            );

            d.config = some(t.payload);
            d.view = "RecorderStatus";
            d.recordingSubscription = d.recordingSubscription.fold(sub, existingSub => {
                existingSub.unsubscribe();
                return sub;
            });
        })
    );
};

export const createCommitConfigHandler = (
    cmds: CommandStreams,
    dispatch: (t: Transition) => void,
    t$: Stream<Transition>
): Stream<StateUpdate> => t$.chain(commitConfigHandler(cmds, dispatch));
