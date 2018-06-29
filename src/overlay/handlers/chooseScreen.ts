import { create } from "@most/create";
import produce from "immer";
import { empty, Stream } from "most";
import * as Video from "../../domain/recorders/video";
import { completed, failed, inProgress } from "../../domain/RemoteData";
import { State, StateUpdate, Transition, TransitionHandler } from "../state";

export const chooseScreenHandler: TransitionHandler = t =>
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
