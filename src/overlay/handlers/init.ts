import { create } from "@most/create";
import produce from "immer";
import { Stream, empty } from "most";
import * as Audio from "../../recorders/audio";
import * as Video from "../../recorders/video2";
import { inProgress, completed, failed } from "../../domain/RemoteData";
import { OverlayState, Transition, StateUpdate, TransitionHandler } from "../overlayState";

const initHandler: TransitionHandler = t =>
    t.type !== "INIT"
        ? empty()
        : create<StateUpdate>(add => {
              add(
                  produce<OverlayState>(d => {
                      d.config.audioDevices = inProgress();
                      d.config.videoScreens = inProgress();
                  })
              );

              Audio.getAllAudioInfoSafe
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              d.config.audioDevices = failed(err);
                          }),
                      dcs =>
                          produce(d => {
                              d.config.audioDevices = completed(dcs);
                          })
                  )
                  .fold(add, add)
                  .run();

              Video.getSourcesSafe
                  .bimap<StateUpdate, StateUpdate>(
                      err =>
                          produce(d => {
                              d.config.videoScreens = failed(err);
                          }),
                      dcs =>
                          produce(d => {
                              d.config.videoScreens = completed(dcs);
                          })
                  )
                  .fold(add, add)
                  .run();
          });

export const createInitHandler = (t$: Stream<Transition>): Stream<StateUpdate> =>
    t$.chain(initHandler);
