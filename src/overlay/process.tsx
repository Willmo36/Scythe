import { h, render } from "preact";
import { Task } from "fp-ts/lib/Task";
import * as most from "most";
import { commands } from "../commands";
import * as Video from "../recorders/video";
import * as Audio from "../recorders/audio";
import { Overlay } from "../overlay/Overlay";
import * as RS from "../domain/RecordState";
import { merge } from "../recorders/merger";

//this is defo wrong
function runAll<T>(task$: most.Stream<Task<T>>) {
    return new Task(() => task$.forEach(t => t.run()));
}

function updateUI(state: RS.RecordState) {
    const appDiv = document.querySelector("#app")!;
    render(<Overlay state={state} />, appDiv, appDiv.lastChild as Element);
}

function start() {
    //turn Video & Audio into "recorder" semigroups
    const audio = Audio.setup(commands).chain(runAll);
    const video = Video.setup(commands).chain(runAll);
    const recorders = [video, audio];

    Promise.all(recorders.map(r => r.run())).catch(e => console.error("Recorder error", e));

    //Maybe our state should be the latest event in the system, rather than the current
    const state$: most.Stream<RS.RecordState> = most
        .of<RS.RecordState>(RS.video())
        .merge(commands.captureStart$.map<RS.RecordState>(() => RS.videoAudio()))
        .merge(commands.captureStop$.map<RS.RecordState>(() => RS.video()));

    state$.forEach(updateUI);

    setTimeout(merge, 1500);
}

start();
