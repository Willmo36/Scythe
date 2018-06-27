import { create } from "@most/create";
import produce from "immer";
import { Stream, empty } from "most";
import * as Audio from "../../recorders/audio";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { OverlayState, Transition, StateUpdate, TransitionHandler } from "../overlayState";

const chooseAudioHandler: TransitionHandler = t =>
    t.type !== "CHOOSE_AUDIO"
        ? empty()
        : create<StateUpdate>(add => {
              add(
                  produce<OverlayState>(d => {
                      d.configBuilder.audioMediaStream = inProgress();
                  })
              );

              Audio.getAudioMediaSafe(t.payload)
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              d.configBuilder.audioMediaStream = failed(err);
                          }),
                      ms =>
                          produce(d => {
                              d.configBuilder.audioMediaStream = completed(ms);
                          })
                  )
                  .fold(add, add)
                  .run();
          });

export const createChooseAudioHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(chooseAudioHandler);
