import { create } from "@most/create";
import produce from "immer";
import { Stream, empty } from "most";
import * as Audio from "../../recorders/audio";
import * as Video from "../../recorders/video";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { State, Transition, StateUpdate, TransitionHandler } from "../state";

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
