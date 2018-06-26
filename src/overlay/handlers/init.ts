import { create } from "@most/create";
import produce from "immer";
import { Stream } from "most";
import { tryCatch } from "fp-ts/lib/Task";
import * as Audio from "../../recorders/audio";
import * as Video from "../../recorders/video2";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { OverlayState, Transition, isTransition, StateUpdate } from "../overlayState";

const initHandler = (t: Transition) =>
    create<StateUpdate>(add => {
        add(
            produce<OverlayState>(d => {
                d.config.audio.devices = inProgress();
                d.config.video.screens = inProgress();
            })
        );

        Audio.getAllAudioInfoSafe
            .bimap<StateUpdate, StateUpdate>(
                err =>
                    produce(d => {
                        d.config.audio.devices = failed(err);
                    }),
                dcs =>
                    produce(d => {
                        d.config.audio.devices = completed(dcs);
                    })
            )
            .fold(add, add)
            .run();

        Video.getSourcesSafe
            .bimap<StateUpdate, StateUpdate>(
                err =>
                    produce(d => {
                        d.config.video.screens = failed(err);
                    }),
                dcs =>
                    produce(d => {
                        d.config.video.screens = completed(dcs);
                    })
            )
            .fold(add, add)
            .run();
    });

export const createInitHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.filter(isTransition("INIT")).chain(initHandler);
