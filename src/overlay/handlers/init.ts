import { create } from "@most/create";
import produce from "immer";
import { empty, Stream } from "most";
import * as Video from "../..//domain/recorders/video";
import * as Audio from "../../domain/recorders/audio";
import { completed, failed, inProgress } from "../../domain/RemoteData";
import { State, StateUpdate, Transition, TransitionHandler } from "../state";

const initHandler: TransitionHandler = t =>
    t.type !== "INIT"
        ? empty()
        : create<StateUpdate>(add => {
              add(
                  produce<State>(d => {
                      d.configBuilder.audioDevices = inProgress();
                      d.configBuilder.videoScreens = inProgress();
                  })
              );

              Audio.getAllAudioInfoSafe
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              d.configBuilder.audioDevices = failed(err);
                          }),
                      dcs =>
                          produce(d => {
                              d.configBuilder.audioDevices = completed(dcs);
                          })
                  )
                  .fold(add, add)
                  .run();

              Video.getSourcesSafe
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              d.configBuilder.videoScreens = failed(err);
                          }),
                      dcs =>
                          produce(d => {
                              d.configBuilder.videoScreens = completed(dcs);
                          })
                  )
                  .fold(add, add)
                  .run();
          });

export const createInitHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(initHandler);
