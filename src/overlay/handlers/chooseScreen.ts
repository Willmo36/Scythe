import { create } from "@most/create";
import produce from "immer";
import { Stream, empty } from "most";
import * as Video from "../../recorders/video";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { State, Transition, StateUpdate, TransitionHandler } from "../state";

const chooseScreenHandler: TransitionHandler = t =>
    t.type !== "CHOOSE_SCREEN"
        ? empty()
        : create<StateUpdate>(add => {
              add(
                  produce<State>(d => {
                      d.configBuilder.videoMediaStream = inProgress();
                  })
              );

              Video.getVideoMediaSafe(t.payload)
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              console.warn("THE ERRR", err);
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
