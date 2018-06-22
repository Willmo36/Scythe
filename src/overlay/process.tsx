import { h, render } from "preact";
import { Task, fromIO } from "fp-ts/lib/Task";
import { spy } from "fp-ts/lib/Trace";
import * as most from "most";
import { commands } from "../commands";
import * as Video from "../recorders/video";
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
                    const cmd = buildFFMPEGMergeAudioVideoCommand(paths.video, paths.audio);
                    console.log("Running something, ", cmd);
                    return execCommandIgnoreError(cmd);
                })
                .map(spy)
        )
    );

    merged.chain(runAll).run();

    //Maybe our state should be the latest event in the system, rather than the current
    const state$: most.Stream<RS.RecordState> = most
        .of<RS.RecordState>(RS.video())
        .merge(commands.captureStart$.map<RS.RecordState>(() => RS.videoAudio()))
        .merge(commands.captureStop$.map<RS.RecordState>(() => RS.video()));

    state$.forEach(updateUI);
}

const zipAudioVideoStreams = (a$: most.Stream<Task<string>>) => (b$: most.Stream<Task<string>>) =>
    most.zip((a, b) => b.ap(a.map(mergeAudioVideoResult)), a$, b$);

let mergeAudioVideoResult = (video: string) => (audio: string) => ({ audio, video });

start();
