import { Task, fromIO } from "fp-ts/lib/Task";
import { spy } from "fp-ts/lib/Trace";
import * as most from "most";
import { commands } from "../commands";
import * as Video from "../recorders/video2";
import * as Audio from "../recorders/audio";
import { buildFFMPEGMergeAudioVideoCommand, execCommandIgnoreError } from "../recorders/merger";
import { ConfigEditor } from "../overlay/components/ConfigEditor";
import * as RS from "../domain/RecordState";
import { create } from "@most/create";
import { createDispatcher, isTransition, State, Transition, createStateStream } from "./state";
import { equal } from "assert";
import { equals } from "ramda";
import produce from "immer";
import { inProgress, completed } from "../domain/RemoteData";
import { fromPromise } from "most";
import * as React from "react";
import * as ReactDOM from "react-dom";

//this is defo wrong
function runAll<T>(task$: most.Stream<Task<T>>) {
    return new Task(() => task$.forEach(t => t.run()));
}

const updateUI = (dispatch: (t: Transition) => void) => (state: State) => {
    const appDiv = document.querySelector("#app")!;
    ReactDOM.render(<ConfigEditor state={state} dispatch={dispatch} />, appDiv);
};

function start() {
    // const audio = Audio.setup(commands);
    // const video = Video.setup(commands);
    // const audioVideo = audio.ap(video.map(zipAudioVideoStreams));
    // const merged = audioVideo.map(captured$ =>
    //     captured$.map(captureT =>
    //         captureT
    //             .chain(paths => {
    //                 //TODO - CONVERT THE AUDIO TO OPUS FIRST
    //                 console.log(paths);
    //                 const cmd = buildFFMPEGMergeAudioVideoCommand(paths.video, paths.audio);
    //                 console.log("Running something, ", cmd);
    //                 return execCommandIgnoreError(cmd);
    //             })
    //             .map(spy)
    //     )
    // );
    // merged.chain(runAll).run();

    const { dispatch, transition$ } = createDispatcher();

    const state$ = createStateStream(transition$);

    state$.tap(spy).forEach(updateUI(dispatch));

    process.nextTick(() => dispatch({ type: "INIT" }));
}

const zipAudioVideoStreams = (a$: most.Stream<Task<string>>) => (b$: most.Stream<Task<string>>) =>
    most.zip((a, b) => b.ap(a.map(mergeAudioVideoResult)), a$, b$);

let mergeAudioVideoResult = (video: string) => (audio: string) => ({ audio, video });

start();
