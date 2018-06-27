import { create } from "@most/create";
import produce from "immer";
import { Stream, empty } from "most";
import * as Video from "../../recorders/video2";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { OverlayState, Transition, StateUpdate, TransitionHandler } from "../overlayState";

const chooseScreenHandler: TransitionHandler = t =>
    t.type !== "CHOOSE_SCREEN"
        ? empty()
        : create<StateUpdate>(add => {
              add(
                  produce<OverlayState>(d => {
                      d.configBuilder.videoMediaStream = inProgress();
                  })
              );

              Video.getVideoMediaSafe(t.payload)
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              d.configBuilder.videoMediaStream = failed(err);
                          }),
                      ms =>
                          produce(d => {
                              d.configBuilder.videoMediaStream = completed(ms);
                          })
                  )
                  .fold(add, add)
                  .run();
          });

export const createChooseScreenHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(chooseScreenHandler);
