import { create } from "@most/create";
import produce from "immer";
import { OverlayState, Transition, isTransition, StateUpdate } from "../overlayState";
import { getAllAudioInfo } from "../../recorders/audio";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { Stream } from "most";

const initHandler = (t: Transition) =>
    create<StateUpdate>(add => {
        add(
            produce<OverlayState>(draft => {
                draft.config.audio.devices = inProgress();
            })
        );

        getAllAudioInfo
            .map(ds =>
                produce<OverlayState>(draft => {
                    draft.config.audio.devices = completed(ds);
                })
            )
            .run()
            .then(add)
            .catch(err =>
                produce<OverlayState>(d => {
                    d.config.audio.devices = failed(err);
                })
            );
    });

export const createInitHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.filter(isTransition("INIT")).chain(initHandler);
