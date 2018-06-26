import { h, render } from "preact";
import { Task, fromIO } from "fp-ts/lib/Task";
import { spy } from "fp-ts/lib/Trace";
import * as most from "most";
import { commands } from "../commands";
import * as Video from "../recorders/video2";
import * as Audio from "../recorders/audio";
import { buildFFMPEGMergeAudioVideoCommand, execCommandIgnoreError } from "../recorders/merger";
import { Overlay } from "../overlay/Overlay";
import * as RS from "../domain/RecordState";

//this is defo wrong
function runAll<T>(task$: most.Stream<Task<T>>) {
    return new Task(() => task$.forEach(t => t.run()));
}

function updateUI(state: RS.RecordState) {
    const appDiv = document.querySelector("#app")!;
    render(<Overlay state={state} />, appDiv, appDiv.lastChild as Element);
}

function start() {
    const audio = Audio.setup(commands);
    const video = Video.setup(commands);
    const audioVideo = audio.ap(video.map(zipAudioVideoStreams));

    const merged = audioVideo.map(captured$ =>
        captured$.map(captureT =>
            captureT
                .chain(paths => {
                    //TODO - CONVERT THE AUDIO TO OPUS FIRST

                    console.log(paths);
                    const cmd = buildFFMPEGMergeAudioVideoCommand(paths.video, paths.audio);
                    console.log("Running something, ", cmd);
                    return execCommandIgnoreError(cmd);
                })
                .map(spy)
        )
    );

    merged.chain(runAll).run();
}

const zipAudioVideoStreams = (a$: most.Stream<Task<string>>) => (b$: most.Stream<Task<string>>) =>
    most.zip((a, b) => b.ap(a.map(mergeAudioVideoResult)), a$, b$);

let mergeAudioVideoResult = (video: string) => (audio: string) => ({ audio, video });

start();
